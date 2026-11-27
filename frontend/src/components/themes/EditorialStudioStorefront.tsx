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
  FiArrowRight,
  FiChevronDown,
  FiCheck,
  FiPlus,
  FiMessageSquare,
} from "react-icons/fi";

interface EditorialStudioStorefrontProps {
  tenant: TenantInfo | null;
  products?: ProductItem[];
  categories?: any[];
}

export default function EditorialStudioStorefront({
  tenant,
  products = [],
  categories = [],
}: EditorialStudioStorefrontProps) {
  const state = useStorefrontState({ tenant, products, categories, initialPageSize: 12 });

  return (
    <div
      data-ui-version="modern-v2"
      data-theme-variant="editorial_studio"
      style={state.cssVariables}
      className="min-h-screen flex flex-col bg-[var(--brand-bg,#FCFCFD)] text-neutral-900 font-sans selection:bg-[var(--brand-primary)] selection:text-[var(--brand-text-on-primary)]"
    >
      {/* 1. TOP BAR REFINADA & EDITORIAL */}
      <StorefrontTopBar config={state.homeConfig} theme="editorial_studio" />

      {/* 2. HEADER EDITORIAL ESPAÇADO COM GLASSMORPHISM */}
      <header className="storefront-glass-header border-b border-neutral-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between gap-8">
          {/* Logo da Marca */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group py-0.5">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={state.storeName}
                style={{ maxHeight: `${state.homeConfig.header.logoMaxHeightPx}px` }}
                className="w-auto max-w-[220px] sm:max-w-[260px] object-contain transition-all"
              />
            ) : (
              <div className="flex flex-col">
                <span className="font-heading text-xl sm:text-2xl font-black tracking-widest text-neutral-900 uppercase">
                  {state.storeName}
                </span>
                <span className="text-[9px] font-bold tracking-[0.25em] text-neutral-400 uppercase">
                  Studio & Catálogo
                </span>
              </div>
            )}
          </Link>

          {/* Campo de Busca Minimalista */}
          <div className="hidden md:flex flex-1 max-w-sm items-center relative">
            <FiSearch className="absolute left-3 text-neutral-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder={state.homeConfig.header.searchPlaceholder}
              value={state.searchQuery}
              onChange={(e) => state.setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50/80 border-b border-neutral-300 focus:border-neutral-900 focus:bg-white focus:outline-none transition-all placeholder:text-neutral-400"
            />
          </div>

          {/* Ações da Loja */}
          <div className="flex items-center gap-4">
            <CustomerAccountMenu activeTheme="editorial_studio" />

            <button
              type="button"
              onClick={() => state.setIsCartOpen(true)}
              className="storefront-cta-btn flex items-center gap-2 text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg cursor-pointer"
            >
              <FiShoppingCart className="w-3.5 h-3.5" />
              <span>Sacola ({state.cartCount})</span>
            </button>
          </div>
        </div>

        {/* 3. MENU DE NAVEGAÇÃO SUPERIOR */}
        <div className="border-t border-neutral-100 px-4 sm:px-8 relative z-30">
          <div className="max-w-7xl mx-auto flex items-center text-xs tracking-wider uppercase font-medium text-neutral-600 gap-x-8 gap-y-2 flex-wrap py-2.5 overflow-visible">
            {(state.navigationItems.length > 0
              ? state.navigationItems
              : [
                  { id: "def-1", label: "Catálogo Geral", url: "/#catalogo", type: "custom_link", children: [] },
                  { id: "def-2", label: "Canecas & Térmicas", url: "/#catalogo?categoria=canecas", type: "category", children: [] },
                  { id: "def-3", label: "Vestuário", url: "/#catalogo?categoria=camisetas", type: "category", children: [] },
                  { id: "def-4", label: "Kits Corporativos", url: "/#catalogo?categoria=kits-corporativos", type: "category", children: [] },
                  { id: "def-5", label: "Escritório & Laser", url: "/#catalogo?categoria=squeezes-e-termicas", type: "category", children: [] },
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
                    <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-white border border-neutral-200 rounded-lg shadow-xl p-2 z-50">
                      {item.children.map((sub: any) => (
                        <Link
                          key={sub.id}
                          href={sub.url}
                          className="block px-3 py-2 text-xs text-neutral-700 hover:text-[var(--color-primary)] hover:bg-neutral-50 rounded transition-colors"
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
      <StorefrontHero config={state.homeConfig} bannerData={state.bannerData} whatsapp={state.whatsapp} theme="editorial_studio" />

      {/* 5. PILARES & BENEFÍCIOS DINÂMICOS */}
      <StorefrontBenefitsBar config={state.homeConfig} theme="editorial_studio" />

      {/* 6. CATEGORIAS EM FORMATO EDITORIAL */}
      {state.categories && state.categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full">
          <div className="flex justify-between items-baseline mb-6">
            <div>
              <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-neutral-400 block">
                Coleções
              </span>
              <h3 className="font-heading text-lg font-bold text-neutral-900">Navegue por Categoria</h3>
            </div>
            {state.selectedCategory && (
              <button
                type="button"
                onClick={() => state.setSelectedCategory(null)}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Limpar seleção
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {state.categories.map((cat: any) => {
              const isSelected = state.selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id || cat.slug}
                  type="button"
                  onClick={() => state.setSelectedCategory(isSelected ? null : cat.slug)}
                  className={`group p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <div className="aspect-square w-full rounded-lg bg-neutral-100 overflow-hidden mb-2.5">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        🏷️
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold tracking-tight line-clamp-1">{cat.name}</h4>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. VITRINE DE PRODUTOS EDITORIAL COM IMAGEM ASPECT-[4/5] */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-8 py-10 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8 pb-4 border-b border-neutral-200">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-neutral-400 block">
              Catálogo Selecionado
            </span>
            <h2 className="font-heading text-2xl font-bold text-neutral-900">
              Produtos & Presentes Sob Demanda
            </h2>
          </div>

          <span className="text-xs text-neutral-500">
            {state.visibleProducts.length} de {state.totalCount} itens disponíveis
          </span>
        </div>

        {/* Grade com respiro amplo (gap-6 / gap-8) e imagens aspect-[4/5] */}
        {state.visibleProducts.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-xl border border-neutral-200">
            <p className="text-sm font-medium text-neutral-600">Nenhum produto encontrado nesta busca.</p>
            <button
              type="button"
              onClick={() => {
                state.setSearchQuery("");
                state.setSelectedCategory(null);
              }}
              className="mt-4 text-xs font-semibold text-[var(--color-primary)] hover:underline uppercase tracking-wider"
            >
              Redefinir Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {state.visibleProducts.map((prod: any) => {
              const wholesaleTag = state.getWholesaleBadge(prod);
              const imgUrl = prod.image_url || prod.img || "/themes/neo_brutalist/caneca-prod-large.png";

              return (
                <div
                  key={prod.id}
                  className="storefront-card-interactive group rounded-xl p-3 border border-neutral-200/70 flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem Vertical Retrato aspect-[4/5] */}
                    <Link
                      href={`/produto/${prod.slug}`}
                      className="block relative aspect-[4/5] w-full rounded-lg bg-neutral-100/70 p-4 overflow-hidden border border-neutral-200/50 transition-colors"
                    >
                      <img
                        src={imgUrl}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />

                      {/* Badge Sutil com --brand-secondary */}
                      {prod.badge_label && (
                        <span
                          style={{
                            backgroundColor: "var(--brand-secondary)",
                            color: "var(--brand-text-on-secondary)",
                          }}
                          className="absolute top-3 left-3 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase shadow-sm"
                        >
                          {prod.badge_label}
                        </span>
                      )}
                    </Link>

                    {/* Informações Elegantes e Espaçadas */}
                    <div className="pt-3.5 space-y-1">
                      <span className="text-[10px] tracking-widest uppercase font-mono text-neutral-400 block">
                        {prod.sku || "Custom"}
                      </span>

                      <Link href={`/produto/${prod.slug}`}>
                        <h3 className="font-heading text-sm font-bold text-neutral-900 group-hover:text-[var(--brand-primary)] line-clamp-2 transition-colors">
                          {prod.name}
                        </h3>
                      </Link>

                      {wholesaleTag && (
                        <p className="text-[11px] font-medium text-[var(--brand-primary)] pt-0.5">
                          {wholesaleTag}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preço e Botão Discreto com Destaque no Hover */}
                  <div className="pt-3 space-y-2.5">
                    <div className="flex items-baseline justify-between border-t border-neutral-100 pt-2">
                      <span className="text-[11px] text-neutral-400 uppercase tracking-wider">A partir de</span>
                      <span className="font-heading text-base font-bold text-neutral-900">
                        R$ {state.formatPrice(prod.base_price || prod.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => state.handleQuickAddToCart(e, prod)}
                      className="storefront-cta-btn w-full py-2.5 px-4 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                      <span>Adicionar à Sacola</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botão Carregar Mais Produtos */}
        {state.hasMore && (
          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={state.loadMore}
              className="px-8 py-3 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold tracking-wider uppercase shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Ver mais produtos (+12)</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* 8. SEÇÃO: PASSO A PASSO SIMPLIFICADO */}
      <StorefrontHowItWorks config={state.homeConfig} theme="editorial_studio" />

      {/* 9. CTA B2B EDITORIAL */}
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
