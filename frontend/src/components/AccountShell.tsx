"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiPackage,
  FiUser,
  FiX,
} from "react-icons/fi";
import StorefrontShell from "@/components/StorefrontShell";
import {
  clearCustomerToken,
  CustomerProfile,
  fetchApi,
  fetchCustomerApi,
  getCustomerToken,
  TenantInfo,
} from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";

interface AccountContextValue {
  customer: CustomerProfile | null;
  tenant: TenantInfo | null;
  theme: StorefrontTheme;
  refreshCustomer: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue>({
  customer: null,
  tenant: null,
  theme: "modern_commerce",
  refreshCustomer: async () => {},
});

export function useAccount() {
  return useContext(AccountContext);
}

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [theme, setTheme] = useState<StorefrontTheme>("modern_commerce");
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadAccount = async () => {
    const token = getCustomerToken();
    if (!token) {
      setLoading(false);
      router.replace(`/conta/login?redirect=${encodeURIComponent(pathname || "/minha-conta/pedidos")}`);
      return;
    }

    try {
      const [tenantRes, meRes] = await Promise.all([
        fetchApi("/tenant/me"),
        fetchCustomerApi("/storefront/me"),
      ]);

      if (tenantRes.ok) {
        const tData = await tenantRes.json();
        setTenant(tData);
        setTheme(getActiveTheme(tData));
      }

      if (!meRes.ok) {
        clearCustomerToken();
        router.replace(`/conta/login?redirect=${encodeURIComponent(pathname || "/minha-conta/pedidos")}`);
        return;
      }

      const meData = await meRes.json();
      setCustomer(meData);
    } catch {
      router.replace("/conta/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await fetchCustomerApi("/storefront/auth/logout", { method: "POST" });
    } catch {
      // ignora erro de rede
    }
    clearCustomerToken();
    router.push("/");
  };

  const classes = getThemeClasses(theme);

  const navItems = [
    { href: "/minha-conta/pedidos", label: "Meus Pedidos", icon: FiPackage },
    { href: "/minha-conta/dados", label: "Meus Dados", icon: FiUser },
    { href: "/minha-conta/enderecos", label: "Meus Endereços", icon: FiMapPin },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <AccountContext.Provider
      value={{
        customer,
        tenant,
        theme,
        refreshCustomer: loadAccount,
      }}
    >
      <StorefrontShell tenant={tenant} themeOverride={theme}>
        {loading ? (
          <div className="py-16 text-center text-xs opacity-70">
            Carregando sua conta...
          </div>
        ) : !customer ? null : (
          <div className="space-y-6">
            {/* Cabeçalho da Conta + Navegação Mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight">
                  Minha Conta
                </h1>
                <p className="text-xs opacity-70 mt-0.5">
                  Olá, <strong>{customer.full_name}</strong> ({customer.email})
                </p>
              </div>

              {/* Botão Drawer Mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className={`${classes.btnOutline} md:hidden justify-between w-full sm:w-auto`}
              >
                <span className="flex items-center gap-2">
                  {mobileMenuOpen ? <FiX className="w-4 h-4" /> : <FiMenu className="w-4 h-4" />}
                  <span>Menu da Conta</span>
                </span>
              </button>
            </div>

            {/* Abas Rápidas Mobile */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all ${
                      active
                        ? classes.btnPrimary
                        : classes.btnOutline
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Drawer Mobile expandido (se clicado) */}
            {mobileMenuOpen && (
              <div className={`${classes.card} md:hidden p-3 space-y-1`}>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        active
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "hover:bg-black/5"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left cursor-pointer"
                >
                  <FiLogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}

            {/* Grid Desktop: Sidebar + Conteúdo */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <aside className="hidden md:block md:col-span-3 sticky top-24">
                <div className={`${classes.card} p-3 space-y-1`}>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                          theme === "editorial_studio" ? "rounded-none" : "rounded-xl"
                        } ${
                          active
                            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-xs"
                            : "hover:bg-black/5"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  <div className={`my-2 border-t ${classes.divider}`} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left ${
                      theme === "editorial_studio" ? "rounded-none" : "rounded-xl"
                    }`}
                  >
                    <FiLogOut className="w-4 h-4 shrink-0" />
                    <span>Sair</span>
                  </button>
                </div>
              </aside>

              <section className="md:col-span-9 min-w-0">{children}</section>
            </div>
          </div>
        )}
      </StorefrontShell>
    </AccountContext.Provider>
  );
}
