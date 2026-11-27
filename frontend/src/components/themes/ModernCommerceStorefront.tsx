"use client";

import React from "react";
import Link from "next/link";
import { TenantInfo, ProductItem } from "@/lib/api";
import { useStorefrontState } from "@/lib/useStorefrontState";
import InteractiveHeroBanner from "@/components/InteractiveHeroBanner";
import CartDrawer from "@/components/CartDrawer";
import CustomerAccountMenu from "@/components/CustomerAccountMenu";
import {
  StorefrontTopBar,
  StorefrontHero,
  StorefrontBenefitsBar,
  StorefrontHowItWorks,
  StorefrontBottomCta,
  StorefrontFooter,
} from "@/components/storefront/StorefrontHomeSections";
import {
  FiSearch,
  FiUser,
  FiShoppingCart,
  FiTruck,
  FiPercent,
  FiShield,
  FiZap,
  FiArrowRight,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiCheck,
  FiPlus,
  FiMessageSquare,
} from "react-icons/fi";

interface ModernCommerceStorefrontProps {
  tenant: TenantInfo | null;
  products?: ProductItem[];
  categories?: any[];
}

export default function ModernCommerceStorefront({
  tenant,
  products = [],
  categories = [],
}: ModernCommerceStorefrontProps) {
  const state = useStorefrontState({ tenant, products, categories, initialPageSize: 12 });
  const categoriesRef = React.useRef<HTMLDivElement | null>(null);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoriesRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      categoriesRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div
      data-ui-version="modern-v2"
      data-theme-variant="modern_commerce"
      style={state.cssVariables}
      className="min-h-screen flex flex-col bg-[var(--brand-bg,#F8FAFC)] text-slate-900 font-sans selection:bg-[var(--brand-primary)] selection:text-[var(--brand-text-on-primary)]"
    >
      {/* 1. TOP BAR DINÂMICA */}
      <StorefrontTopBar config={state.homeConfig} theme="modern_commerce" />

      {/* 2. HEADER ESTRUTURADO MODERNO COM GLASSMORPHISM */}
      <header className="storefront-glass-header border-b border-slate-200/75 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sm:gap-8">
          {/* Logo da Loja */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group py-0.5">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={state.storeName}
                style={{ maxHeight: `${state.homeConfig.header.logoMaxHeightPx}px` }}
                className="w-auto max-w-[220px] sm:max-w-[260px] object-contain transition-all"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm"
                >
                  <FiZap className="w-4 h-4" />
                </div>
                <span className="font-heading text-lg sm:text-xl font-bold tracking-tight text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">
                  {state.storeName}
                </span>
              </div>
            )}
          </Link>

          {/* Campo de Busca Expandido com Botão Integrado */}
          <div className="hidden md:flex flex-1 max-w-lg items-center relative">
            <input
              type="text"
              placeholder={state.homeConfig.header.searchPlaceholder}
              value={state.searchQuery}
              onChange={(e) => state.setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-11 py-2.5 text-xs bg-slate-50 border border-slate-300/80 rounded-xl focus:outline-none focus:bg-white focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              className="absolute right-2 p-1.5 rounded-lg text-slate-500 hover:text-[var(--color-primary)] transition-colors"
            >
              <FiSearch className="w-4 h-4" />
            </button>
          </div>

          {/* Botões de Ação: Conta e Carrinho */}
          <div className="flex items-center gap-3">
            <CustomerAccountMenu activeTheme="modern_commerce" />

            <button
              type="button"
              onClick={() => state.setIsCartOpen(true)}
              className="storefront-cta-btn flex items-center gap-2.5 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
              title="Abrir carrinho"
            >
              <div className="relative">
                <FiShoppingCart className="w-4 h-4" />
                {state.cartCount > 0 && (
                  <span
                    style={{
                      backgroundColor: "var(--brand-secondary)",
                      color: "var(--brand-text-on-secondary)",
                    }}
                    className="absolute -top-1.5 -right-2 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm"
                  >
                    {state.cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Meu Carrinho</span>
            </button>
          </div>
        </div>

        {/* 3. MENU DE NAVEGAÇÃO HORIZONTAL (2 NÍVEIS) */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 sm:px-6 relative z-30">
          <div className="max-w-7xl mx-auto flex items-center text-xs font-semibold text-slate-600 gap-x-6 gap-y-2 flex-wrap py-2.5 overflow-visible">
            {(state.navigationItems.length > 0
              ? state.navigationItems
              : [
                  { id: "def-1", label: "Catálogo Completo", url: "/#catalogo", type: "custom_link", children: [] },
                  { id: "def-2", label: "Canecas", url: "/#catalogo?categoria=canecas", type: "category", children: [] },
                  { id: "def-3", label: "Camisetas", url: "/#catalogo?categoria=camisetas", type: "category", children: [] },
                  { id: "def-4", label: "Kits Corporativos", url: "/#catalogo?categoria=kits-corporativos", type: "category", children: [] },
                  { id: "def-5", label: "Squeezes", url: "/#catalogo?categoria=squeezes-e-termicas", type: "category", children: [] },
                ]
            ).map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isOpen = state.activeDropdown === item.id;

              if (!hasChildren) {
                return (
                  <Link
                    key={item.id}
                    href={item.url}
                    className="hover:text-[var(--color-primary)] transition-colors py-1 whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <div
                  key={item.id}
                  className="relative whitespace-nowrap"
                  onMouseEnter={() => state.setActiveDropdown(item.id)}
                  onMouseLeave={() => state.setActiveDropdown(null)}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors py-1 cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <FiChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50">
                      {item.children.map((sub: any) => (
                        <Link
                          key={sub.id}
                          href={sub.url}
                          className="block px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-[var(--color-primary)] hover:bg-slate-50 rounded-xl transition-colors"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* 4. HERO BANNER DINÂMICO */}
      <StorefrontHero config={state.homeConfig} bannerData={state.bannerData} whatsapp={state.whatsapp} theme="modern_commerce" />

      {/* 5. BARRA DE BENEFÍCIOS DINÂMICA */}
      <StorefrontBenefitsBar config={state.homeConfig} theme="modern_commerce" />

      {/* 6. CATEGORIAS COM THUMBNAILS CIRCULARES E SCROLL SUAVE (SEM SCROLLBAR FEIA) */}
      {state.categories && state.categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 w-full">
          <div className="flex justify-between items-end mb-3.5">
            <div>
              <h3 className="font-heading text-base font-bold text-slate-900">Explore por Categoria</h3>
              <p className="text-xs text-slate-500 mt-0.5">Selecione para filtrar os produtos da vitrine</p>
            </div>

            <div className="flex items-center gap-2">
              {state.selectedCategory && (
                <button
                  type="button"
                  onClick={() => state.setSelectedCategory(null)}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline mr-1"
                >
                  Ver todas
                </button>
              )}

              {/* Botões de Rolagem Suave */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollCategories("left")}
                  className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Rolar categorias para a esquerda"
                  aria-label="Rolar para esquerda"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategories("right")}
                  className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Rolar categorias para a direita"
                  aria-label="Rolar para direita"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={categoriesRef}
            className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {state.categories.map((cat: any) => {
              const isSelected = state.selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id || cat.slug}
                  type="button"
                  onClick={() => state.setSelectedCategory(isSelected ? null : cat.slug)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-full border shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                      : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm text-slate-700"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/60">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">🏷️</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. VITRINE DE PRODUTOS MODERN COMMERCE */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-200/80">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-900">
              Produtos Mais Procurados
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {state.visibleProducts.length} itens exibidos • Alta qualidade de acabamento
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              Total no catálogo: {state.totalCount}
            </span>
          </div>
        </div>

        {/* Grade de Cards de Alta Conversão */}
        {state.visibleProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm font-medium text-slate-600">Nenhum produto encontrado.</p>
            <button
              type="button"
              onClick={() => {
                state.setSearchQuery("");
                state.setSelectedCategory(null);
              }}
              className="mt-3 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {state.visibleProducts.map((prod: any) => {
              const wholesaleTag = state.getWholesaleBadge(prod);
              const imgUrl = prod.image_url || prod.img || "/themes/neo_brutalist/caneca-prod-large.png";

              return (
                <div
                  key={prod.id}
                  className="storefront-card-interactive group rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem em aspect-square no topo do card */}
                    <Link
                      href={`/produto/${prod.slug}`}
                      className="block relative aspect-square w-full bg-slate-50/80 p-3 overflow-hidden"
                    >
                      <img
                        src={imgUrl}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />

                      {/* Badge Pill com --brand-secondary */}
                      {prod.badge_label && (
                        <span
                          style={{
                            backgroundColor: "var(--brand-secondary)",
                            color: "var(--brand-text-on-secondary)",
                          }}
                          className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm"
                        >
                          {prod.badge_label}
                        </span>
                      )}

                      {/* Prazo de Produção no Canto Inferior */}
                      {prod.production_lead_time_days > 0 && (
                        <span className="absolute bottom-2.5 right-2.5 text-[10px] font-semibold bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded-md">
                          {prod.production_lead_time_days}d úteis
                        </span>
                      )}
                    </Link>

                    {/* Informações do Produto */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono uppercase">{prod.sku || "Personalizado"}</span>
                        <div className="flex items-center text-amber-500 gap-0.5">
                          <FiStar className="w-3 h-3 fill-amber-400" />
                          <span className="font-bold text-slate-600">5.0</span>
                        </div>
                      </div>

                      <Link href={`/produto/${prod.slug}`}>
                        <h3 className="font-heading text-sm font-bold text-slate-900 group-hover:text-[var(--brand-primary)] line-clamp-2 transition-colors">
                          {prod.name}
                        </h3>
                      </Link>

                      {wholesaleTag ? (
                        <span
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
                            color: "var(--brand-primary)",
                          }}
                          className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md"
                        >
                          {wholesaleTag}
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] text-slate-400">
                          Preço sob demanda
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preço e Botão de Ação Full-Width */}
                  <div className="p-4 pt-0 space-y-3">
                    <div className="flex items-baseline justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-xs text-slate-500">Unitário a partir de</span>
                      <span className="font-heading text-base font-black text-slate-900">
                        R$ {state.formatPrice(prod.base_price || prod.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => state.handleQuickAddToCart(e, prod)}
                      className="storefront-cta-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Adicionar / Comprar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botão Carregar Mais Produtos */}
        {state.hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={state.loadMore}
              className="px-8 py-3 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Carregar mais produtos (+12)</span>
              <FiArrowRight className="w-4 h-4 text-[var(--color-primary)]" />
            </button>
          </div>
        )}
      </section>

      {/* 8. SEÇÃO: PASSO A PASSO SIMPLIFICADO */}
      <StorefrontHowItWorks config={state.homeConfig} theme="modern_commerce" />

      {/* 9. CTA CORPORATIVO / FECHAMENTO */}
      <StorefrontBottomCta config={state.homeConfig} whatsapp={state.whatsapp} />

      {/* 10. RODAPÉ DINÂMICO */}
      <StorefrontFooter
        config={state.homeConfig}
        storeName={state.storeName}
        logoUrl={tenant?.logo_url}
      />

      {/* GAVETA DO CARRINHO */}
      <CartDrawer
        isOpen={state.isCartOpen}
        onClose={() => state.setIsCartOpen(false)}
        tenant={tenant}
      />
    </div>
  );
}
