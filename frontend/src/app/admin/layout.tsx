"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchApi, TenantInfo } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import {
  FiGrid,
  FiBox,
  FiFolder,
  FiShoppingCart,
  FiCpu,
  FiGlobe,
  FiSliders,
  FiExternalLink,
  FiLogOut,
  FiCheckCircle,
  FiLayers,
} from "react-icons/fi";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    // Timeout de segurança: nunca deixa a tela presa em loading por mais de 3 segundos
    const fallbackTimer = setTimeout(() => {
      setCheckingAuth((prev) => {
        if (prev) {
          const token = typeof window !== "undefined" ? localStorage.getItem("saas_token") : null;
          if (!token) {
            router.push("/admin/login");
          }
          return false;
        }
        return false;
      });
    }, 2500);

    async function checkAuth() {
      const token = typeof window !== "undefined" ? localStorage.getItem("saas_token") : null;
      if (!token) {
        setCheckingAuth(false);
        router.push("/admin/login");
        return;
      }

      try {
        const [meRes, tenantRes] = await Promise.all([
          fetchApi("/auth/me"),
          fetchApi("/tenant/me"),
        ]);

        if (!meRes.ok) {
          localStorage.removeItem("saas_token");
          setCheckingAuth(false);
          router.push("/admin/login");
          return;
        }

        const userData = await meRes.json();
        setUser(userData);

        if (tenantRes.ok) {
          const tenantData = await tenantRes.json();
          setTenant(tenantData);
        }
      } catch (e) {
        setCheckingAuth(false);
        router.push("/admin/login");
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
    return () => clearTimeout(fallbackTimer);
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="surface-card p-6 text-center border border-border-theme">
          <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
          <p className="font-semibold text-sm text-content-primary">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: FiGrid },
    { label: "Produtos", href: "/admin/produtos", icon: FiBox },
    { label: "Categorias", href: "/admin/categorias", icon: FiFolder },
    { label: "Pedidos & Produção", href: "/admin/pedidos", icon: FiShoppingCart },
    { label: "Temas & Aparência", href: "/admin/aparencia", icon: FiSliders },
    { label: "Integrações & Módulos", href: "/admin/integracoes", icon: FiCpu },
    { label: "Domínio Próprio (SSL)", href: "/admin/dominio", icon: FiGlobe },
  ];

  return (
    <div className="min-h-screen flex bg-bg-main text-content-primary transition-colors duration-200">
      {/* Sidebar Oficial da Plataforma */}
      <aside className="w-64 bg-bg-surface border-r border-border-theme flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Logo & Info do Tenant */}
          <div className="p-5 border-b border-border-theme">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-brand-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <FiLayers className="w-4 h-4" />
              </div>
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-brand-primary">
                Painel do Lojista
              </span>
            </div>
            <h2 className="font-heading text-base font-bold text-content-primary truncate">
              {tenant?.name || "Minha Loja"}
            </h2>
            <div className="text-[11px] text-content-secondary flex items-center gap-1.5 mt-1">
              <span>Subdomínio: <strong className="text-content-primary font-mono">{tenant?.slug || "loja"}</strong></span>
              {tenant?.domain_verified && (
                <span className="text-status-success font-semibold flex items-center gap-0.5" title="SSL Automático Ativo">
                  <FiCheckCircle className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-content-secondary hover:text-content-primary hover:bg-bg-subtle"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-white" : "text-content-secondary"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé Sidebar */}
        <div className="p-4 border-t border-border-theme bg-bg-subtle/50 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="btn-brand-outline w-full text-xs py-2 text-center flex items-center justify-center gap-1.5"
          >
            <span>Ver Vitrine Pública</span>
            <FiExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("saas_token");
              router.push("/admin/login");
            }}
            className="w-full text-center text-xs text-status-error font-semibold py-2 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <FiLogOut className="w-3.5 h-3.5" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Admin */}
        <header className="bg-bg-surface border-b border-border-theme px-6 py-3.5 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="font-heading text-sm font-bold text-content-primary hidden sm:inline-block">
              Gestão de E-commerce
            </span>
            <span className="badge-theme badge-brand text-[10px]">
              Multi-Tenant Cloud
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-content-secondary hidden md:inline-block">
              Usuário: <strong className="text-content-primary">{user?.name || "Administrador"}</strong>
            </span>
            {/* Botão de Alternância de Tema */}
            <ThemeToggle />
            <Link
              href="/"
              target="_blank"
              className="btn-brand text-xs py-1.5 px-3 rounded-md flex items-center gap-1.5"
            >
              <span>Ver Loja</span>
              <FiExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Conteúdo Dinâmico */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
