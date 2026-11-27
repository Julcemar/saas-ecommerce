import { CSSProperties } from "react";
import { TenantInfo } from "./api";

/**
 * Calcula a cor de contraste ideal (#FFFFFF ou #0F172A) com base na luminância
 * relativa WCAG 2.1 (linearização sRGB) para garantir legibilidade em qualquer
 * paleta escolhida pelo lojista no painel administrativo.
 */
export function getContrastColor(hexColor?: string | null): "#FFFFFF" | "#0F172A" {
  if (!hexColor) return "#FFFFFF";

  let hex = hexColor.trim().replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  if (hex.length !== 6) return "#FFFFFF";

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  if (isNaN(r) || isNaN(g) || isNaN(b)) return "#FFFFFF";

  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);

  // Limiar WCAG onde texto escuro (#0F172A) oferece maior razão de contraste que branco
  return luminance > 0.34 ? "#0F172A" : "#FFFFFF";
}

/**
 * Gera as CSS Custom Properties programáveis da vitrine a partir das cores
 * salvas pelo lojista no banco de dados (tenant), incluindo tokens derivados
 * com color-mix() para glassmorphism, sombras tingidas e gradientes sutis.
 */
export function generateThemeCssVariables(tenant: TenantInfo | null): CSSProperties {
  const primary = tenant?.primary_color || "#084D6E";
  const secondary = tenant?.secondary_color || "#00B4D8";
  const settings = (tenant?.settings_json || {}) as Record<string, any>;
  const cta = settings.cta_color || primary;
  const accent = settings.accent_color || secondary;
  const themeKey = settings.theme || "modern_commerce";

  const brandBg =
    settings.brand_bg ||
    (themeKey === "clean_minimal"
      ? "#FAFAFA"
      : themeKey === "editorial_studio"
      ? "#FCFCFD"
      : "#F8FAFC");
  const brandSurface = settings.brand_surface || "#FFFFFF";

  const primaryFg = getContrastColor(primary);
  const secondaryFg = getContrastColor(secondary);
  const ctaFg = getContrastColor(cta);
  const accentFg = getContrastColor(accent);

  return {
    "--brand-primary": primary,
    "--brand-secondary": secondary,
    "--brand-bg": brandBg,
    "--brand-surface": brandSurface,
    "--brand-text-on-primary": primaryFg,
    "--brand-text-on-secondary": secondaryFg,
    "--brand-primary-soft": `color-mix(in srgb, ${primary} 10%, transparent)`,
    "--brand-primary-border": `color-mix(in srgb, ${primary} 24%, transparent)`,
    "--brand-primary-glass": `color-mix(in srgb, ${brandSurface} 84%, ${primary} 3%)`,
    "--brand-shadow-hover": `0 14px 32px -12px color-mix(in srgb, ${primary} 28%, transparent)`,
    "--brand-cta-gradient": `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 82%, ${secondary}) 100%)`,
    // Aliases legados para retrocompatibilidade em toda a vitrine
    "--color-primary": primary,
    "--color-primary-foreground": primaryFg,
    "--color-secondary": secondary,
    "--color-secondary-foreground": secondaryFg,
    "--color-cta": cta,
    "--color-cta-foreground": ctaFg,
    "--color-accent": accent,
    "--color-accent-foreground": accentFg,
  } as CSSProperties;
}
