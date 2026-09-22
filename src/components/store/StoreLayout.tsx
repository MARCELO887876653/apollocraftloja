import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/lib/cart";
import { ShoppingBag, ShoppingCart, Menu, X, Zap, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Store = {
  name: string;
  logoUrl?: string;
  discord?: string;
  whatsapp?: string;
  instagram?: string;
};

type MenuItem = { label: string; url: string; newTab?: boolean };

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = useQuery(api.settings.getStore) as Store | undefined;
  const menu = useQuery(api.settings.getMenu) as MenuItem[] | undefined;
  const cart = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = (menu ?? []).filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-all duration-300",
          scrolled
            ? "border-border/80 bg-background/85 shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
            : "border-transparent bg-background/60 backdrop-blur-md",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="group flex items-center gap-2.5">
            {store?.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-9 w-auto" />
            ) : (
              <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-500 shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
                <ShoppingBag className="size-4.5 text-primary-foreground" />
              </span>
            )}
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
              {store?.name ?? "ApolloCraft"}
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {(navItems.length ? navItems : [{ label: "Início", url: "/" }]).map((item, i) => (
              <a
                key={i}
                href={item.url}
                target={item.newTab ? "_blank" : undefined}
                rel={item.newTab ? "noreferrer" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  item.url.startsWith("/") && location.pathname === item.url && "text-foreground",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/painel">Painel</Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              aria-label="Carrinho"
              className="relative border-border/80"
            >
              <Link to="/carrinho">
                <ShoppingCart className="size-4" />
                {cart.totalCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-md shadow-primary/40">
                    {cart.totalCount}
                  </span>
                )}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="border-t bg-background/95 px-4 py-2 backdrop-blur-xl md:hidden">
            {(navItems.length ? navItems : [{ label: "Início", url: "/" }]).map((item, i) => (
              <a
                key={i}
                href={item.url}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="relative mt-auto border-t bg-muted/30">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-500 shadow-lg shadow-primary/25">
                <ShoppingBag className="size-4.5 text-primary-foreground" />
              </span>
              <span className="text-lg font-extrabold tracking-tight">{store?.name ?? "ApolloCraft"}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Entrega automática 24/7 · Pagamento seguro via PIX
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-semibold">Atalhos</p>
            <Link to="/loja" className="text-muted-foreground hover:text-foreground">Catálogo</Link>
            <Link to="/carrinho" className="text-muted-foreground hover:text-foreground">Carrinho</Link>
            <Link to="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
            <Link to="/painel" className="text-muted-foreground hover:text-foreground">Painel Admin</Link>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-semibold">Comunidade</p>
            {store?.discord && (
              <a href={store.discord} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <MessageCircle className="size-4" /> Discord
              </a>
            )}
            {store?.whatsapp && (
              <a href={store.whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Zap className="size-4" /> WhatsApp
              </a>
            )}
            {store?.instagram && (
              <a href={store.instagram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                Instagram
              </a>
            )}
            {!store?.discord && !store?.whatsapp && !store?.instagram && (
              <p className="text-muted-foreground">Configure suas redes no painel.</p>
            )}
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {store?.name ?? "ApolloCraft"} · Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
}
