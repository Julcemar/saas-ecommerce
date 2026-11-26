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
  home_config?: Record<string, any> | null;
  settings_json: {
    currency?: string;
    whatsapp_phone?: string;
    free_shipping_min_amount?: number;
    b2b_cta_enabled?: boolean;
    theme?: string;
  };
}

export interface WholesaleTier {
  id?: string;
  min_quantity: number;
  unit_price: number;
}

export interface ProductVariantItem {
  id?: string;
  sku: string;
  name: string;
  attribute_options: Record<string, string>;
  price_modifier: number;
  final_price: number;
  stock_quantity?: number | null;
  weight_grams?: number | null;
  image_url?: string | null;
  is_active: boolean;
}

export interface CustomizationFieldItem {
  id?: string;
  label: string;
  field_type: "TEXT" | "TEXTAREA" | "SELECT" | "COLOR_SWATCH" | "FILE_UPLOAD";
  placeholder?: string | null;
  options: string[];
  max_length?: number | null;
  additional_price: number;
  is_required: boolean;
  position: number;
}

export interface CategoryItem {
  id: string;
  tenant_id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  products_count?: number;
}

export interface ProductItem {
  id: string;
  tenant_id?: string;
  category_id?: string | null;
  name: string;
  slug: string;
  sku: string;
  product_type?: string;
  base_price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  image_url?: string | null;
  images_json?: string[];
  status?: "ACTIVE" | "DRAFT" | string;
  is_active?: boolean;
  is_featured?: boolean;
  badge_label?: string | null;
  description?: string | null;
  short_description?: string | null;
  track_inventory?: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  allow_backorder?: boolean;
  is_physical?: boolean;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  enable_text_customization: boolean;
  text_customization_label?: string | null;
  text_max_length: number;
  enable_artwork_upload: boolean;
  upload_max_size_mb?: number;
  production_lead_time_days: number;
  seo_title?: string | null;
  seo_description?: string | null;
  wholesale_tiers: WholesaleTier[];
  variants?: ProductVariantItem[];
  customization_fields?: CustomizationFieldItem[];
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  unit_price: number;
  custom_text?: string;
  customization_answers?: Array<{
    field_id: string;
    label: string;
    field_type: string;
    value: string;
    additional_price: number;
  }>;
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
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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
