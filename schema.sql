-- ============================================================================
-- MODELAGEM RELACIONAL MULTI-TENANT PARA PLATAFORMA SAAS DE PERSONALIZADOS
-- Banco de Dados: PostgreSQL 14+
-- Versão do Schema: 1.0.0
-- Padrão de Isolamento: Chave Lógica Compartilhada (tenant_id) + Índices Compostos
-- ============================================================================

-- Extensões essenciais para geração de UUID e criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TIPOS ENUMERADOS (ENUMS)
-- ============================================================================
CREATE TYPE user_role_enum AS ENUM (
    'super_admin',
    'tenant_owner',
    'staff'
);

CREATE TYPE integration_provider_enum AS ENUM (
    'infinitepay',
    'mercadopago',
    'melhorenvio',
    'correios',
    'whatsapp_cloud',
    'custom_webhook'
);

CREATE TYPE integration_category_enum AS ENUM (
    'payment',
    'shipping',
    'messaging',
    'analytics'
);

CREATE TYPE product_type_enum AS ENUM (
    'simple',
    'variable'
);

CREATE TYPE person_type_enum AS ENUM (
    'PF',
    'PJ'
);

CREATE TYPE address_type_enum AS ENUM (
    'billing',
    'shipping',
    'both'
);

CREATE TYPE coupon_discount_type_enum AS ENUM (
    'percentage',
    'fixed_amount',
    'free_shipping'
);

CREATE TYPE order_status_enum AS ENUM (
    'pending_payment',
    'payment_confirmed',
    'artwork_review',
    'artwork_rejected',
    'in_production',
    'ready_for_dispatch',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);

CREATE TYPE payment_method_enum AS ENUM (
    'pix',
    'credit_card',
    'boleto',
    'manual'
);

CREATE TYPE payment_status_enum AS ENUM (
    'unpaid',
    'paid',
    'refused',
    'refunded'
);

CREATE TYPE artwork_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- ============================================================================
-- 2. TABELA CENTRAL DE INQUILINOS (TENANTS)
-- ============================================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    custom_domain VARCHAR(255) UNIQUE,
    domain_verified BOOLEAN NOT NULL DEFAULT false,
    primary_color VARCHAR(20) NOT NULL DEFAULT '#0052B4',
    secondary_color VARCHAR(20) NOT NULL DEFAULT '#FFD100',
    logo_url TEXT,
    settings_json JSONB NOT NULL DEFAULT '{
        "currency": "BRL",
        "tax_rate": 0,
        "free_shipping_min_amount": null,
        "whatsapp_phone": "",
        "b2b_cta_enabled": true
    }'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_custom_domain ON tenants (custom_domain) WHERE custom_domain IS NOT NULL;

-- ============================================================================
-- 3. USUÁRIOS & CONTROLE DE ACESSO (USERS)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'staff',
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Super admins não possuem tenant_id, lojistas e funcionários possuem obrigatoriamente
    CONSTRAINT chk_user_tenant_role CHECK (
        (role = 'super_admin' AND tenant_id IS NULL) OR
        (role IN ('tenant_owner', 'staff') AND tenant_id IS NOT NULL)
    )
);

-- Unicidade de email por loja (para donos e staff) e global para super_admin
CREATE UNIQUE INDEX uq_users_tenant_email ON users (tenant_id, email) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX uq_users_superadmin_email ON users (email) WHERE tenant_id IS NULL;
CREATE INDEX idx_users_tenant_role ON users (tenant_id, role);

-- ============================================================================
-- 4. INTEGRAÇÕES POR INQUILINO (TENANT_INTEGRATIONS)
-- ============================================================================
CREATE TABLE tenant_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider integration_provider_enum NOT NULL,
    category integration_category_enum NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    credentials_encrypted TEXT,
    config_json JSONB NOT NULL DEFAULT '{
        "sandbox": false,
        "webhook_secret": "",
        "origin_postal_code": "",
        "max_installments": 12
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_tenant_provider UNIQUE (tenant_id, provider)
);

CREATE INDEX idx_tenant_integrations_tenant_category ON tenant_integrations (tenant_id, category);

-- ============================================================================
-- 5. CATEGORIAS DE PRODUTOS (CATEGORIES)
-- ============================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_categories_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_categories_tenant_parent ON categories (tenant_id, parent_id);
CREATE INDEX idx_categories_tenant_order ON categories (tenant_id, display_order);

-- ============================================================================
-- 6. PRODUTOS (PRODUCTS)
-- ============================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_type product_type_enum NOT NULL DEFAULT 'simple',
    description TEXT,
    short_description TEXT,
    base_price NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
    compare_at_price NUMERIC(12, 2) CHECK (compare_at_price IS NULL OR compare_at_price >= base_price),
    cost_price NUMERIC(12, 2) CHECK (cost_price IS NULL OR cost_price >= 0),
    
    -- Dimensões e cubagem física para cálculo de frete (Melhor Envio / Correios)
    weight_grams INT NOT NULL DEFAULT 300 CHECK (weight_grams > 0),
    length_cm INT NOT NULL DEFAULT 16 CHECK (length_cm > 0),
    width_cm INT NOT NULL DEFAULT 12 CHECK (width_cm > 0),
    height_cm INT NOT NULL DEFAULT 10 CHECK (height_cm > 0),

    -- Badges Pop-Art e visibilidade
    badge_label VARCHAR(50), -- Ex: 'Mais Vendido', 'HOT', 'Kit Corporativo'
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Configurações industriais de personalização
    enable_text_customization BOOLEAN NOT NULL DEFAULT false,
    text_customization_label VARCHAR(255) DEFAULT 'Nome ou Frase para Personalizar',
    text_max_length INT NOT NULL DEFAULT 40 CHECK (text_max_length > 0),
    
    enable_artwork_upload BOOLEAN NOT NULL DEFAULT false,
    upload_max_size_mb INT NOT NULL DEFAULT 10 CHECK (upload_max_size_mb > 0),
    allowed_upload_formats TEXT[] NOT NULL DEFAULT ARRAY['png', 'jpg', 'jpeg', 'svg', 'pdf'],
    
    production_lead_time_days INT NOT NULL DEFAULT 0 CHECK (production_lead_time_days >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_products_tenant_slug UNIQUE (tenant_id, slug),
    CONSTRAINT uq_products_tenant_sku UNIQUE (tenant_id, sku)
);

CREATE INDEX idx_products_tenant_category ON products (tenant_id, category_id);
CREATE INDEX idx_products_tenant_active_featured ON products (tenant_id, is_active, is_featured);
CREATE INDEX idx_products_tenant_created ON products (tenant_id, created_at DESC);

-- ============================================================================
-- 7. VARIANTES DE PRODUTOS (PRODUCT_VARIANTES)
-- ============================================================================
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL, -- Ex: "Camiseta Personalizada - Tamanho GG"
    attribute_options JSONB NOT NULL DEFAULT '{}'::jsonb, -- Ex: {"tamanho": "GG", "cor": "Preto"}
    price_modifier NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    final_price NUMERIC(12, 2) NOT NULL CHECK (final_price >= 0),
    stock_quantity INT, -- Null para produtos sem controle de estoque físico
    weight_grams INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_variants_tenant_sku UNIQUE (tenant_id, sku)
);

CREATE INDEX idx_variants_tenant_product ON product_variants (tenant_id, product_id);

-- ============================================================================
-- 8. FAIXAS PROGRESSIVAS DE ATACADO (PRODUCT_WHOLESALE_TIERS)
-- ============================================================================
CREATE TABLE product_wholesale_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INT NOT NULL CHECK (min_quantity >= 1),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_tiers_tenant_product_qty UNIQUE (tenant_id, product_id, min_quantity)
);

CREATE INDEX idx_tiers_tenant_product ON product_wholesale_tiers (tenant_id, product_id, min_quantity);

-- ============================================================================
-- 9. CLIENTES BRASIL (CUSTOMERS)
-- ============================================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    person_type person_type_enum NOT NULL DEFAULT 'PF',
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    tax_id VARCHAR(30) NOT NULL, -- CPF ou CNPJ formatado ou limpo
    state_tax_id VARCHAR(50), -- Inscrição Estadual (PJ)
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL, -- WhatsApp / Celular
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_customers_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT uq_customers_tenant_tax_id UNIQUE (tenant_id, tax_id)
);

CREATE INDEX idx_customers_tenant_name ON customers (tenant_id, full_name);

-- ============================================================================
-- 10. ENDEREÇOS BRASILEIROS (CUSTOMER_ADDRESSES)
-- ============================================================================
CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_type address_type_enum NOT NULL DEFAULT 'shipping',
    postal_code VARCHAR(20) NOT NULL, -- CEP (00000-000)
    street VARCHAR(255) NOT NULL,
    number VARCHAR(50) NOT NULL,
    complement VARCHAR(255),
    neighborhood VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL, -- UF (SP, RJ, MG, etc.)
    country VARCHAR(2) NOT NULL DEFAULT 'BR',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_addresses_tenant_customer ON customer_addresses (tenant_id, customer_id);

-- ============================================================================
-- 11. CUPONS DE DESCONTO (COUPONS)
-- ============================================================================
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    discount_type coupon_discount_type_enum NOT NULL,
    discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    max_uses INT,
    used_count INT NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_coupons_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_coupons_tenant_code_active ON coupons (tenant_id, code, is_active);

-- ============================================================================
-- 12. PEDIDOS (ORDERS)
-- ============================================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status order_status_enum NOT NULL DEFAULT 'pending_payment',
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    
    -- Totais financeiros
    items_subtotal NUMERIC(12, 2) NOT NULL CHECK (items_subtotal >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),

    -- Dados do Pagamento
    payment_method payment_method_enum NOT NULL,
    payment_provider VARCHAR(50), -- 'infinitepay', 'mercadopago'
    payment_transaction_id VARCHAR(255),
    payment_status payment_status_enum NOT NULL DEFAULT 'unpaid',
    pix_qr_code_url TEXT,
    pix_copy_paste_code TEXT,
    pix_expiration_date TIMESTAMPTZ,
    installments INT NOT NULL DEFAULT 1,

    -- Dados Logísticos e Frete
    shipping_provider VARCHAR(50), -- 'melhorenvio', 'correios'
    shipping_service_name VARCHAR(100), -- 'SEDEX', 'Jadlog .Package'
    shipping_tracking_code VARCHAR(100),
    shipping_label_url TEXT,
    
    -- Prazos industriais
    estimated_production_days INT NOT NULL DEFAULT 0,
    estimated_delivery_date DATE,

    -- Snapshots imutáveis de endereço e cliente no momento da compra
    customer_snapshot JSONB NOT NULL,
    shipping_address_snapshot JSONB NOT NULL,
    billing_address_snapshot JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_orders_tenant_number UNIQUE (tenant_id, order_number)
);

CREATE INDEX idx_orders_tenant_status ON orders (tenant_id, status);
CREATE INDEX idx_orders_tenant_customer ON orders (tenant_id, customer_id);
CREATE INDEX idx_orders_tenant_created ON orders (tenant_id, created_at DESC);
CREATE INDEX idx_orders_tenant_tracking ON orders (tenant_id, shipping_tracking_code) WHERE shipping_tracking_code IS NOT NULL;

-- ============================================================================
-- 13. ITENS DO PEDIDO (ORDER_ITEMS) COM PERSONALIZAÇÃO
-- ============================================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity >= 1),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),

    -- Metadados de Personalização do Cliente
    custom_text VARCHAR(255),
    artwork_url TEXT,
    artwork_filename VARCHAR(255),
    artwork_status artwork_status_enum NOT NULL DEFAULT 'pending',
    artwork_rejection_reason TEXT,
    production_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_tenant_order ON order_items (tenant_id, order_id);

-- ============================================================================
-- 14. EVENTOS, WEBHOOKS & AUDITORIA DE PEDIDOS (ORDER_EVENTS)
-- ============================================================================
CREATE TABLE order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'webhook_received', 'status_changed', 'artwork_approved', 'tracking_updated'
    source VARCHAR(50) NOT NULL, -- 'infinitepay', 'melhorenvio', 'admin', 'system'
    description TEXT NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_events_tenant_order ON order_events (tenant_id, order_id, created_at DESC);

-- ============================================================================
-- 15. GESTÃO DE MENUS E NAVEGAÇÃO MULTI-TENANT (NAVIGATION_MENU_ITEMS)
-- ============================================================================
CREATE TABLE navigation_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES navigation_menu_items(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    target_blank BOOLEAN NOT NULL DEFAULT false,
    badge_text VARCHAR(30), -- Ex: 'HOT', 'NOVO'
    badge_color VARCHAR(20) DEFAULT 'yellow',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nav_items_tenant_parent_order ON navigation_menu_items (tenant_id, parent_id, display_order);

-- ============================================================================
-- 16. BANNERS & APARÊNCIA DO HERO (STOREFRONT_BANNERS)
-- ============================================================================
CREATE TABLE storefront_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    badge_1 VARCHAR(100),
    badge_2 VARCHAR(100),
    title_prefix VARCHAR(150),
    title_highlight VARCHAR(150) NOT NULL,
    title_suffix VARCHAR(150),
    description TEXT,
    btn_1_text VARCHAR(100),
    btn_1_url VARCHAR(500),
    btn_2_text VARCHAR(100),
    btn_2_url VARCHAR(500),
    highlight_1 VARCHAR(150),
    highlight_2 VARCHAR(150),
    highlight_3 VARCHAR(150),
    banner_image_url TEXT NOT NULL,
    config_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_banners_tenant_active ON storefront_banners (tenant_id, is_active);

-- ============================================================================
-- 17. TRIGGER AUTOMÁTICO DE ATUALIZAÇÃO (UPDATED_AT)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_tenants BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_tenant_integrations BEFORE UPDATE ON tenant_integrations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_categories BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_products BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_product_variants BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_product_wholesale_tiers BEFORE UPDATE ON product_wholesale_tiers FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_customer_addresses BEFORE UPDATE ON customer_addresses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_coupons BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_navigation_menu_items BEFORE UPDATE ON navigation_menu_items FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_storefront_banners BEFORE UPDATE ON storefront_banners FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 18. SUPORTE OPCIONAL A ROW LEVEL SECURITY (RLS) NO POSTGRESQL
-- ============================================================================
-- Para habilitar isolamento criptográfico por sessão no PostgreSQL em stacks Node/Go:
-- SET LOCAL app.current_tenant_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
--
-- Exemplo de política de RLS em Products:
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_policy ON products
--     FOR ALL
--     USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
