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
export const CUSTOMER_TOKEN_KEY = "saas_customer_token";

export interface CustomerAddressItem {
  id: string;
  tenant_id: string;
  customer_id: string;
  label?: string | null;
  address_type: string;
  postal_code: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  tenant_id: string;
  person_type: "PF" | "PJ" | string;
  full_name: string;
  company_name?: string | null;
  tax_id?: string | null;
  state_tax_id?: string | null;
  email?: string | null;
  phone: string;
  birth_date?: string | null;
  created_at: string;
  addresses: CustomerAddressItem[];
}

export interface CustomerOrderItem {
  id: string;
  product_id?: string | null;
  sku: string;
  name: string;
  variant_name?: string | null;
  product_image_url?: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  custom_text?: string | null;
  customization_notes?: string | null;
  customization_answers?: Array<{
    field_id?: string;
    label: string;
    field_type: string;
    value: string;
    additional_price?: number;
  }>;
  artwork_url?: string | null;
  artwork_filename?: string | null;
  artwork_status: string;
  approved_art_url?: string | null;
  art_approved: boolean;
  production_notes?: string | null;
}

export interface CustomerOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  status: string;
  production_status: string;
  due_date?: string | null;
  priority: string;
  items_subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  pix_qr_code_url?: string | null;
  pix_copy_paste_code?: string | null;
  installments: number;
  shipping_provider?: string | null;
  shipping_service_name?: string | null;
  shipping_tracking_code?: string | null;
  estimated_production_days: number;
  customer_snapshot: Record<string, any>;
  shipping_address_snapshot: Record<string, any>;
  created_at: string;
  items: CustomerOrderItem[];
}

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  window.dispatchEvent(new Event("customer-auth-updated"));
}

export function clearCustomerToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  window.dispatchEvent(new Event("customer-auth-updated"));
}

export async function fetchCustomerApi(endpoint: string, options: RequestInit = {}) {
  const token = getCustomerToken();
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

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });
}

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
