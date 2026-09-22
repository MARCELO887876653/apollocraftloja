import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link } from "react-router";
import { ShoppingBag, Zap, ShieldCheck, Clock, ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "@/components/store/ProductCard";

type Section = { id: string; type: string; enabled: boolean; config?: any };
type Product = any;
type Category = { _id: string; name: string; slug: string; icon?: string; color?: string; description?: string };

function SectionHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title) return null;
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
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
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-primary/5 to-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Zap className="size-3.5 text-primary" /> Entrega automática via PIX
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          {hero?.title ?? store?.name ?? "Sua loja digital completa"}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          {hero?.subtitle ?? store?.description ?? "Produtos digitais com pagamento instantâneo e entrega automática 24 horas por dia."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/loja"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
          >
            Ver catálogo
          </Link>
          {hero?.buttonText && hero?.buttonUrl && (
            <a
              href={hero.buttonUrl}
              className="inline-flex h-11 items-center rounded-lg border bg-card px-6 text-sm font-semibold shadow-sm transition hover:bg-accent"
            >
              {hero.buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { icon: Zap, title: "Entrega instantânea", text: "Receba seu produto automaticamente após o pagamento." },
    { icon: ShieldCheck, title: "Pagamento seguro", text: "Processado pelo Mercado Pago com PIX." },
    { icon: Clock, title: "Suporte 24/7", text: "Atendimento via Discord sempre disponível." },
    { icon: ShoppingBag, title: "Estoque real", text: "Sistema de estoque e variantes por produto." },
  ];
  return (
    <section className="border-b">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Categories() {
  const categories = useQuery(api.categories.listPublic) as Category[] | undefined;
  if (!categories?.length) return null;
  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <SectionHeader title="Categorias" subtitle="Explore por categoria" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 12).map((c) => (
            <Link
              key={c._id}
              to={`/loja?categoria=${c.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center transition hover:border-primary/40 hover:shadow-sm"
            >
              <span
                className="flex size-11 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: c.color ? `${c.color}22` : undefined, color: c.color }}
              >
                {c.icon ?? "📦"}
              </span>
              <span className="text-sm font-medium">{c.name}</span>
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
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          {moreHref && (
            <Link to={moreHref} className="text-sm font-medium text-primary hover:underline">
              Ver tudo
            </Link>
          )}
        </div>
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
