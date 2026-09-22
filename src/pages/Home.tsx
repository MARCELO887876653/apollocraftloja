import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link } from "react-router";
import {
  ShoppingBag, Zap, ShieldCheck, Clock, List, ArrowRight, TrendingDown,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "@/components/store/ProductCard";

type Section = { id: string; type: string; enabled: boolean; config?: any };
type Product = any;
type Category = { _id: string; name: string; slug: string; icon?: string; color?: string; image?: string; description?: string };

function SectionHeader({ title, moreHref }: { title?: string; moreHref?: string }) {
  if (!title) return null;
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      {moreHref && (
        <Link
          to={moreHref}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver tudo <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function Grid({ products }: { products: Product[] | undefined }) {
  if (!products?.length) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  );
}

function Hero() {
  const store = useQuery(api.settings.getStore) as any;
  const banners = useQuery(api.content.listBanners, { position: "hero", activeOnly: true }) as any[] | undefined;
  const hero = banners?.[0];
  return (
    <section className="relative overflow-hidden border-b">
      {/* imagem de fundo configurável + overlay */}
      {hero?.imageDesktop && (
        <div className="absolute inset-0" aria-hidden>
          <img src={hero.imageDesktop} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        </div>
      )}
      {!hero?.imageDesktop && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-48 left-1/3 h-[420px] w-[720px] rounded-full bg-primary/20 blur-[130px]" />
        </div>
      )}

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-5 px-4 py-20 sm:py-28">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {hero?.title ?? (
            <>
              Domine o jogo com os{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-sky-400 bg-clip-text text-transparent">
                kits e VIPs
              </span>{" "}
              da nossa loja!
            </>
          )}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {hero?.subtitle ?? store?.description ?? "Entrega automática 24/7, preços justos e pagamento instantâneo via PIX."}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            to="/loja"
            className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-7 text-sm font-bold text-zinc-950 shadow-lg shadow-white/5 transition-all hover:bg-zinc-200 active:scale-95"
          >
            <ShoppingBag className="size-4.5" /> Conferir ofertas
          </Link>
          {store?.discord && (
            <a
              href={store.discord}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card/60 px-7 text-sm font-semibold backdrop-blur transition-all hover:bg-accent active:scale-95"
            >
              Entrar no Discord
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { icon: Zap, title: "Entrega automática", text: "Receba na hora, assim que o PIX cair." },
    { icon: ShieldCheck, title: "Pagamento seguro", text: "Processado pelo Mercado Pago." },
    { icon: Clock, title: "Suporte 24/7", text: "Atendimento no Discord sempre aberto." },
    { icon: ShoppingBag, title: "Estoque real", text: "Kits e VIPs sempre disponíveis." },
  ];
  return (
    <section className="border-b">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <item.icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Cards horizontais de categoria com glow — estilo vitrine. */
function Categories() {
  const categories = useQuery(api.categories.listPublic) as Category[] | undefined;
  if (!categories?.length) return null;
  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground">
          <List className="size-4" /> Categorias populares
        </span>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 6).map((c) => (
            <Link
              key={c._id}
              to={`/loja?categoria=${c.slug}`}
              className="group flex items-center gap-4 rounded-2xl border bg-card p-3 transition-all hover:border-foreground/25"
            >
              <div
                className="relative size-24 shrink-0 overflow-hidden rounded-xl"
                style={c.color ? { boxShadow: `0 0 42px -8px ${c.color}` } : undefined}
              >
                {c.image ? (
                  <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-3xl"
                    style={{ backgroundColor: c.color ? `${c.color}22` : undefined }}
                  >
                    {c.icon ?? "📦"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-lg font-extrabold uppercase tracking-tight">{c.name}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {c.description ?? `Veja os itens disponíveis de ${c.name}.`}
                </p>
                <span className="mt-2.5 inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 text-sm font-bold text-zinc-950 transition-colors group-hover:bg-zinc-200">
                  Ver produtos <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSection({
  title,
  products,
  moreHref,
}: {
  title: string;
  products: Product[] | undefined;
  moreHref?: string;
}) {
  if (!products || products.length === 0) return null;
  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <SectionHeader title={title} moreHref={moreHref} />
        <Grid products={products} />
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = useQuery(api.content.listFaqs, { activeOnly: true }) as any[] | undefined;
  if (!faqs?.length) return null;
  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <SectionHeader title="Perguntas frequentes" />
        <Accordion type="single" collapsible>
          {faqs.slice(0, 8).map((f) => (
            <AccordionItem key={f._id} value={f._id}>
              <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export default function Home() {
  const homepage = (useQuery(api.settings.getHomepage) as Section[] | undefined) ?? [];

  return (
    <>
      {homepage
        .filter((s) => s.enabled)
        .map((section) => {
          const cfg = section.config ?? {};
          switch (section.type) {
            case "hero":
              return <Hero key={section.id} />;
            case "benefits":
              return <Benefits key={section.id} />;
            case "categories":
              return <Categories key={section.id} />;
            case "featured":
              return <Featured key={section.id} config={cfg} />;
            case "promo":
              return <Promo key={section.id} config={cfg} />;
            case "popular":
              return <Popular key={section.id} config={cfg} />;
            case "new":
              return <Newest key={section.id} config={cfg} />;
            case "faq":
              return <FaqSection key={section.id} />;
            default:
              return null;
          }
        })}
    </>
  );
}

function Featured({ config }: { config: any }) {
  const products = useQuery(api.products.listFeatured, { limit: config?.count ?? 8 }) as any[] | undefined;
  return (
    <ProductSection
      title={config?.title ?? "Produtos em destaque"}
      products={products}
      moreHref="/loja"
    />
  );
}
function Promo({ config }: { config: any }) {
  const products = useQuery(api.products.listPromo, { limit: config?.count ?? 8 }) as any[] | undefined;
  return <ProductSection title={config?.title ?? "Promoções"} products={products} />;
}
function Popular({ config }: { config: any }) {
  const products = useQuery(api.products.listPopular, { limit: config?.count ?? 8 }) as any[] | undefined;
  return <ProductSection title={config?.title ?? "Mais vendidos"} products={products} />;
}
function Newest({ config }: { config: any }) {
  const products = useQuery(api.products.listNewest, { limit: config?.count ?? 8 }) as any[] | undefined;
  return <ProductSection title={config?.title ?? "Lançamentos"} products={products} />;
}
