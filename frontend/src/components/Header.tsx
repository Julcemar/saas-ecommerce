"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TenantInfo } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import CartDrawer from "@/components/CartDrawer";
import CustomerAccountMenu from "@/components/CustomerAccountMenu";

interface HeaderProps {
  tenant?: TenantInfo | null;
  cartCount?: number;
}

export default function Header({ tenant, cartCount = 0 }: HeaderProps) {
  const [currentCartCount, setCurrentCartCount] = useState(cartCount);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const updateCount = () => {
      try {
        const raw = localStorage.getItem("saas_cart");
        if (raw) {
          const items = JSON.parse(raw);
          const total = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
          setCurrentCartCount(total);
        } else {
          setCurrentCartCount(0);
        }
      } catch (e) {
        setCurrentCartCount(0);
      }
    };
    updateCount();
    window.addEventListener("storage", updateCount);
    window.addEventListener("cart-updated", updateCount);
    return () => {
      window.removeEventListener("storage", updateCount);
      window.removeEventListener("cart-updated", updateCount);
    };
  }, []);

  const storeName = tenant?.name || "JESTEIN PERSONALIZADOS";
  const whatsapp = tenant?.settings_json?.whatsapp_phone || "5511999999999";

  return (
    <header className="sticky top-0 z-50 bg-bg-surface border-b border-border-theme transition-colors duration-200">
      {/* 1. Topbar */}
      <div className="bg-bg-subtle text-content-secondary text-xs font-semibold py-1.5 px-4 border-b border-border-theme">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span>🚚 Envio p/ todo Brasil</span>
            <span className="opacity-40">•</span>
            <span className="text-brand-accent">⚡ Descontos Progressivos no Atacado</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`https://wa.me/${whatsapp}?text=Olá,%20gostaria%20de%20um%20orçamento%20em%20lote.`}
              target="_blank"
              rel="noreferrer"
              className="text-status-success hover:underline flex items-center gap-1"
            >
              💬 WhatsApp B2B
            </a>
            <Link href="/admin" className="text-content-secondary hover:text-content-primary">
              ⚙️ Painel Lojista
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Header Principal */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={storeName} className="h-10 object-contain" />
          ) : (
            <div className="bg-brand-primary text-white px-3 py-1 font-heading text-lg font-bold rounded-lg uppercase tracking-tight shadow-sm">
              {storeName}
            </div>
          )}
        </Link>

        {/* Busca */}
        <div className="hidden md:flex flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Buscar canecas, camisetas, squeezes corporativos..."
            className="input-theme w-full pr-10 text-xs"
          />
          <button className="absolute right-2 top-2 text-xs font-bold px-2 py-0.5 bg-bg-subtle border border-border-theme rounded text-content-primary">
            🔍
          </button>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3">
          <CustomerAccountMenu activeTheme="modern_commerce" />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="btn-brand py-2 px-3.5 text-xs flex items-center gap-2 rounded-lg cursor-pointer select-none"
            title="Abrir carrinho de compras"
          >
            <span>🛒 Carrinho</span>
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {currentCartCount}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Barra de Categorias e CTA */}
      <div className="bg-bg-subtle/50 border-t border-border-theme px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto text-xs font-semibold gap-3">
          <div className="flex items-center gap-4 text-content-secondary">
            <Link href="/" className="hover:text-brand-primary whitespace-nowrap">
              ≡ Todos os Produtos
            </Link>
            <Link href="/#canecas" className="hover:text-brand-primary whitespace-nowrap">
              Canecas
            </Link>
            <Link href="/#camisetas" className="hover:text-brand-primary whitespace-nowrap">
              Camisetas
            </Link>
            <Link href="/#kits" className="hover:text-brand-primary whitespace-nowrap">
              Kits Corporativos
            </Link>
            <Link href="/#laser" className="hover:text-brand-primary whitespace-nowrap">
              Gravação a Laser
            </Link>
          </div>
          <a
            href={`https://wa.me/${whatsapp}?text=Olá,%20gostaria%20de%20atendimento%20corporativo%20B2B.`}
            target="_blank"
            rel="noreferrer"
            className="badge-theme badge-brand whitespace-nowrap cursor-pointer"
          >
            ⚡ Atacado B2B Especial
          </a>
        </div>
      </div>

      {/* Gaveta Lateral de Carrinho (Cart Drawer) */}
      <CartDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tenant={tenant}
      />
    </header>
  );
}
