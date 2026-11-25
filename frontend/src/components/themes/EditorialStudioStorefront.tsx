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
      style={state.cssVariables}
      className="min-h-screen flex flex-col bg-[#FCFCFD] text-neutral-900 font-sans selection:bg-[var(--color-primary)] selection:text-white"
    >
      {/* 1. TOP BAR REFINADA & EDITORIAL */}
      <div className="bg-neutral-900 text-neutral-300 text-[11px] py-2 px-4 sm:px-8 tracking-wider">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="uppercase text-neutral-400 font-semibold">Ateliê Corporativo</span>
            <span className="text-neutral-600">•</span>
            <span>Personalização sob medida com precisão laser e acabamento premium</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={`https://wa.me/${state.whatsapp}?text=Olá,%20gostaria%20de%20um%20atendimento%20exclusivo.`}
              target="_blank"
              rel="noreferrer"
              className="text-white hover:text-[var(--color-secondary)] transition-colors font-medium"
            >
              Consultoria WhatsApp
            </a>
            <Link href="/admin" className="text-neutral-400 hover:text-white transition-colors">
              Painel do Lojista
            </Link>
          </div>
        </div>
      </div>

      {/* 2. HEADER EDITORIAL ESPAÇADO */}
      <header className="bg-white/95 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between gap-8">
          {/* Logo da Marca */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group py-0.5">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={state.storeName}
                className="h-11 sm:h-12 md:h-14 w-auto max-w-[220px] sm:max-w-[260px] object-contain transition-all"
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
              placeholder="Buscar por nome ou referência..."
              value={state.searchQuery}
              onChange={(e) => state.setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50/80 border-b border-neutral-300 focus:border-neutral-900 focus:bg-white focus:outline-none transition-all placeholder:text-neutral-400"
            />
          </div>

          {/* Ações da Loja */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="hidden sm:inline-block text-xs font-medium tracking-wide text-neutral-600 hover:text-neutral-900 transition-colors uppercase"
            >
              Conta
            </Link>

            <button
              type="button"
              onClick={() => state.setIsCartOpen(true)}
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
              }}
              className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg shadow-xs hover:opacity-95 transition-all cursor-pointer"
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

      {/* 4. HERO BANNER LARGURA TOTAL (FULL-WIDTH) */}
      <div className="w-full">
        <InteractiveHeroBanner banner={state.bannerData} />
      </div>

      {/* 5. PILARES & BENEFÍCIOS DISCRETOS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-neutral-200">
          <div className="space-y-1">
            <span className="text-[10px] tracking-widest text-neutral-400 uppercase font-bold">Produção</span>
            <h4 className="text-xs font-bold text-neutral-900">Precisão Industrial</h4>
            <p className="text-[11px] text-neutral-500">Impressão UV e gravação a laser com máxima nitidez</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] tracking-widest text-neutral-400 uppercase font-bold">Escala</span>
            <h4 className="text-xs font-bold text-neutral-900">Atacado Sob Medida</h4>
            <p className="text-[11px] text-neutral-500">Condições progressivas para tiragens corporativas</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] tracking-widest text-neutral-400 uppercase font-bold">Garantia</span>
            <h4 className="text-xs font-bold text-neutral-900">Aprovação Virtual</h4>
            <p className="text-[11px] text-neutral-500">Mockup digital detalhado antes de iniciar a produção</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] tracking-widest text-neutral-400 uppercase font-bold">Logística</span>
            <h4 className="text-xs font-bold text-neutral-900">Envio para o Brasil</h4>
            <p className="text-[11px] text-neutral-500">Embalagem de proteção reforçada e rastreio completo</p>
          </div>
        </div>
      </section>

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
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
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
                  className="group flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem Vertical Retrato aspect-[4/5] */}
                    <Link
                      href={`/produto/${prod.slug}`}
                      className="block relative aspect-[4/5] w-full rounded-xl bg-neutral-100/70 p-4 overflow-hidden border border-neutral-200/60 group-hover:border-neutral-400 transition-colors"
                    >
                      <img
                        src={imgUrl}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />

                      {/* Badge Sutil e Elegante */}
                      {prod.badge_label && (
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-neutral-900 text-white shadow-xs">
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
                        <h3 className="font-heading text-sm font-bold text-neutral-900 group-hover:text-[var(--color-primary)] line-clamp-2 transition-colors">
                          {prod.name}
                        </h3>
                      </Link>

                      {wholesaleTag && (
                        <p className="text-[11px] font-medium text-emerald-700 pt-0.5">
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
                      style={{
                        backgroundColor: "var(--color-primary)",
                        color: "var(--color-primary-foreground)",
                      }}
                      className="w-full py-2.5 px-4 rounded-lg text-xs font-bold tracking-wider uppercase shadow-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
              className="px-8 py-3 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold tracking-wider uppercase shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Ver mais produtos (+12)</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* 8. SEÇÃO: CRIAÇÃO E DESIGN */}
      <section className="bg-white border-y border-neutral-200 py-16 px-4 sm:px-8 my-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-12">
            <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-neutral-400 block mb-1">
              Processo Exclusivo
            </span>
            <h3 className="font-heading text-2xl font-bold text-neutral-900">
              Da ideia ao produto final com excelência de acabamento
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-2 border-l-2 border-neutral-200 pl-4">
              <span className="text-xs font-mono font-bold text-neutral-400">01</span>
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Curadoria</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Seleção minuciosa de matérias-primas e modelos de alta durabilidade.
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-neutral-200 pl-4">
              <span className="text-xs font-mono font-bold text-neutral-400">02</span>
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Personalização</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Aplicação do seu logotipo por gravação a laser, serigrafia ou impressão digital.
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-neutral-200 pl-4">
              <span className="text-xs font-mono font-bold text-neutral-400">03</span>
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Conferência</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Controle de qualidade e alinhamento visual antes do despacho final.
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-neutral-200 pl-4">
              <span className="text-xs font-mono font-bold text-neutral-400">04</span>
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Entrega Segura</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Embalagem reforçada e envio rápido para empresas em todo o país.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CTA B2B EDITORIAL ALINHADO ÀS CORES DO TENANT (SEM ROXO HARDCODED) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full mb-10">
        <div
          style={{
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
            color: "var(--color-primary-foreground)",
          }}
          className="p-8 sm:p-12 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-center gap-8"
        >
          <div className="space-y-3 max-w-xl">
            <span className="px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase bg-white/20 inline-block">
              Corporativo & Atacado
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-bold leading-tight">
              Kits de Onboarding e Brindes Executivos de Alto Padrão
            </h3>
            <p className="text-xs opacity-90 leading-relaxed">
              Atendimento focado para agências, departamentos de RH e eventos empresariais com descontos progressivos e faturamento facilitado.
            </p>
          </div>

          <a
            href={`https://wa.me/${state.whatsapp}?text=Olá,%20gostaria%20de%20um%20orçamento%20corporativo%20personalizado.`}
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 rounded-lg bg-white text-neutral-900 hover:bg-neutral-50 font-bold text-xs uppercase tracking-wider shadow-sm shrink-0 transition-all flex items-center gap-2"
          >
            <FiMessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Consultoria Comercial</span>
          </a>
        </div>
      </section>

      {/* 10. RODAPÉ EDITORIAL */}
      <footer className="bg-neutral-950 text-neutral-400 border-t border-neutral-800 mt-auto text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <span className="font-heading text-sm font-bold text-white tracking-widest uppercase">
              {state.storeName}
            </span>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              Excelência em produtos promocionais e brindes personalizados para marcas que prezam por qualidade.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-white uppercase tracking-widest mb-3">
              Coleções
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#catalogo" className="hover:text-white transition-colors">Ver Todos os Produtos</a></li>
              <li><Link href="/carrinho" className="hover:text-white transition-colors">Minha Sacola</Link></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Área do Lojista</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-white uppercase tracking-widest mb-3">
              Canais Oficiais
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>WhatsApp: (41) 99709-8905</li>
              <li>Horário: 08h às 18h de Segunda a Sexta</li>
              <li>Atendimento corporativo nacional</li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold text-white uppercase tracking-widest mb-3">
              Pagamento & Segurança
            </h4>
            <div className="space-y-2 text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <FiCheck className="w-3.5 h-3.5" />
                <span>Pix Instantâneo</span>
              </div>
              <div>Cartão de Crédito e Faturamento B2B</div>
              <div>Dados 100% protegidos com criptografia SSL</div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-900 py-6 text-center text-[10px] text-neutral-500">
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
