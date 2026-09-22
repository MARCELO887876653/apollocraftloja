import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

type Theme = {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  border: string;
  radius: number;
  font: string;
  darkMode: boolean;
};

function hexToRgb(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return "0 0 0";
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function mix(fg: string, bg: string, amount: number): string {
  const f = fg.replace("#", "").match(/.{2}/g)?.map((x) => parseInt(x, 16)) ?? [0, 0, 0];
  const b = bg.replace("#", "").match(/.{2}/g)?.map((x) => parseInt(x, 16)) ?? [0, 0, 0];
  const out = f.map((c, i) => Math.round(c * amount + b[i] * (1 - amount)));
  return out.map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useQuery(api.settings.getTheme) as Theme | undefined;

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    const bg = theme.background || "#ffffff";
    const fg = theme.foreground || "#09090b";
    const primary = theme.primary || "#7c3aed";
    const secondary = theme.secondary || "#f4f4f5";

    root.style.setProperty("--radius", `${theme.radius ?? 10}px`);
    root.style.setProperty("--background", hexToRgb(bg));
    root.style.setProperty("--foreground", hexToRgb(fg));
    root.style.setProperty("--card", hexToRgb(theme.card || "#ffffff"));
    root.style.setProperty("--card-foreground", hexToRgb(fg));
    root.style.setProperty("--popover", hexToRgb(theme.card || "#ffffff"));
    root.style.setProperty("--popover-foreground", hexToRgb(fg));
    root.style.setProperty("--primary", hexToRgb(primary));
    root.style.setProperty("--primary-foreground", hexToRgb(theme.primaryForeground || "#ffffff"));
    root.style.setProperty("--secondary", hexToRgb(secondary));
    root.style.setProperty("--secondary-foreground", hexToRgb(theme.secondaryForeground || fg));
    root.style.setProperty("--muted", hexToRgb(mix(fg, bg, 0.05)));
    root.style.setProperty("--muted-foreground", hexToRgb(mix(fg, bg, 0.55)));
    root.style.setProperty("--accent", hexToRgb(mix(primary, bg, 0.12)));
    root.style.setProperty("--accent-foreground", hexToRgb(fg));
    root.style.setProperty("--border", hexToRgb(theme.border || mix(fg, bg, 0.12)));
    root.style.setProperty("--input", hexToRgb(theme.border || mix(fg, bg, 0.12)));
    root.style.setProperty("--ring", hexToRgb(primary));

    const isDark = theme.darkMode || false;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  }, [theme]);

  return <>{children}</>;
}
