import { api } from "@/convex/_generated/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  image?: string;
  unitPriceCents: number;
  quantity: number;
  minQty?: number;
  maxQty?: number;
}

interface CartContextValue {
  items: CartItem[];
  coupon: string | null;
  add: (item: CartItem) => void;
  remove: (productId: string, variantId?: string) => void;
  setQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
  subtotalCents: number;
  totalCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "nexastore-cart";

interface Stored {
  items: CartItem[];
  coupon: string | null;
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], coupon: null };
    const parsed = JSON.parse(raw) as Stored;
    return { items: Array.isArray(parsed.items) ? parsed.items : [], coupon: parsed.coupon ?? null };
  } catch {
    return { items: [], coupon: null };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage cheio/indisponível — carrinho segue em memória
    }
  }, [state]);

  const add = useCallback((item: CartItem) => {
    setState((s) => {
      const idx = s.items.findIndex(
        (i) => i.productId === item.productId && i.variantId === item.variantId,
      );
      if (idx >= 0) {
        const items = [...s.items];
        const max = items[idx].maxQty ?? 99;
        items[idx] = { ...items[idx], quantity: Math.min(items[idx].quantity + item.quantity, max) };
        return { ...s, items };
      }
      return { ...s, items: [...s.items, item] };
    });
  }, []);

  const remove = useCallback((productId: string, variantId?: string) => {
    setState((s) => ({
      ...s,
      items: s.items.filter((i) => !(i.productId === productId && i.variantId === variantId)),
    }));
  }, []);

  const setQuantity = useCallback(
    (productId: string, variantId: string | undefined, quantity: number) => {
      setState((s) => ({
        ...s,
        items: s.items
          .map((i) => (i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i))
          .filter((i) => i.quantity > 0),
      }));
    },
    [],
  );

  const setCoupon = useCallback((coupon: string | null) => setState((s) => ({ ...s, coupon })), []);
  const clear = useCallback(() => setState({ items: [], coupon: null }), []);

  const subtotalCents = useMemo(
    () => state.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
    [state.items],
  );
  const totalCount = useMemo(() => state.items.reduce((sum, i) => sum + i.quantity, 0), [state.items]);

  const value = useMemo(
    () => ({ items: state.items, coupon: state.coupon, add, remove, setQuantity, setCoupon, clear, subtotalCents, totalCount }),
    [state, add, remove, setQuantity, setCoupon, clear, subtotalCents, totalCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
}

export { api };
