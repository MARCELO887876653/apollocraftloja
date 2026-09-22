import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Product = {
  _id: string;
  slug: string;
  name: string;
  image?: string;
  shortDescription?: string;
  priceCents: number;
  compareAtPriceCents?: number;
  stock: number;
  unlimitedStock: boolean;
  minQty: number;
  maxQty: number;
  categoryName?: string;
};

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const outOfStock = !product.unlimitedStock && product.stock <= 0;
  const discount =
    product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents
      ? Math.round((1 - product.priceCents / product.compareAtPriceCents) * 100)
      : 0;

  const categories = useQuery(api.categories.listPublic) as any[] | undefined;
  const category = categories?.find((c) => c._id === (product as any).categoryId);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
      <Link to={`/produto/${product.slug}`} className="relative block aspect-video overflow-hidden bg-muted">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-card text-muted-foreground">
            <ShoppingBag className="size-10 opacity-40" />
          </div>
        )}
        {discount > 0 && (
          <Badge className="absolute left-2 top-2 bg-red-600 hover:bg-red-600">-{discount}%</Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-semibold">
            Esgotado
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {category && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {category.name}
          </span>
        )}
        <Link
          to={`/produto/${product.slug}`}
          className="line-clamp-2 font-semibold leading-snug hover:text-primary"
        >
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.shortDescription}</p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {discount > 0 && (
              <span className="block text-xs text-muted-foreground line-through">
                {formatBRL(product.compareAtPriceCents!)}
              </span>
            )}
            <span className="text-lg font-bold text-primary">{formatBRL(product.priceCents)}</span>
          </div>
          <Button
            size="icon"
            variant="secondary"
            disabled={outOfStock}
            aria-label="Adicionar ao carrinho"
            onClick={() =>
              cart.add({
                productId: product._id,
                name: product.name,
                image: product.image,
                unitPriceCents: product.priceCents,
                quantity: product.minQty || 1,
                minQty: product.minQty,
                maxQty: product.maxQty,
              })
            }
          >
            <ShoppingCart className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
