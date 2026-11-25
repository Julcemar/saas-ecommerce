// Cliente HTTP leve e utilitários de tenant

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  domain_verified: boolean;
  primary_color: string;
  secondary_color: string;
  logo_url?: string | null;
  settings_json: {
    currency?: string;
    whatsapp_phone?: string;
    free_shipping_min_amount?: number;
    b2b_cta_enabled?: boolean;
  };
}

export interface WholesaleTier {
  id: string;
  min_quantity: number;
  unit_price: number;
}

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  base_price: number;
  compare_at_price?: number;
  image_url?: string;
  badge_label?: string;
  description?: string;
  short_description?: string;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  enable_text_customization: boolean;
  text_customization_label?: string;
  text_max_length: number;
  enable_artwork_upload: boolean;
  production_lead_time_days: number;
  wholesale_tiers: WholesaleTier[];
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  unit_price: number;
  custom_text?: string;
  artwork_url?: string;
  artwork_filename?: string;
}

export interface NavigationSubItem {
  id: string;
  label: string;
  type: "category" | "product" | "custom_link";
  target_id?: string | null;
  url: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  type: "category" | "product" | "custom_link";
  target_id?: string | null;
  url: string;
  children: NavigationSubItem[];
}


export const API_BASE = "/api";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("saas_token") : null;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Se tivermos um tenant selecionado via query/storage para teste local, enviamos o header
  if (typeof window !== "undefined") {
    const overrideTenant = localStorage.getItem("active_tenant_slug") || "jestein";
    if (overrideTenant) {
      headers["X-Tenant-Slug"] = overrideTenant;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
}
