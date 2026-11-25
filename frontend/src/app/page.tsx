"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import CleanMinimalStorefront from "@/components/themes/CleanMinimalStorefront";
import ModernCommerceStorefront from "@/components/themes/ModernCommerceStorefront";
import EditorialStudioStorefront from "@/components/themes/EditorialStudioStorefront";
import { TenantInfo, ProductItem, fetchApi } from "@/lib/api";
import { getContrastColor } from "@/lib/themeColors";
import {
  FiLayers,
  FiArrowRight,
  FiZap,
  FiTrendingUp,
  FiGlobe,
  FiCreditCard,
  FiExternalLink,
} from "react-icons/fi";

export default function HomePage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlatformRoot, setIsPlatformRoot] = useState(false);
  const [forceNeoBrutalistDemo, setForceNeoBrutalistDemo] = useState(false);

  useEffect(() => {
    // Garante tenant padrão para desenvolvimento local em localhost
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const storeParam = urlParams.get("store") || urlParams.get("tenant");
      if (storeParam) {
        localStorage.setItem("active_tenant_slug", storeParam);
      } else if (!localStorage.getItem("active_tenant_slug")) {
        localStorage.setItem("active_tenant_slug", "jestein");
      }
    }

    // Timeout de segurança absoluto: desativa o spinner após 1s garantindo que a página sempre abra
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    async function loadData() {
      try {
        const tenantRes = await fetchApi("/tenant/me");
        if (tenantRes.ok) {
          const tenantData = await tenantRes.json();
          setTenant(tenantData);

          if (tenantData.primary_color) {
            document.documentElement.style.setProperty("--color-primary", tenantData.primary_color);
            document.documentElement.style.setProperty(
              "--color-primary-foreground",
              getContrastColor(tenantData.primary_color)
            );
          }
          if (tenantData.secondary_color) {
            document.documentElement.style.setProperty("--color-secondary", tenantData.secondary_color);
            document.documentElement.style.setProperty(
              "--color-secondary-foreground",
              getContrastColor(tenantData.secondary_color)
            );
          }

          const [prodRes, catRes] = await Promise.all([
            fetchApi("/products"),
            fetchApi("/categories"),
          ]);
          if (prodRes.ok) setProducts(await prodRes.json());
          if (catRes.ok) setCategories(await catRes.json());
        } else {
          setIsPlatformRoot(true);
        }
      } catch (err) {
        setIsPlatformRoot(true);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="surface-card p-6 text-center border border-border-theme">
          <div className="animate-spin text-3xl mb-2 text-brand-primary">⚡</div>
          <p className="font-semibold text-xs text-content-primary">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  // 1. Se o tenant ativo for encontrado ou solicitado modo de demonstração
  if (tenant || forceNeoBrutalistDemo) {
    // Permite testar temas também via query param na URL (?theme=clean_minimal)
    let requestedTheme = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("theme")
      : null;

    const currentTheme =
      requestedTheme ||
      (tenant?.settings_json as any)?.theme ||
      "modern_commerce";

    // Tema 1: Clean Minimal (Boutique / Minimalista)
    if (currentTheme === "clean_minimal" || currentTheme === "clean-minimal") {
      return (
        <CleanMinimalStorefront
          tenant={tenant}
          products={products}
          categories={categories}
        />
      );
    }

    // Tema 3: Editorial Studio (Catálogo Premium / Retrato)
    if (currentTheme === "editorial_studio" || currentTheme === "editorial-studio") {
      return (
        <EditorialStudioStorefront
          tenant={tenant}
          products={products}
          categories={categories}
        />
      );
    }

    // Tema 2: Modern Commerce (Padrão de Alta Conversão / Fallback Seguro)
    return (
      <ModernCommerceStorefront
        tenant={tenant}
        products={products}
        categories={categories}
      />
    );
  }

  // 2. Se for a raiz da plataforma SaaS (quando acessado sem tenant de loja)
  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-content-primary transition-colors duration-200">
      {/* Header Plataforma */}
      <header className="border-b border-border-theme bg-bg-surface px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
              <FiLayers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-bold text-content-primary">
                SaaS E-commerce
              </span>
              <span className="badge-theme badge-brand text-[10px]">
                Multi-Tenant Cloud
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/admin/login"
              className="btn-brand-outline text-xs py-2 px-3.5 rounded-lg hidden sm:inline-flex"
            >
              Acessar Painel
            </Link>
            <Link
              href="/onboarding"
              className="btn-brand text-xs py-2 px-4 rounded-lg flex items-center gap-1.5"
            >
              <span>Criar Minha Loja</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero SaaS */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:py-20 text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-5">
          <FiZap className="w-3.5 h-3.5" />
          <span>Tecnologia de Alta Conversão para Personalizados & Atacado</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold text-content-primary leading-tight max-w-4xl mx-auto">
          A Plataforma E-commerce para{" "}
          <span className="text-brand-primary">Produtos Personalizados</span> e Vendas em Atacado
        </h1>

        <p className="text-content-secondary text-sm sm:text-base max-w-2xl mx-auto mt-5 leading-relaxed">
          Multi-tenancy nativo com subdomínios automáticos, SSL On-Demand via Caddy,
          motor de precificação progressiva por quantidade e checkout com InfinitePay e Mercado Pago.
        </p>

        <div className="flex flex-wrap justify-center gap-3.5 mt-8">
          <Link
            href="/onboarding"
            className="btn-brand text-sm py-3 px-7 rounded-lg flex items-center gap-2 shadow-sm hover:shadow"
          >
            <span>Criar Minha Loja Gratuitamente</span>
            <FiArrowRight className="w-4 h-4" />
          </Link>

          {/* Botão de Demonstração Imediata da Vitrine Neo-Brutalista Pop-Art */}
          <button
            type="button"
            onClick={() => setForceNeoBrutalistDemo(true)}
            className="btn-brand-outline text-sm py-3 px-6 rounded-lg flex items-center gap-2"
          >
            <span>Ver Vitrine Neo-Brutalista Pop-Art</span>
            <FiExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Grid de Benefícios Core */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 text-left">
          <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-3">
              <FiLayers className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-sm font-bold text-content-primary mb-1">
              Multi-Tenancy Isolado
            </h3>
            <p className="text-xs text-content-secondary">
              Cada lojista tem seu subdomínio, vitrine, catálogo e integrações de pagamentos 100% independentes.
            </p>
          </div>

          <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-status-success flex items-center justify-center mb-3">
              <FiTrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-sm font-bold text-content-primary mb-1">
              Atacado Progressivo
            </h3>
            <p className="text-xs text-content-secondary">
              Tabela de preços regressivos por volume para estimular vendas B2B e grandes quantidades.
            </p>
          </div>

          <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-status-warning flex items-center justify-center mb-3">
              <FiGlobe className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-sm font-bold text-content-primary mb-1">
              Domínio Próprio & SSL
            </h3>
            <p className="text-xs text-content-secondary">
              Conecte seu próprio domínio com validação de DNS e emissão automática de certificado HTTPS via Caddy.
            </p>
          </div>

          <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-brand-accent flex items-center justify-center mb-3">
              <FiCreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-sm font-bold text-content-primary mb-1">
              Módulos Plugáveis
            </h3>
            <p className="text-xs text-content-secondary">
              InfinitePay com validação server-to-server, Mercado Pago, Melhor Envio OAuth2 e Correios.
            </p>
          </div>
        </div>

        {/* Seletor de Loja em Ambiente Local */}
        <div className="mt-12 max-w-md mx-auto p-5 surface-card border border-border-theme bg-bg-surface rounded-xl text-left">
          <h4 className="font-heading text-xs font-bold uppercase text-content-primary mb-1">
            Acessar Loja por Subdomínio / Slug
          </h4>
          <p className="text-xs text-content-secondary mb-3">
            Para testar uma loja específica (ex: <strong>julcemar</strong> ou <strong>jestein</strong>):
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const slugInput = (form.elements.namedItem("slug") as HTMLInputElement).value;
              if (slugInput) {
                localStorage.setItem("active_tenant_slug", slugInput.trim().toLowerCase());
                setForceNeoBrutalistDemo(true);
              }
            }}
            className="flex gap-2"
          >
            <input
              name="slug"
              type="text"
              placeholder="Ex: julcemar ou jestein"
              className="input-theme flex-1 text-xs"
            />
            <button type="submit" className="btn-brand text-xs py-2 px-4 rounded-lg">
              Acessar
            </button>
          </form>
        </div>
      </section>

      {/* Footer Plataforma */}
      <footer className="mt-auto border-t border-border-theme py-6 text-center text-xs text-content-secondary">
        &copy; {new Date().getFullYear()} SaaS Multi-Tenant Cloud. Desenvolvido com FastAPI e Next.js.
      </footer>
    </div>
  );
}
