"use node";

import { internalMutation, internalQuery, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getSetting } from "./lib/data";
import { requireAdmin, logAudit } from "./lib/admin";

// ─────────────────────────────────────────────────────────────
// Fila de entrega automática
// pending → processing → delivered | failed (com retry)
// ─────────────────────────────────────────────────────────────

interface DeliveryConfig {
  type: string;
  commands?: string[];
  apiUrl?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: { k: string; v: string }[];
  apiBody?: string;
  message?: string;
  codes?: string[];
  showToCustomer: boolean;
}

export const internalGetDelivery = internalQuery({
  args: { id: v.id("deliveries") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

export const internalGetOrder = internalQuery({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

/** Processa todas as entregas de um pedido (agendado quando o pagamento é confirmado). */
export const processOrder = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const pending = await ctx.db
      .query("deliveries")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    for (const d of pending) {
      if (d.status === "pending" || (d.status === "failed" && d.nextRetryAt && d.nextRetryAt <= Date.now())) {
        await ctx.db.patch(d._id, { status: "processing", updatedAt: Date.now() });
        await ctx.scheduler.runAfter(0, internal.deliveries.executeOne, { deliveryId: d._id });
      }
    }
  },
});

/** Executa uma entrega individual com placeholders substituídos. */
export const executeOne = internalMutation({
  args: { deliveryId: v.id("deliveries") },
  handler: async (ctx, { deliveryId }) => {
    const d: any = await ctx.db.get(deliveryId);
    if (!d) return;
    if (d.status === "delivered") return; // nunca entrega duas vezes
    const order: any = await ctx.db.get(d.orderId);
    if (!order || order.paymentStatus !== "paid") {
      // pagamento não confirmado: volta para pendente
      await ctx.db.patch(deliveryId, { status: "pending", updatedAt: Date.now() });
      return;
    }

    const product = await ctx.db.get(d.productId);
    const config = (product?.delivery ?? {}) as DeliveryConfig;
    const placeholders: Record<string, string> = {
      "{player}": d.target,
      "{quantity}": String(d.quantity),
      "{order_id}": order.number,
      "{product_id}": d.productId,
    };
    const replace = (text: string) =>
      Object.entries(placeholders).reduce(
        (acc, [ph, val]) => acc.split(ph).join(val),
        text,
      );

    let success = false;
    let error: string | undefined;
    let payloadResult: any = undefined;

    try {
      switch (config.type) {
        case "code": {
          // consome códigos digitais do estoque do produto
          const codes = config.codes ?? [];
          if (codes.length < d.quantity) {
            error = `Sem códigos disponíveis (precisa ${d.quantity}, há ${codes.length})`;
            break;
          }
          const consumed = codes.slice(0, d.quantity);
          payloadResult = consumed.map((c) => replace(c));
          await ctx.db.patch(d.productId, {
            delivery: { ...config, codes: codes.slice(d.quantity) },
          });
          success = true;
          break;
        }
        case "message": {
          payloadResult = replace(config.message ?? "");
          success = true;
          break;
        }
        case "command":
        case "api":
        case "webhook": {
          // executa via action (HTTP externo) — agendada abaixo
          await ctx.scheduler.runAfter(0, internal.deliveries.executeHttp, {
            deliveryId,
            type: config.type,
            url: replace(config.apiUrl ?? ""),
            method: config.apiMethod ?? "POST",
            headers: (config.apiHeaders ?? []).map((h) => ({ k: h.k, v: replace(h.v) })),
            body: config.apiBody ? replace(config.apiBody) : undefined,
            commands: (config.commands ?? []).map((c) => replace(c)),
          });
          return; // resultado vem via completeExecution
        }
        case "manual":
        case "none":
        default:
          success = true; // manual fica pendente para o admin; none não precisa processar
          break;
      }
    } catch (e: any) {
      error = e?.message ?? "Erro desconhecido";
      success = false;
    }

    if (config.type === "manual") {
      // entrega manual: aguarda o admin marcar como entregue
      await ctx.db.patch(deliveryId, {
        status: "pending",
        attempts: d.attempts + 1,
        updatedAt: Date.now(),
      });
      return;
    }

    if (success) {
      await ctx.db.patch(deliveryId, {
        status: "delivered",
        deliveredAt: Date.now(),
        attempts: d.attempts + 1,
        lastError: undefined,
        payload: payloadResult,
        updatedAt: Date.now(),
      });
      await maybeCompleteOrder(ctx, d.orderId);
    } else {
      await scheduleRetry(ctx, d, error ?? "Falha na entrega");
    }
  },
});

/** Executa chamadas HTTP/comandos (roda no runtime Node). */
export const executeHttp = internalMutation({
  args: {
    deliveryId: v.id("deliveries"),
    type: v.string(),
    url: v.optional(v.string()),
    method: v.string(),
    headers: v.optional(v.array(v.object({ k: v.string(), v: v.string() }))),
    body: v.optional(v.string()),
    commands: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const d: any = await ctx.db.get(args.deliveryId);
    if (!d || d.status === "delivered") return;
    let success = false;
    let error: string | undefined;
    let payloadResult: any = undefined;

    try {
      if (args.type === "api" && args.url) {
        const res = await fetch(args.url, {
          method: args.method,
          headers: Object.fromEntries((args.headers ?? []).map((h) => [h.k, h.v])),
          body: args.method === "POST" && args.body ? args.body : undefined,
        });
        const text = await res.text();
        success = res.ok;
        if (!res.ok) error = `API retornou HTTP ${res.status}: ${text.slice(0, 200)}`;
        else payloadResult = text.slice(0, 2000);
      } else if (args.type === "webhook" && args.url) {
        const res = await fetch(args.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Delivery-Order": d.orderNumber,
            "X-Delivery-Product": d.productId,
          },
          body: JSON.stringify({
            orderNumber: d.orderNumber,
            productId: d.productId,
            productName: d.productName,
            target: d.target,
            quantity: d.quantity,
            commands: args.commands ?? [],
          }),
        });
        success = res.ok;
        if (!res.ok) error = `Webhook retornou HTTP ${res.status}`;
      } else if (args.type === "command") {
        // Comandos de servidor Minecraft não são executados localmente:
        // são despachados para o webhook/RCON configurado pelo admin.
        if (!args.url) {
          error = "Comando configurado mas nenhum endpoint de despacho (Integrações → Minecraft/API)";
        } else {
          const res = await fetch(args.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commands: args.commands ?? [] }),
          });
          success = res.ok;
          if (!res.ok) error = `Endpoint de comandos retornou HTTP ${res.status}`;
        }
      }
    } catch (e: any) {
      error = e?.message ?? "Erro de rede";
      success = false;
    }

    if (success) {
      await ctx.db.patch(args.deliveryId, {
        status: "delivered",
        deliveredAt: Date.now(),
        attempts: d.attempts + 1,
        lastError: undefined,
        payload: payloadResult,
        updatedAt: Date.now(),
      });
      await maybeCompleteOrder(ctx, d.orderId);
    } else {
      await scheduleRetry(ctx, d, error ?? "Falha na entrega");
    }
  },
});

async function scheduleRetry(ctx: any, d: any, error: string) {
  const attempts = d.attempts + 1;
  if (attempts >= d.maxAttempts) {
    await ctx.db.patch(d._id, {
      status: "failed",
      attempts,
      lastError: error,
      updatedAt: Date.now(),
    });
    // notifica webhook de falha
    await ctx.scheduler.runAfter(0, internal.webhooksOut.sendEvent, {
      event: "delivery.failed",
      payload: { orderNumber: d.orderNumber, product: d.productName, error },
    });
    return;
  }
  // backoff exponencial: 1min, 5min, 15min, 60min
  const backoffs = [60_000, 300_000, 900_000, 3_600_000];
  const delay = backoffs[Math.min(attempts - 1, backoffs.length - 1)];
  await ctx.db.patch(d._id, {
    status: "failed",
    attempts,
    lastError: error,
    nextRetryAt: Date.now() + delay,
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(delay, internal.deliveries.processOrder, { orderId: d.orderId });
}

async function maybeCompleteOrder(ctx: any, orderId: any) {
  const remaining = await ctx.db
    .query("deliveries")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  const allDone = remaining.every((r: any) => r.status === "delivered");
  if (!allDone) return;
  const order = await ctx.db.get(orderId);
  if (!order || order.deliveryStatus === "delivered") return;
  await ctx.db.patch(orderId, {
    deliveryStatus: "delivered",
    updatedAt: Date.now(),
    statusHistory: [
      ...order.statusHistory,
      { status: "delivered", at: Date.now(), note: "Entrega automática concluída" },
    ],
  });
  await ctx.scheduler.runAfter(0, internal.webhooksOut.sendEvent, {
    event: "order.delivered",
    payload: { orderNumber: order.number },
  });
}

// ─── Admin: reprocessar / marcar como entregue ───

export const adminRetry = mutation({
  args: { id: v.id("deliveries") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx, "deliveries.manage");
    const d = await ctx.db.get(id);
    if (!d) throw new Error("Entrega não encontrada");
    if (d.status === "delivered") throw new Error("Entrega já concluída");
    await ctx.db.patch(id, { status: "pending", nextRetryAt: undefined, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.deliveries.processOrder, { orderId: d.orderId });
    await logAudit(ctx, admin, "delivery.retry", "delivery", id, { order: d.orderNumber });
  },
});

export const adminMarkDelivered = mutation({
  args: { id: v.id("deliveries") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx, "deliveries.manage");
    const d = await ctx.db.get(id);
    if (!d) throw new Error("Entrega não encontrada");
    if (d.status === "delivered") return;
    await ctx.db.patch(id, {
      status: "delivered",
      deliveredAt: Date.now(),
      updatedAt: Date.now(),
    });
    await maybeCompleteOrder(ctx, d.orderId);
    await logAudit(ctx, admin, "delivery.mark_delivered", "delivery", id, { order: d.orderNumber });
  },
});

export const adminList = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx, "deliveries.view");
    let list = await ctx.db.query("deliveries").collect();
    if (status) list = list.filter((d) => d.status === status);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },
});
