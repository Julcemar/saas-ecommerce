"use client";

import React from "react";
import Link from "next/link";
import { TenantInfo, ProductItem } from "@/lib/api";
import { useStorefrontState } from "@/lib/useStorefrontState";
import InteractiveHeroBanner from "@/components/InteractiveHeroBanner";
import CartDrawer from "@/components/CartDrawer";
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
      style={state.cssVariables}
      className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[var(--color-primary)] selection:text-white"
    >
      {/* 1. TOP BAR DE ALTA CONVERSÃO */}
      <div
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
        }}
        className="text-[11px] font-medium py-1.5 px-4 shadow-xs"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Frete & Atacado
            </span>
            <span>Descontos progressivos automáticos por quantidade no carrinho!</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`https://wa.me/${state.whatsapp}?text=Olá,%20gostaria%20de%20tirar%20dúvidas%20sobre%20um%20pedido.`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1 font-semibold"
            >
              Suporte WhatsApp
            </a>
            <span className="opacity-40">|</span>
            <Link href="/admin" className="hover:underline opacity-90">
              Painel do Lojista
            </Link>
          </div>
        </div>
      </div>

      {/* 2. HEADER ESTRUTURADO MODERNO */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sm:gap-8">
          {/* Logo da Loja */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group py-0.5">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={state.storeName}
                className="h-11 sm:h-12 md:h-14 w-auto max-w-[220px] sm:max-w-[260px] object-contain transition-all"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs"
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
              placeholder="Buscar canecas, camisetas, squeezes corporativos..."
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
            <Link
              href="/admin/login"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <FiUser className="w-4 h-4" />
              <span>Entrar</span>
            </Link>

            <button
              type="button"
              onClick={() => state.setIsCartOpen(true)}
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
              }}
              className="flex items-center gap-2.5 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:opacity-95 active:scale-98 transition-all cursor-pointer"
              title="Abrir carrinho"
            >
              <div className="relative">
                <FiShoppingCart className="w-4 h-4" />
                {state.cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
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

      {/* 4. HERO BANNER LARGURA TOTAL (FULL-WIDTH) */}
      <div className="w-full">
        <InteractiveHeroBanner banner={state.bannerData} />
      </div>

      {/* 5. BARRA DE BENEFÍCIOS ESTRUTURADA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FiZap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">Produção Ágil</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Despacho em até 48h úteis</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <FiPercent className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">Desconto no Atacado</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Tabela progressiva no carrinho</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FiTruck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">Entrega Garantida</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Sedex, PAC e Jadlog</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FiShield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">Prévia Digital Grátis</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Você aprova antes da gravação</p>
            </div>
          </div>
        </div>
      </section>

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
                  className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Rolar categorias para a esquerda"
                  aria-label="Rolar para esquerda"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategories("right")}
                  className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
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
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-xs"
                      : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs text-slate-700"
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
                  className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem em aspect-square no topo do card */}
                    <Link
                      href={`/produto/${prod.slug}`}
                      className="block relative aspect-square w-full bg-slate-50 p-2.5 overflow-hidden"
                    >
                      <img
                        src={imgUrl}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />

                      {/* Badge Pill Translúcido Flutuante */}
                      {prod.badge_label && (
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-slate-800 border border-slate-200/60 shadow-xs">
                          🔥 {prod.badge_label}
                        </span>
                      )}

                      {/* Prazo de Produção no Canto Inferior */}
                      {prod.production_lead_time_days > 0 && (
                        <span className="absolute bottom-2 right-2 text-[10px] font-semibold bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded-md">
                          ⏱ {prod.production_lead_time_days}d
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
                        <h3 className="font-heading text-sm font-bold text-slate-900 group-hover:text-[var(--color-primary)] line-clamp-2 transition-colors">
                          {prod.name}
                        </h3>
                      </Link>

                      {wholesaleTag ? (
                        <span className="inline-block text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
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
                      style={{
                        backgroundColor: "var(--color-primary)",
                        color: "var(--color-primary-foreground)",
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
              className="px-8 py-3 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-2xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Carregar mais produtos (+12)</span>
              <FiArrowRight className="w-4 h-4 text-[var(--color-primary)]" />
            </button>
          </div>
        )}
      </section>

      {/* 8. SEÇÃO: PROCESSO DE COMPRA E PERSONALIZAÇÃO */}
      <section className="bg-white border-y border-slate-200/80 py-12 px-4 sm:px-6 my-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h3 className="font-heading text-xl font-bold text-slate-900">Passo a passo simplificado</h3>
            <p className="text-xs text-slate-500 mt-1">Veja como seu pedido é produzido com máxima fidelidade</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-bold text-slate-900">Seleção no Catálogo</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Adicione ao carrinho as quantidades necessárias com desconto progressivo.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-bold text-slate-900">Envio da Sua Marca</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Faça o upload do seu vetor (PDF, EPS, PNG) ou informe as frases desejadas.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="text-xs font-bold text-slate-900">Validação da Arte</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apresentamos uma prévia virtual para sua autorização antes de iniciar.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h4 className="text-xs font-bold text-slate-900">Despacho Rastreado</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Embalagem cuidadosa e transporte ágil com código de rastreamento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CTA B2B DE ALTA CONVERSÃO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full mb-8">
        <div
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
          }}
          className="p-8 sm:p-10 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div className="space-y-2 max-w-xl">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider inline-block">
              Vendas Corporativas & Tiragens Especiais
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-bold leading-tight">
              Precisa de orçamento corporativo faturado para sua empresa?
            </h3>
            <p className="text-xs opacity-90 leading-relaxed">
              Atendemos campanhas de endomarketing, brindes de fim de ano e eventos corporativos com condições exclusivas no atacado.
            </p>
          </div>

          <a
            href={`https://wa.me/${state.whatsapp}?text=Olá,%20gostaria%20de%20um%20orçamento%20B2B%20faturado.`}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs uppercase shadow-sm shrink-0 transition-all flex items-center gap-2"
          >
            <FiMessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Solicitar Cotação B2B</span>
          </a>
        </div>
      </section>

      {/* 10. RODAPÉ COMPLETO & MODERNO */}
      <footer className="bg-white border-t border-slate-200 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <span className="font-heading text-sm font-bold text-slate-900 uppercase">
              {state.storeName}
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Soluções completas em personalização e presentes corporativos de alto padrão com despacho para todo o Brasil.
            </p>
            <div className="text-[10px] text-slate-400">
              CNPJ Ativo • Atendimento Direto
            </div>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Catálogo
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#catalogo" className="hover:text-[var(--color-primary)]">Mais Vendidos</a></li>
              <li><Link href="/carrinho" className="hover:text-[var(--color-primary)]">Carrinho de Compras</Link></li>
              <li><Link href="/admin" className="hover:text-[var(--color-primary)]">Área Administrativa</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Canais de Contato
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>WhatsApp: (41) 99709-8905</li>
              <li>Horário: 08h às 18h (Seg. a Sex.)</li>
              <li>Curitiba - PR • Envio Nacional</li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Formas de Pagamento
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <FiCheck className="w-3.5 h-3.5" />
                <span>Pix Instantâneo D+0</span>
              </div>
              <div>Cartões de Crédito em até 12x</div>
              <div>Faturamento 28D para Empresas (sob consulta)</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 py-4 text-center text-[10px] text-slate-400">
          © 2026 {state.storeName}. Todos os direitos reservados.
        </div>
      </footer>

      {/* GAVETA DO CARRINHO */}
      <CartDrawer
        isOpen={state.isCartOpen}
        onClose={() => state.setIsCartOpen(false)}
        tenant={tenant}
      />
    </div>
  );
}
