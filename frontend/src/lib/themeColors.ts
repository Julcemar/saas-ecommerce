import { CSSProperties } from "react";
import { TenantInfo } from "./api";

/**
 * Calcula a cor de contraste ideal (Branco ou Cinza Escuro quase preto)
 * com base na luminância relativa W3C para garantir legibilidade perfeita
 * em botões e badges, mesmo com cores claras escolhidas pelo lojista.
 */
export function getContrastColor(hexColor?: string | null): "#FFFFFF" | "#111827" {
  if (!hexColor) return "#FFFFFF";

  let hex = hexColor.trim().replace(/^#/, "");

  // Expande shorthand (#FFF -> #FFFFFF)
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }

  if (hex.length !== 6) return "#FFFFFF";

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return "#FFFFFF";

  // Fórmula de luminância perceptiva padrão W3C
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

  // Acima de 180 o fundo é considerado claro -> texto escuro #111827
  return luminance > 180 ? "#111827" : "#FFFFFF";
}

/**
 * Gera as variáveis CSS completas da vitrine baseadas no tenant ativo
 * para injeção direta via style={...} evitando qualquer FOUC (Flash of Unstyled Color).
 */
export function generateThemeCssVariables(tenant: TenantInfo | null): CSSProperties {
  const primary = tenant?.primary_color || "#084D6E";
  const secondary = tenant?.secondary_color || "#00B4D8";
  const cta = (tenant?.settings_json as any)?.cta_color || primary;
  const accent = (tenant?.settings_json as any)?.accent_color || secondary;

  const primaryFg = getContrastColor(primary);
  const secondaryFg = getContrastColor(secondary);
  const ctaFg = getContrastColor(cta);
  const accentFg = getContrastColor(accent);

  return {
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
