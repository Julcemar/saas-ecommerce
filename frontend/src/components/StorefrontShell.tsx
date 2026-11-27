"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TenantInfo, NavigationItem } from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";
import { generateThemeCssVariables } from "@/lib/themeColors";
import CartDrawer from "@/components/CartDrawer";
import CustomerAccountMenu from "@/components/CustomerAccountMenu";
import {
  FiSearch,
  FiUser,
  FiShoppingCart,
  FiTruck,
  FiZap,
  FiChevronDown,
  FiExternalLink,
  FiShield,
  FiCheck,
  FiPhone,
} from "react-icons/fi";

interface StorefrontShellProps {
  tenant: TenantInfo | null;
  children: React.ReactNode;
  themeOverride?: StorefrontTheme;
  pageTitle?: string;
}

export default function StorefrontShell({
  tenant,
  children,
  themeOverride,
  pageTitle,
}: StorefrontShellProps) {
  const [activeTheme, setActiveTheme] = useState<StorefrontTheme>("modern_commerce");
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const detected = themeOverride || getActiveTheme(tenant);
    setActiveTheme(detected);
  }, [tenant, themeOverride]);

  // Sincroniza contagem de itens do carrinho
  useEffect(() => {
    const updateCount = () => {
      try {
        const raw = localStorage.getItem("saas_cart");
        if (raw) {
          const items = JSON.parse(raw);
          const total = items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
          setCartCount(total);
        } else {
          setCartCount(0);
        }
      } catch (_) {
        setCartCount(0);
      }
    };
    updateCount();
    window.addEventListener("cart-updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("cart-updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  const cssVariables = generateThemeCssVariables(tenant);
  const classes = getThemeClasses(activeTheme);

  const storeName = tenant?.name || "Jestein Personalizados";
  const whatsapp = tenant?.settings_json?.whatsapp_phone || "41997098905";
  const navigationItems: NavigationItem[] =
    (tenant?.settings_json as any)?.navigation_menu || [
      { id: "def-1", label: "Catálogo", url: "/#catalogo", type: "custom_link", children: [] },
      { id: "def-2", label: "Canecas", url: "/#catalogo?categoria=canecas", type: "category", children: [] },
      { id: "def-3", label: "Kits Corporativos", url: "/#catalogo?categoria=kits-corporativos", type: "category", children: [] },
      { id: "def-4", label: "Atacado B2B", url: `https://wa.me/${whatsapp}`, type: "custom_link", children: [] },
    ];

  // Helper para renderizar os itens de navegação com submenus de 2 níveis
  const renderNavLinks = (themeKey: string) => {
    return navigationItems.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isOpen = activeDropdown === item.id;

      if (!hasChildren) {
        return (
          <Link
            key={item.id}
            href={item.url}
            className={`py-1 whitespace-nowrap transition-colors ${
              themeKey === "editorial_studio"
                ? "hover:text-neutral-950"
                : themeKey === "clean_minimal"
                ? "hover:text-neutral-900"
                : "hover:text-[var(--color-primary)]"
            }`}
          >
            {item.label}
          </Link>
        );
      }

      return (
        <div
          key={item.id}
          className="relative whitespace-nowrap"
          onMouseEnter={() => setActiveDropdown(item.id)}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <button
            type="button"
            className={`flex items-center gap-1 py-1 transition-colors cursor-pointer ${
              themeKey === "editorial_studio"
                ? "hover:text-neutral-950"
                : themeKey === "clean_minimal"
                ? "hover:text-neutral-900"
                : "hover:text-[var(--color-primary)]"
            }`}
          >
            <span>{item.label}</span>
            <FiChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {isOpen && (
            <div
              className={`absolute top-full left-0 mt-1 min-w-[210px] p-2 z-50 shadow-2xl ${
                themeKey === "editorial_studio"
                  ? "bg-white border border-neutral-300 rounded-none"
                  : themeKey === "clean_minimal"
                  ? "bg-white border border-neutral-200/80 rounded-2xl"
                  : "bg-white border border-slate-200 rounded-2xl"
              }`}
            >
              {item.children.map((sub: any) => (
                <Link
                  key={sub.id}
                  href={sub.url}
                  className={`block px-3.5 py-2 text-xs font-medium rounded-xl transition-colors ${
                    themeKey === "editorial_studio"
                      ? "text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 rounded-none uppercase tracking-wide"
                      : "text-neutral-700 hover:text-[var(--color-primary)] hover:bg-neutral-50"
                  }`}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  // ----------------------------------------------------------------
  // 1. RENDERIZAÇÃO TEMÁTICA DA TOPBAR
  // ----------------------------------------------------------------
  const renderTopBar = () => {
    switch (activeTheme) {
      case "clean_minimal":
        return (
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
                  href={`https://wa.me/${whatsapp}?text=Olá,%20gostaria%20de%20um%20atendimento%20personalizado.`}
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
        );

      case "editorial_studio":
        return (
          <div className="bg-neutral-950 text-neutral-300 text-[11px] py-2 px-4 sm:px-8 tracking-wider">
            <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-3">
                <span className="uppercase text-neutral-400 font-semibold">Ateliê Corporativo</span>
                <span className="text-neutral-600">•</span>
                <span>Personalização sob medida com precisão laser e acabamento premium</span>
              </div>
              <div className="flex items-center gap-5">
                <a
                  href={`https://wa.me/${whatsapp}?text=Olá,%20gostaria%20de%20um%20atendimento%20exclusivo.`}
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
        );

      case "neo_brutalist":
        return (
          <div className="bg-[var(--color-primary)] text-white text-xs font-black py-1.5 px-4 border-b-2 border-black">
            <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span>🚚 Envio p/ todo Brasil</span>
                <span className="opacity-40">•</span>
                <span className="bg-[var(--color-secondary)] text-black px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#111111]">
                  ⚡ Descontos no Atacado
                </span>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline flex items-center gap-1"
                >
                  💬 WhatsApp B2B
                </a>
                <Link href="/admin" className="hover:underline">
                  ⚙️ Painel Lojista
                </Link>
              </div>
            </div>
          </div>
        );

      case "modern_commerce":
      default:
        return (
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
                  href={`https://wa.me/${whatsapp}?text=Olá,%20gostaria%20de%20tirar%20dúvidas%20sobre%20um%20pedido.`}
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
        );
    }
  };

  // ----------------------------------------------------------------
  // 2. RENDERIZAÇÃO TEMÁTICA DO HEADER
  // ----------------------------------------------------------------
  const renderHeader = () => {
    switch (activeTheme) {
      case "clean_minimal":
        return (
          <header className="storefront-glass-header border-b border-neutral-200/70 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-6">
              <Link href="/" className="flex items-center gap-2 shrink-0 group py-0.5">
                {tenant?.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={storeName}
                    className="h-11 sm:h-12 md:h-14 w-auto max-w-[220px] sm:max-w-[260px] object-contain transition-all"
                  />
                ) : (
                  <span className="font-heading text-lg sm:text-xl font-bold tracking-tight text-neutral-900 group-hover:text-[var(--color-primary)] transition-colors uppercase">
                    {storeName}
                  </span>
                )}
              </Link>

              <div className="hidden md:flex flex-1 max-w-md items-center relative">
                <FiSearch className="absolute left-3.5 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar produtos personalizados..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-full focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <CustomerAccountMenu activeTheme="clean_minimal" />

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                  }}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer"
                  title="Abrir carrinho"
                >
                  <FiShoppingCart className="w-3.5 h-3.5" />
                  <span>Carrinho ({cartCount})</span>
                </button>
              </div>
            </div>

            {/* Menu de navegação */}
            <div className="border-t border-neutral-100 px-4 sm:px-6 relative z-30">
              <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium text-neutral-600 gap-x-6 gap-y-2 flex-wrap py-2 overflow-visible">
                <nav className="flex items-center gap-x-6 gap-y-2 flex-wrap">
                  {renderNavLinks("clean_minimal")}
                </nav>
              </div>
            </div>
          </header>
        );

      case "editorial_studio":
        return (
          <header className="storefront-glass-header border-b border-neutral-200/80 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between gap-8">
              <Link href="/" className="flex items-center gap-3 shrink-0 group py-0.5">
                {tenant?.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={storeName}
                    className="h-11 sm:h-12 md:h-14 w-auto max-w-[220px] sm:max-w-[260px] object-contain transition-all"
                  />
                ) : (
                  <div className="flex flex-col">
                    <span className="font-heading text-xl sm:text-2xl font-black tracking-widest text-neutral-900 uppercase">
                      {storeName}
                    </span>
                    <span className="text-[9px] font-bold tracking-[0.25em] text-neutral-400 uppercase">
                      Studio & Catálogo
                    </span>
                  </div>
                )}
              </Link>

              <div className="hidden md:flex flex-1 max-w-md items-center relative">
                <FiSearch className="absolute left-3 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pesquisar catálogo premium..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-transparent border-b border-neutral-300 focus:border-neutral-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-4">
                <CustomerAccountMenu activeTheme="editorial_studio" />

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-5 py-2.5 bg-neutral-950 text-white rounded-none hover:bg-neutral-800 transition-all cursor-pointer"
                  title="Abrir carrinho"
                >
                  <FiShoppingCart className="w-3.5 h-3.5" />
                  <span>Bolsa ({cartCount})</span>
                </button>
              </div>
            </div>

            <div className="border-t border-neutral-100 px-4 sm:px-8 relative z-30">
              <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500 gap-x-8 gap-y-2 flex-wrap py-2.5 overflow-visible">
                <nav className="flex items-center gap-x-8 gap-y-2 flex-wrap">
                  {renderNavLinks("editorial_studio")}
                </nav>
              </div>
            </div>
          </header>
        );

      case "neo_brutalist":
        return (
          <header className="bg-white border-b-2 border-black sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="bg-[var(--color-primary)] text-white px-3 py-1 font-heading text-lg font-black uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_#111111]">
                  {storeName}
                </div>
              </Link>

              <div className="hidden md:flex flex-1 max-w-md relative">
                <input
                  type="text"
                  placeholder="Buscar no catálogo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <CustomerAccountMenu activeTheme="neo_brutalist" />

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="bg-[#FFD100] hover:bg-[#FFE033] text-black border-2 border-black font-black text-xs px-4 py-2 rounded-lg shadow-[2px_2px_0px_#111111] flex items-center gap-2 cursor-pointer"
                >
                  <FiShoppingCart className="w-4 h-4" />
                  <span>Carrinho ({cartCount})</span>
                </button>
              </div>
            </div>
          </header>
        );

      case "modern_commerce":
      default:
        return (
          <header className="storefront-glass-header border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sm:gap-8">
              <Link href="/" className="flex items-center gap-2 shrink-0 group py-0.5">
                {tenant?.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={storeName}
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
                      {storeName}
                    </span>
                  </div>
                )}
              </Link>

              <div className="hidden md:flex flex-1 max-w-lg items-center relative">
                <input
                  type="text"
                  placeholder="Buscar canecas, camisetas, squeezes corporativos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 text-xs bg-slate-50 border border-slate-300/80 rounded-xl focus:outline-none focus:bg-white focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  className="absolute right-2 p-1.5 rounded-lg text-slate-500 hover:text-[var(--color-primary)] transition-colors"
                >
                  <FiSearch className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <CustomerAccountMenu activeTheme="modern_commerce" />

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                  }}
                  className="flex items-center gap-2.5 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:opacity-95 active:scale-98 transition-all cursor-pointer"
                  title="Abrir carrinho"
                >
                  <div className="relative">
                    <FiShoppingCart className="w-4 h-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span>Meu Carrinho</span>
                </button>
              </div>
            </div>

            {/* Menu de navegação */}
            <div className="border-t border-slate-100 px-4 sm:px-6 relative z-30">
              <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-semibold text-slate-600 gap-x-6 gap-y-2 flex-wrap py-2.5 overflow-visible">
                <nav className="flex items-center gap-x-6 gap-y-2 flex-wrap">
                  {renderNavLinks("modern_commerce")}
                </nav>
              </div>
            </div>
          </header>
        );
    }
  };

  // ----------------------------------------------------------------
  // 3. RENDERIZAÇÃO TEMÁTICA DO FOOTER
  // ----------------------------------------------------------------
  const renderFooter = () => {
    switch (activeTheme) {
      case "clean_minimal":
        return (
          <footer className="bg-white border-t border-neutral-200/80 mt-auto text-xs text-neutral-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2.5">
                <span className="font-heading text-sm font-bold text-neutral-900 tracking-tight uppercase">
                  {storeName}
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
                  <li><Link href="/#catalogo" className="hover:text-[var(--color-primary)]">Todos os Produtos</Link></li>
                  <li><Link href="/carrinho" className="hover:text-[var(--color-primary)]">Meu Carrinho</Link></li>
                  <li><Link href="/admin" className="hover:text-[var(--color-primary)]">Painel do Lojista</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-heading text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-2.5">
                  Pagamento Seguro
                </h4>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">Pix Instantâneo</span>
                  <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">Cartão 12x</span>
                  <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">Boleto B2B</span>
                </div>
              </div>

              <div>
                <h4 className="font-heading text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-2.5">
                  Contato
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Atendimento: WhatsApp ({whatsapp})<br />
                  Segunda a Sexta, 08h às 18h
                </p>
              </div>
            </div>

            <div className="border-t border-neutral-100 py-4 text-center text-[10px] text-neutral-400">
              © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
            </div>
          </footer>
        );

      case "editorial_studio":
        return (
          <footer className="bg-neutral-950 text-neutral-400 border-t border-neutral-800 mt-auto text-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-3">
                <span className="font-heading text-sm font-bold text-white tracking-widest uppercase">
                  {storeName}
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
                  <li><Link href="/#catalogo" className="hover:text-white transition-colors">Catálogo Completo</Link></li>
                  <li><Link href="/carrinho" className="hover:text-white transition-colors">Minha Bolsa</Link></li>
                  <li><Link href="/checkout" className="hover:text-white transition-colors">Finalização de Compra</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-heading text-xs font-bold text-white uppercase tracking-widest mb-3">
                  Segurança & Pagamentos
                </h4>
                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
                  <span className="border border-neutral-800 px-2 py-1 text-neutral-300">Pix com Aprovação</span>
                  <span className="border border-neutral-800 px-2 py-1 text-neutral-300">Cartão de Crédito</span>
                  <span className="border border-neutral-800 px-2 py-1 text-neutral-300">Faturamento B2B</span>
                </div>
              </div>

              <div>
                <h4 className="font-heading text-xs font-bold text-white uppercase tracking-widest mb-3">
                  Ateliê Corporativo
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  WhatsApp: +55 {whatsapp}<br />
                  Produção e envio para todo o território nacional com garantia de integridade.
                </p>
              </div>
            </div>

            <div className="border-t border-neutral-900 py-6 text-center text-[10px] tracking-widest uppercase text-neutral-500">
              © {new Date().getFullYear()} {storeName} • Edição Exclusiva
            </div>
          </footer>
        );

      case "neo_brutalist":
        return (
          <footer className="bg-white border-t-2 border-black mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="bg-black text-[#FFD100] inline-block px-3 py-1 font-heading text-base font-black border-2 border-black mb-2 shadow-[2px_2px_0px_#111111]">
                  {storeName}
                </div>
                <p className="text-xs text-gray-700 font-bold">
                  Catálogo e personalização de brindes sob medida.
                </p>
              </div>
              <div>
                <h4 className="font-heading text-xs font-black uppercase mb-2">Pagamento</h4>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="badge-pop bg-[#7AC943] text-black">⚡ Pix Instantâneo</span>
                  <span className="badge-pop bg-white text-black">💳 Cartão 12x</span>
                </div>
              </div>
              <div>
                <h4 className="font-heading text-xs font-black uppercase mb-2">Suporte</h4>
                <p className="text-xs text-gray-700 font-bold">WhatsApp: {whatsapp}</p>
              </div>
            </div>
            <div className="bg-[#111111] text-gray-400 text-xs text-center py-2.5 border-t border-black">
              © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
            </div>
          </footer>
        );

      case "modern_commerce":
      default:
        return (
          <footer className="bg-white border-t border-slate-200 mt-auto text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-3">
                <span className="font-heading text-sm font-bold text-slate-900 uppercase">
                  {storeName}
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
                  Links Úteis
                </h4>
                <ul className="space-y-2 text-[11px]">
                  <li><Link href="/#catalogo" className="hover:text-[var(--color-primary)]">Catálogo Completo</Link></li>
                  <li><Link href="/carrinho" className="hover:text-[var(--color-primary)]">Meu Carrinho</Link></li>
                  <li><Link href="/admin" className="hover:text-[var(--color-primary)]">Painel do Lojista</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Formas de Pagamento
                </h4>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-semibold">Pix Instantâneo</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-semibold">Cartão até 12x</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-semibold">Boleto Bancário</span>
                </div>
              </div>

              <div>
                <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Atendimento Exclusivo
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Dúvidas sobre faturamento corporativo ou pedidos em grande escala? Fale com nossos consultores.
                </p>
                <a
                  href={`https://wa.me/${whatsapp}?text=Olá,%20gostaria%20de%20um%20orçamento%20corporativo.`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  <FiPhone className="w-3.5 h-3.5" />
                  <span>WhatsApp: {whatsapp}</span>
                </a>
              </div>
            </div>

            <div className="border-t border-slate-100 py-4 text-center text-[10px] text-slate-400">
              © {new Date().getFullYear()} {storeName}. Plataforma E-commerce Multi-Tenant.
            </div>
          </footer>
        );
    }
  };

  return (
    <div
      style={cssVariables}
      className={`min-h-screen flex flex-col ${classes.wrapperBg} ${classes.wrapperText} selection:bg-[var(--color-primary)] selection:text-white`}
    >
      {/* 1. TOPBAR */}
      {renderTopBar()}

      {/* 2. HEADER */}
      {renderHeader()}

      {/* 3. CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* 4. FOOTER */}
      {renderFooter()}

      {/* 5. GAVETA LATERAL DO CARRINHO */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        tenant={tenant}
        themeOverride={activeTheme}
      />
    </div>
  );
}
