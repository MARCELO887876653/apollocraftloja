"use node";

import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import crypto from "node:crypto";
import { getSetting } from "./lib/data";

// ─────────────────────────────────────────────────────────────
// Gateway de pagamento — Mercado Pago (PIX)
// Regra de ouro: o status do pagamento NUNCA vem do navegador.
// Sempre confirmado via API oficial do gateway (webhook ou polling).
// ─────────────────────────────────────────────────────────────

const MP_API = "https://api.mercadopago.com";

interface GatewayConfig {
  accessToken?: string;
  publicKey?: string;
  webhookSecret?: string;
}

async function getGatewayConfig(ctx: any): Promise<GatewayConfig> {
  const config = (await getSetting(ctx, "gateway_mercadopago")) as GatewayConfig | null;
  return config ?? {};
}

function resolveToken(config: GatewayConfig): string | null {
  return config.accessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN || null;
}

// ─── Acesso interno a dados ───

export const internalGetOrder = internalQuery({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

export const internalGetStoreName = internalQuery({
  args: {},
  handler: async (ctx) => {
    const store = (await getSetting(ctx, "store")) as any;
    return store?.name ?? "Loja";
  },
});

// ─── Criar pagamento PIX ───

export const createPixPayment = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order: any = await ctx.runQuery(internal.payments.internalGetOrder, { orderId });
    if (!order) throw new Error("Pedido não encontrado");
    if (order.paymentStatus === "paid") {
      return { alreadyPaid: true as const };
    }

    const config = await getGatewayConfig(ctx);
    const token = resolveToken(config);
    if (!token) {
      throw new Error(
        "Gateway de pagamento não configurado. Configure o Mercado Pago no painel admin (Integrações → Mercado Pago) ou defina MERCADO_PAGO_ACCESS_TOKEN.",
      );
    }

    const storeName = await ctx.runQuery(internal.payments.internalGetStoreName, {});
    const idempotencyKey = `order-${order._id}-${order.createdAt}`;

    const res = await fetch(`${MP_API}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: order.totalCents / 100,
        description: `Pedido ${order.number} — ${storeName}`,
        payment_method_id: "pix",
        external_reference: order.number,
        payer: {
          email: order.customerEmail,
          first_name: order.customerName,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message ?? data?.error ?? `Erro do gateway (${res.status})`;
      throw new Error(`Mercado Pago: ${msg}`);
    }

    const pix = data?.point_of_interaction?.transaction_data ?? {};
    await ctx.runMutation(internal.payments.applyPaymentCreation, {
      orderId,
      gatewayPaymentId: String(data.id),
      pixQrCode: pix.qr_code ?? undefined,
      pixQrCodeBase64: pix.qr_code_base64 ?? undefined,
      pixTicketUrl: pix.ticket_url ?? undefined,
    });

    return {
      alreadyPaid: false as const,
      qrCode: pix.qr_code ?? null,
      qrCodeBase64: pix.qr_code_base64 ?? null,
      ticketUrl: pix.ticket_url ?? null,
    };
  },
});

export const applyPaymentCreation = internalMutation({
  args: {
    orderId: v.id("orders"),
    gatewayPaymentId: v.string(),
    pixQrCode: v.optional(v.string()),
    pixQrCodeBase64: v.optional(v.string()),
    pixTicketUrl: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, gatewayPaymentId, pixQrCode, pixQrCodeBase64, pixTicketUrl }) => {
    const order = await ctx.db.get(orderId);
    if (!order || order.paymentStatus !== "pending") return;
    await ctx.db.patch(orderId, {
      gateway: "mercadopago",
      gatewayPaymentId,
      pixQrCode,
      pixQrCodeBase64,
      pixTicketUrl,
      paymentMethod: "pix",
      updatedAt: Date.now(),
    });
  },
});

// ─── Consultar status no gateway (polling do cliente chama via mutation wrapper) ───

export const refreshPaymentStatus = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order: any = await ctx.runQuery(internal.payments.internalGetOrder, { orderId });
    if (!order?.gatewayPaymentId || order.paymentStatus !== "pending") {
      return { status: order?.paymentStatus ?? "unknown" };
    }
    return await syncGatewayPayment(ctx, order.gatewayPaymentId, order._id);
  },
});

async function syncGatewayPayment(ctx: any, gatewayPaymentId: string, orderId?: any) {
  const config = await getGatewayConfig(ctx);
  const token = resolveToken(config);
  if (!token) return { status: "pending" };

  const res = await fetch(`${MP_API}/v1/payments/${gatewayPaymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { status: "pending" };
  const data = await res.json();
  const mpStatus = mapMpStatus(data.status);
  if (orderId) {
    await ctx.runMutation(internal.payments.applyGatewayStatus, {
      gatewayPaymentId,
      mpStatus,
      amountApproved: typeof data.transaction_amount === "number" ? Math.round(data.transaction_amount * 100) : undefined,
    });
  }
  return { status: mpStatus };
}

function mapMpStatus(status: string | undefined): string {
  switch (status) {
    case "approved": return "paid";
    case "cancelled": return "cancelled";
    case "rejected": return "failed";
    case "refunded":
    case "charged_back": return "refunded";
    default: return "pending";
  }
}

/** Transição de estado idempotente — chamada pelo polling e pelo webhook. */
export const applyGatewayStatus = internalMutation({
  args: {
    gatewayPaymentId: v.string(),
    mpStatus: v.string(),
    amountApproved: v.optional(v.number()),
  },
  handler: async (ctx, { gatewayPaymentId, mpStatus }) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_gatewayPaymentId", (q) => q.eq("gatewayPaymentId", gatewayPaymentId))
      .first();
    if (!order) return;
    await transitionOrder(ctx, order, mpStatus);
  },
});

// ─── Webhook do Mercado Pago (via http.ts) ───

export const handleWebhook = action({
  args: {
    body: v.string(),
    signatureHeader: v.optional(v.string()),
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, { body, signatureHeader, requestId }) => {
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return { ok: false as const, code: 400 };
    }

    const dataId = payload?.data?.id ?? payload?.resource;
    const type = payload?.type ?? payload?.topic;
    if (type !== "payment" || !dataId) return { ok: true as const, code: 200 };

    // valida assinatura HMAC do MP quando o secret está configurado
    const config = await getGatewayConfig(ctx);
    if (config.webhookSecret && signatureHeader) {
      const parts = Object.fromEntries(
        signatureHeader.split(",").map((p) => p.trim().split("=")),
      );
      const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${parts.ts};`;
      const hmac = crypto
        .createHmac("sha256", config.webhookSecret)
        .update(manifest)
        .digest("hex");
      if (hmac !== parts.v1) {
        return { ok: false as const, code: 401 };
      }
    }

    // NUNCA confiamos no payload: buscamos o pagamento direto na API do MP
    const token = resolveToken(config);
    if (!token) return { ok: true as const, code: 200 };
    const res = await fetch(`${MP_API}/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { ok: true as const, code: 200 }; // 200 evita loop de retry do MP
    const data = await res.json();
    await ctx.runMutation(internal.payments.applyGatewayStatus, {
      gatewayPaymentId: String(data.id),
      mpStatus: mapMpStatus(data.status),
    });
    return { ok: true as const, code: 200 };
  },
});

// ─── Transição central de status (idempotente, nunca rebaixa "paid") ───

export const transitionOrder = async (ctx: any, order: any, mpStatus: string) => {
  const current = order.paymentStatus;
  if (current === mpStatus) return;
  const now = Date.now();

  if (mpStatus === "paid" && current === "pending") {
    await ctx.db.patch(order._id, {
      paymentStatus: "paid",
      paidAt: now,
      updatedAt: now,
      statusHistory: [...order.statusHistory, { status: "paid", at: now, note: "Pagamento confirmado pelo gateway" }],
    });
    // dispara processamento da fila de entrega
    await ctx.scheduler.runAfter(0, internal.deliveries.processOrder, { orderId: order._id });
    // dispara webhooks de saída
    await ctx.scheduler.runAfter(0, internal.webhooksOut.sendEvent, {
      event: "order.paid",
      payload: {
        orderNumber: order.number,
        total: order.totalCents / 100,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        items: order.items.map((i: any) => ({ name: i.name, variant: i.variantName, quantity: i.quantity })),
      },
    });
    return;
  }

  const allowed: Record<string, string[]> = {
    pending: ["cancelled", "expired", "failed"],
    paid: ["refunded"],
  };
  if (allowed[current]?.includes(mpStatus)) {
    await ctx.db.patch(order._id, {
      paymentStatus: mpStatus,
      updatedAt: now,
      statusHistory: [...order.statusHistory, { status: mpStatus, at: now, note: "Status atualizado pelo gateway" }],
    });
  }
};
