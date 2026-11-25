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
  FiClock,
  FiArrowRight,
  FiChevronDown,
  FiExternalLink,
  FiCheck,
  FiPlus,
  FiMessageSquare,
} from "react-icons/fi";

interface CleanMinimalStorefrontProps {
  tenant: TenantInfo | null;
  products?: ProductItem[];
  categories?: any[];
}

export default function CleanMinimalStorefront({
  tenant,
  products = [],
  categories = [],
}: CleanMinimalStorefrontProps) {
  const state = useStorefrontState({ tenant, products, categories, initialPageSize: 12 });

  return (
    <div
      style={state.cssVariables}
      className="min-h-screen flex flex-col bg-[#FAFAFA] text-neutral-900 font-sans selection:bg-[var(--color-primary)] selection:text-white"
    >
      {/* 1. TOP BAR ULTRA CLEAN */}
      <div className="bg-white border-b border-neutral-100 text-[11px] text-neutral-500 py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"></span>
            <span>Produção rápida & sob demanda</span>
            <span className="text-neutral-300">•</span>
            <span>Descontos progressivos automáticos para empresas</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-600">
            <a
              href={`https://wa.me/${state.whatsapp}?text=Olá,%20gostaria%20de%20um%20atendimento%20personalizado.`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-1 font-medium"
            >
              Atendimento WhatsApp
            </a>
            <span className="text-neutral-200">|</span>
            <Link href="/admin" className="hover:text-neutral-900 transition-colors">
              Área do Lojista
            </Link>
          </div>
        </div>
      </div>

      {/* 2. HEADER MINIMALISTA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-neutral-200/70 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-6">
          {/* Logo Minimalista */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group py-0.5">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={state.storeName}
                className="h-11 sm:h-12 md:h-14 w-auto max-w-[220px] sm:max-w-[260px] object-contain transition-all"
              />
            ) : (
              <span className="font-heading text-lg sm:text-xl font-bold tracking-tight text-neutral-900 group-hover:text-[var(--color-primary)] transition-colors uppercase">
                {state.storeName}
              </span>
            )}
          </Link>

          {/* Campo de Busca Limpo */}
          <div className="hidden md:flex flex-1 max-w-md items-center relative">
            <FiSearch className="absolute left-3.5 text-neutral-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar produtos personalizados..."
              value={state.searchQuery}
              onChange={(e) => state.setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-full focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
            />
          </div>

          {/* Ações: Conta & Carrinho Minimalista */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <FiUser className="w-3.5 h-3.5" />
              <span>Minha Conta</span>
            </Link>

            <button
              type="button"
              onClick={() => state.setIsCartOpen(true)}
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
              }}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer"
              title="Abrir carrinho"
            >
              <FiShoppingCart className="w-3.5 h-3.5" />
              <span>Carrinho ({state.cartCount})</span>
            </button>
          </div>
        </div>

        {/* 3. MENU DE NAVEGAÇÃO HORIZONTAL (2 NÍVEIS) */}
        <div className="border-t border-neutral-100 px-4 sm:px-6 relative z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium text-neutral-600 gap-x-6 gap-y-2 flex-wrap py-2 overflow-visible">
            <nav className="flex items-center gap-x-6 gap-y-2 flex-wrap">
              {(state.navigationItems.length > 0
                ? state.navigationItems
                : [
                    { id: "def-1", label: "Todos os Produtos", url: "/#catalogo", type: "custom_link", children: [] },
                    { id: "def-2", label: "Canecas", url: "/#catalogo?categoria=canecas", type: "category", children: [] },
                    { id: "def-3", label: "Camisetas", url: "/#catalogo?categoria=camisetas", type: "category", children: [] },
                    { id: "def-4", label: "Kits Corporativos", url: "/#catalogo?categoria=kits-corporativos", type: "category", children: [] },
                    { id: "def-5", label: "Squeezes & Térmicas", url: "/#catalogo?categoria=squeezes-e-termicas", type: "category", children: [] },
                  ]
              ).map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isOpen = state.activeDropdown === item.id;

                if (!hasChildren) {
                  return (
                    <Link
                      key={item.id}
                      href={item.url}
                      className="hover:text-[var(--color-primary)] transition-colors py-1 inline-block"
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="relative"
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
                      <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-white border border-neutral-200 rounded-xl shadow-lg p-2 z-50">
                        {item.children.map((sub: any) => (
                          <Link
                            key={sub.id}
                            href={sub.url}
                            className="block px-3 py-2 text-xs text-neutral-600 hover:text-[var(--color-primary)] hover:bg-neutral-50 rounded-lg transition-colors"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* 4. BANNER HERO LARGURA TOTAL (FULL-WIDTH) */}
      <div className="w-full">
        <InteractiveHeroBanner banner={state.bannerData} />
      </div>

      {/* 5. BARRA DE BENEFÍCIOS ELEGANTE & CLEAN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-white border border-neutral-200/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <FiClock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900 leading-tight">Produção Rápida</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">Despacho em 24h a 48h</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <FiPercent className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900 leading-tight">Preço por Volume</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">Desconto progressivo no lote</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <FiTruck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900 leading-tight">Envio Seguro</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">Rastreio em todo o Brasil</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <FiShield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900 leading-tight">Prévia Digital</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">Aprovação antes de produzir</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CATEGORIAS POPULARES EM GRADE MODERNA */}
      {state.categories && state.categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="font-heading text-lg font-bold text-neutral-900">Categorias</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Encontre presentes e brindes pelo seu nicho</p>
            </div>
            {state.selectedCategory && (
              <button
                type="button"
                onClick={() => state.setSelectedCategory(null)}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Limpar filtro
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {state.categories.map((cat: any) => {
              const isSelected = state.selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id || cat.slug}
                  type="button"
                  onClick={() => state.setSelectedCategory(isSelected ? null : cat.slug)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs"
                      : "border-neutral-200/60 bg-white hover:border-neutral-300 hover:shadow-xs"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base text-neutral-400">🏷️</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-neutral-800 line-clamp-1">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. VITRINE DE PRODUTOS CLEAN MINIMAL */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-200/60">
          <div>
            <h2 className="font-heading text-xl font-bold text-neutral-900">Catálogo em Destaque</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Exibindo {state.visibleProducts.length} de {state.totalCount} produtos disponíveis
            </p>
          </div>

          {/* Busca mobile */}
          <div className="md:hidden">
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={state.searchQuery}
              onChange={(e) => state.setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Grade de Produtos */}
        {state.visibleProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/60">
            <p className="text-sm font-medium text-neutral-600">Nenhum produto encontrado com os filtros atuais.</p>
            <button
              type="button"
              onClick={() => {
                state.setSearchQuery("");
                state.setSelectedCategory(null);
              }}
              className="mt-3 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Limpar busca e filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {state.visibleProducts.map((prod: any) => {
              const wholesaleTag = state.getWholesaleBadge(prod);
              const imgUrl = prod.image_url || prod.img || "/themes/neo_brutalist/caneca-prod-large.png";

              return (
                <div
                  key={prod.id}
                  className="group bg-white rounded-2xl border border-neutral-200/60 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem Protagonista aspect-square */}
                    <Link
                      href={`/produto/${prod.slug}`}
                      className="block relative aspect-square w-full bg-neutral-50/70 p-3 overflow-hidden"
                    >
                      <img
                        src={imgUrl}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />

                      {/* Badge Discreto Superior */}
                      {prod.badge_label && (
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-neutral-800 shadow-xs border border-neutral-100">
                          {prod.badge_label}
                        </span>
                      )}
                    </Link>

                    {/* Detalhes do Produto */}
                    <div className="p-4 space-y-1.5">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400 block">
                        {prod.sku || "Personalizado"}
                      </span>

                      <Link href={`/produto/${prod.slug}`}>
                        <h3 className="font-heading text-sm font-semibold text-neutral-900 group-hover:text-[var(--color-primary)] line-clamp-2 transition-colors">
                          {prod.name}
                        </h3>
                      </Link>

                      {wholesaleTag && (
                        <p className="text-[11px] font-medium text-[var(--color-primary)] pt-1">
                          {wholesaleTag}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preço e Botão de Ação Único */}
                  <div className="p-4 pt-0">
                    <div className="flex items-baseline justify-between py-2 border-t border-neutral-100">
                      <span className="text-xs text-neutral-500 font-medium">A partir de</span>
                      <span className="font-heading text-base font-bold text-neutral-900">
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
                      className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-semibold shadow-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                      <span>Adicionar ao Carrinho</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botão Carregar Mais Produtos (+12) */}
        {state.hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={state.loadMore}
              className="px-6 py-2.5 rounded-full bg-white border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400 shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Carregar mais produtos (+12)</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* 8. SEÇÃO: COMO FUNCIONA (CLEAN & ESPAÇADA) */}
      <section className="bg-white border-y border-neutral-200/60 py-12 px-4 sm:px-6 my-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="font-heading text-xl font-bold text-neutral-900">Como funciona a personalização</h2>
            <p className="text-xs text-neutral-500 mt-1">Simples, digital e com suporte em cada etapa</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-neutral-200/50 space-y-2">
              <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-bold text-neutral-900 pt-1">Escolha o Produto</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Navegue pelo catálogo e escolha os modelos, cores e quantidades desejadas.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-neutral-200/50 space-y-2">
              <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-bold text-neutral-900 pt-1">Envie sua Arte ou Logotipo</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Anexe seu arquivo ou digite os nomes e frases para gravação ou impressão.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-neutral-200/50 space-y-2">
              <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="text-xs font-bold text-neutral-900 pt-1">Aprovação da Prévia Digital</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Nossa equipe gera a simulação visual exata para seu aceite antes de produzir.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-neutral-200/50 space-y-2">
              <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h4 className="text-xs font-bold text-neutral-900 pt-1">Produção & Despacho</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Fabricação com rigor técnico e envio com código de rastreamento para todo o Brasil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CTA B2B ELEGANTE ALINHADO ÀS CORES DO TENANT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full mb-8">
        <div
          style={{
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
            color: "var(--color-primary-foreground)",
          }}
          className="p-8 sm:p-10 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div className="space-y-2 max-w-xl">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs uppercase tracking-wider inline-block">
              Atendimento Corporativo & B2B
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-bold leading-tight">
              Precisa de grandes volumes ou kits corporativos sob medida?
            </h3>
            <p className="text-xs opacity-90 leading-relaxed">
              Condições especiais para compras em escala, faturamento para empresas e consultoria personalizada via WhatsApp.
            </p>
          </div>

          <a
            href={`https://wa.me/${state.whatsapp}?text=Olá,%20gostaria%20de%20um%20orçamento%20corporativo%20B2B.`}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 rounded-full bg-white text-neutral-900 hover:bg-neutral-50 font-bold text-xs uppercase shadow-sm shrink-0 transition-all flex items-center gap-2"
          >
            <FiMessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Falar com Consultor B2B</span>
          </a>
        </div>
      </section>

      {/* 10. RODAPÉ MINIMALISTA */}
      <footer className="bg-white border-t border-neutral-200/80 mt-auto text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2.5">
            <span className="font-heading text-sm font-bold text-neutral-900 tracking-tight uppercase">
              {state.storeName}
            </span>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Brindes personalizados, presentes corporativos e produtos promocionais de alta qualidade e durabilidade.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-2.5">
              Navegação
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#catalogo" className="hover:text-[var(--color-primary)]">Todos os Produtos</a></li>
              <li><Link href="/carrinho" className="hover:text-[var(--color-primary)]">Meu Carrinho</Link></li>
              <li><Link href="/admin" className="hover:text-[var(--color-primary)]">Painel do Lojista</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-2.5">
              Atendimento
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>WhatsApp: (41) 99709-8905</li>
              <li>Segunda a Sexta das 08h às 18h</li>
              <li>Envio seguro para todo o território nacional</li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-2.5">
              Segurança & Pagamento
            </h4>
            <div className="space-y-1.5 text-[11px] text-neutral-600">
              <div className="flex items-center gap-1.5 font-medium text-emerald-600">
                <FiCheck className="w-3.5 h-3.5" />
                <span>Pix com desconto imediato</span>
              </div>
              <div>Cartão de Crédito e Boleto Bancário</div>
              <div>Checkout 100% Criptografado</div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-100 py-4 text-center text-[10px] text-neutral-400">
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
