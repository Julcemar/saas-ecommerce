"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiChevronDown,
  FiLogOut,
  FiMapPin,
  FiPackage,
  FiUser,
} from "react-icons/fi";
import {
  clearCustomerToken,
  CustomerProfile,
  fetchCustomerApi,
  getCustomerToken,
} from "@/lib/api";
import { StorefrontTheme } from "@/lib/themeTokens";

interface CustomerAccountMenuProps {
  activeTheme: StorefrontTheme;
}

export default function CustomerAccountMenu({ activeTheme }: CustomerAccountMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadSession = async () => {
    const token = getCustomerToken();
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetchCustomerApi("/storefront/me");
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
      } else {
        clearCustomerToken();
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
    const handleSync = () => loadSession();
    window.addEventListener("customer-auth-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("customer-auth-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await fetchCustomerApi("/storefront/auth/logout", { method: "POST" });
    } catch {
      // ignora erro de rede no logout
    }
    clearCustomerToken();
    setCustomer(null);
    if (pathname?.startsWith("/minha-conta")) {
      router.push("/");
    }
  };

  const redirectQuery =
    pathname === "/checkout" || pathname === "/carrinho"
      ? "?redirect=/checkout"
      : "";

  const loginHref = `/conta/login${redirectQuery}`;
  const registerHref = `/conta/cadastro${redirectQuery}`;

  if (loading) {
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs opacity-60">
        <FiUser className="w-4 h-4" />
      </div>
    );
  }

  // Estado deslogado
  if (!customer) {
    switch (activeTheme) {
      case "clean_minimal":
        return (
          <div className="flex items-center gap-2">
            <Link
              href={loginHref}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <FiUser className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </Link>
            <Link
              href={registerHref}
              className="hidden md:inline-flex text-[11px] font-medium text-neutral-500 hover:text-[var(--color-primary)] transition-colors"
            >
              Criar conta
            </Link>
          </div>
        );

      case "editorial_studio":
        return (
          <div className="flex items-center gap-3">
            <Link
              href={loginHref}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:text-neutral-950 px-2.5 py-1.5 transition-colors"
            >
              <FiUser className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </Link>
            <Link
              href={registerHref}
              className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              Cadastrar
            </Link>
          </div>
        );

      case "neo_brutalist":
        return (
          <div className="flex items-center gap-2">
            <Link
              href={loginHref}
              className="bg-white hover:bg-gray-100 text-black border-2 border-black font-black text-xs px-3 py-2 rounded-lg shadow-[2px_2px_0px_#111111] flex items-center gap-1.5"
            >
              <FiUser className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </Link>
          </div>
        );

      case "modern_commerce":
      default:
        return (
          <div className="flex items-center gap-2">
            <Link
              href={loginHref}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <FiUser className="w-4 h-4" />
              <span>Entrar</span>
            </Link>
            <Link
              href={registerHref}
              className="hidden lg:inline-flex text-[11px] font-semibold text-slate-500 hover:text-[var(--color-primary)] transition-colors"
            >
              Cadastre-se
            </Link>
          </div>
        );
    }
  }

  // Estado logado
  const firstName = (customer.full_name || "Cliente").trim().split(/\s+/)[0];

  const triggerClass =
    activeTheme === "editorial_studio"
      ? "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-800 hover:text-neutral-950 px-3 py-2 border border-neutral-300 rounded-none bg-white transition-colors cursor-pointer"
      : activeTheme === "neo_brutalist"
      ? "flex items-center gap-1.5 text-xs font-black text-black bg-white hover:bg-gray-100 px-3 py-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_#111111] cursor-pointer"
      : activeTheme === "clean_minimal"
      ? "flex items-center gap-1.5 text-xs font-medium text-neutral-800 hover:text-neutral-950 px-3.5 py-2 rounded-full bg-neutral-100/80 hover:bg-neutral-200/70 transition-colors cursor-pointer"
      : "flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 transition-colors cursor-pointer";

  const dropdownClass =
    activeTheme === "editorial_studio"
      ? "absolute right-0 mt-2 w-56 bg-white border border-neutral-300 rounded-none shadow-xl py-1.5 z-50"
      : activeTheme === "neo_brutalist"
      ? "absolute right-0 mt-2 w-56 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_#111111] py-1.5 z-50"
      : "absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <FiUser className="w-3.5 h-3.5 text-[var(--color-primary)]" />
        <span className="max-w-[120px] truncate">Olá, {firstName}</span>
        <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={dropdownClass} role="menu">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">{customer.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate">{customer.email}</p>
          </div>

          <Link
            href="/minha-conta/pedidos"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] transition-colors"
            role="menuitem"
          >
            <FiPackage className="w-4 h-4" />
            <span>Meus Pedidos</span>
          </Link>

          <Link
            href="/minha-conta/dados"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] transition-colors"
            role="menuitem"
          >
            <FiUser className="w-4 h-4" />
            <span>Meus Dados</span>
          </Link>

          <Link
            href="/minha-conta/enderecos"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] transition-colors"
            role="menuitem"
          >
            <FiMapPin className="w-4 h-4" />
            <span>Endereços</span>
          </Link>

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
              role="menuitem"
            >
              <FiLogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
