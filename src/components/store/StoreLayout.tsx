import { useQuery } from "convex/react";
import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/lib/cart";
import { ShoppingBag, ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Store = {
  name: string;
  logoUrl?: string;
  discord?: string;
  whatsapp?: string;
  instagram?: string;
};

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = useQuery(api.settings.getStore) as Store | undefined;
  const menu = useQuery(api.settings.getMenu) as
    | Array<{ label: string; url: string; newTab?: boolean }>
    | undefined;
  const cart = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const navItems = (menu ?? []).filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold">
            {store?.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-8 w-auto" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingBag className="size-4" />
              </span>
            )}
            <span className="text-lg">{store?.name ?? "Loja"}</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {(navItems.length ? navItems : [{ label: "Início", url: "/" }]).map((item, i) => (
              <a
                key={i}
                href={item.url}
                target={item.newTab ? "_blank" : undefined}
                rel={item.newTab ? "noreferrer" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  typeof item.url === "string" &&
                    item.url.startsWith("/") &&
                    location.pathname === item.url &&
                    "text-foreground",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/painel">Painel</Link>
            </Button>
            <Button variant="outline" size="icon" asChild aria-label="Carrinho" className="relative">
              <Link to="/carrinho">
                <ShoppingCart className="size-4" />
                {cart.totalCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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
          <nav className="border-t px-4 py-2 md:hidden">
            {(navItems.length ? navItems : [{ label: "Início", url: "/" }]).map((item, i) => (
              <a
                key={i}
                href={item.url}
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{store?.name ?? "Loja"}</p>
          <p className="mt-1">
            Pagamentos processados com segurança via PIX · Entrega automática 24/7
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            {store?.discord && (
              <a href={store.discord} target="_blank" rel="noreferrer" className="hover:text-foreground">
                Discord
              </a>
            )}
            {store?.whatsapp && (
              <a href={store.whatsapp} target="_blank" rel="noreferrer" className="hover:text-foreground">
                WhatsApp
              </a>
            )}
            {store?.instagram && (
              <a href={store.instagram} target="_blank" rel="noreferrer" className="hover:text-foreground">
                Instagram
              </a>
            )}
            <Link to="/painel" className="hover:text-foreground">
              Painel Admin
            </Link>
          </div>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} {store?.name ?? "Loja"} · Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
