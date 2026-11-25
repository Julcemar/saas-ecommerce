"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem, TenantInfo } from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";
import {
  FiX,
  FiTrash2,
  FiShoppingCart,
  FiArrowRight,
  FiCheck,
  FiPlus,
  FiMinus,
  FiTruck,
} from "react-icons/fi";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tenant?: TenantInfo | null;
  themeOverride?: StorefrontTheme;
}

export default function CartDrawer({ isOpen, onClose, tenant, themeOverride }: CartDrawerProps) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const activeTheme = themeOverride || getActiveTheme(tenant || null);
  const classes = getThemeClasses(activeTheme);

  // Sincroniza itens do carrinho
  const syncCart = () => {
    try {
      const raw = localStorage.getItem("saas_cart");
      if (raw) {
        setCartItems(JSON.parse(raw));
      } else {
        setCartItems([]);
      }
    } catch (_) {
      setCartItems([]);
    }
  };

  useEffect(() => {
    syncCart();
    window.addEventListener("cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  // Fecha com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Atualiza quantidade com recálculo de atacado
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }

    const updated = [...cartItems];
    const item = updated[index];
    item.quantity = newQty;

    // Recalcula preço unitário baseado nas faixas de atacado do produto
    let unitPrice = Number(item.product.base_price);
    if (item.product.wholesale_tiers && item.product.wholesale_tiers.length > 0) {
      const sorted = [...item.product.wholesale_tiers].sort(
        (a, b) => a.min_quantity - b.min_quantity
      );
      for (const tier of sorted) {
        if (newQty >= tier.min_quantity) {
          unitPrice = Number(tier.unit_price);
        }
      }
    }
    item.unit_price = unitPrice;

    setCartItems(updated);
    localStorage.setItem("saas_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-updated"));
  };

  // Remove item
  const removeItem = (index: number) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    localStorage.setItem("saas_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-updated"));
  };

  // Limpar carrinho
  const clearCart = () => {
    localStorage.removeItem("saas_cart");
    setCartItems([]);
    window.dispatchEvent(new Event("cart-updated"));
  };

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

  const freeShippingThreshold = tenant?.settings_json?.free_shipping_min_amount || 299;
  const missingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  if (!isOpen) return null;

  // Estilos temáticos de topo e gaveta
  const getDrawerStyles = () => {
    switch (activeTheme) {
      case "clean_minimal":
        return {
          panel: "w-screen max-w-md bg-white border-l border-neutral-200/80 flex flex-col shadow-2xl",
          header: "p-4 bg-white border-b border-neutral-100 flex items-center justify-between text-neutral-900",
          headerIcon: "w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center",
          closeBtn: "w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer",
          freeShippingBar: "p-3 bg-neutral-50 border-b border-neutral-100 text-xs",
          progressBg: "bg-neutral-200",
          progressBar: "bg-[var(--color-primary)]",
          cardItem: "p-3 bg-white border border-neutral-200/80 rounded-2xl shadow-xs flex gap-3 relative",
          itemThumb: "w-16 h-16 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center shrink-0 overflow-hidden",
        };

      case "editorial_studio":
        return {
          panel: "w-screen max-w-md bg-white border-l border-neutral-300 flex flex-col shadow-2xl",
          header: "p-4 bg-neutral-950 text-white border-b border-neutral-800 flex items-center justify-between",
          headerIcon: "w-8 h-8 rounded-none bg-neutral-800 text-white flex items-center justify-center",
          closeBtn: "w-8 h-8 rounded-none bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors cursor-pointer",
          freeShippingBar: "p-3 bg-neutral-100 border-b border-neutral-200 text-xs",
          progressBg: "bg-neutral-300",
          progressBar: "bg-neutral-950",
          cardItem: "p-3.5 bg-white border border-neutral-200 rounded-none shadow-none flex gap-3 relative",
          itemThumb: "w-16 h-16 rounded-none border border-neutral-300 bg-neutral-50 flex items-center justify-center shrink-0 overflow-hidden",
        };

      case "neo_brutalist":
        return {
          panel: "w-screen max-w-md bg-white border-l-4 border-black flex flex-col shadow-[-8px_0px_0px_rgba(0,0,0,0.2)]",
          header: "p-4 bg-[var(--color-primary)] text-white border-b-2 border-black flex items-center justify-between",
          headerIcon: "w-8 h-8 rounded-lg bg-[var(--color-secondary)] text-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#111111]",
          closeBtn: "w-8 h-8 rounded-lg bg-white text-black hover:bg-gray-100 border-2 border-black shadow-[2px_2px_0px_#111111] flex items-center justify-center font-black transition-transform cursor-pointer",
          freeShippingBar: "p-3 bg-amber-50 border-b-2 border-black text-xs font-semibold",
          progressBg: "bg-gray-200 border border-black/40",
          progressBar: "bg-[var(--color-primary)]",
          cardItem: "p-3 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111] flex gap-3 relative",
          itemThumb: "w-16 h-16 rounded-lg border-2 border-black bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden",
        };

      case "modern_commerce":
      default:
        return {
          panel: "w-screen max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl",
          header: "p-4 bg-white border-b border-slate-200/80 flex items-center justify-between text-slate-900",
          headerIcon: "w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center",
          closeBtn: "w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer",
          freeShippingBar: "p-3 bg-slate-50 border-b border-slate-200 text-xs font-medium",
          progressBg: "bg-slate-200",
          progressBar: "bg-[var(--color-primary)]",
          cardItem: "p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex gap-3 relative",
          itemThumb: "w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden",
        };
    }
  };

  const themeStyle = getDrawerStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Painel da Gaveta Deslizante */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className={themeStyle.panel}>
          {/* 1. TOPO DA GAVETA */}
          <div className={themeStyle.header}>
            <div className="flex items-center gap-2.5">
              <div className={themeStyle.headerIcon}>
                <FiShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className={classes.cardTitle}>
                  Meu Carrinho
                </h3>
                <span className="text-[10px] opacity-75 font-medium block">
                  {totalQuantity} {totalQuantity === 1 ? "item adicionado" : "itens adicionados"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={themeStyle.closeBtn}
              aria-label="Fechar carrinho"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* 2. BARRA DE BENEFÍCIO FRETE GRÁTIS */}
          <div className={themeStyle.freeShippingBar}>
            {subtotal >= freeShippingThreshold ? (
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <FiCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>🎉 Parabéns! Você atingiu o <strong>Frete Grátis</strong>!</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-neutral-600">
                  <span className="flex items-center gap-1">
                    <FiTruck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    Faltam <strong>R$ {missingForFreeShipping.toFixed(2).replace(".", ",")}</strong> para <strong>Frete Grátis</strong>
                  </span>
                  <span className="font-bold text-[var(--color-primary)]">{freeShippingProgress}%</span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${themeStyle.progressBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${themeStyle.progressBar}`}
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. CORPO / LISTA DE ITENS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-3xl">
                  🛒
                </div>
                <div>
                  <h4 className={classes.cardTitle}>
                    Seu carrinho está vazio
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                    Explore nosso catálogo de brindes personalizados com descontos progressivos por quantidade!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    const el = document.getElementById("catalogo");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                    else router.push("/#catalogo");
                  }}
                  className={classes.btnPrimary}
                >
                  ⚡ Explorar Catálogo
                </button>
              </div>
            ) : (
              cartItems.map((item, idx) => {
                const itemTotal = item.unit_price * item.quantity;
                const imgUrl = item.product.image_url || "/uploads/jestein/garrafa-inox-500ml.jpg";

                return (
                  <div key={idx} className={themeStyle.cardItem}>
                    {/* Miniatura do Produto */}
                    <div className={themeStyle.itemThumb}>
                      <img
                        src={imgUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className="font-medium text-xs text-neutral-900 truncate">
                        {item.product.name}
                      </h4>

                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xs font-bold text-neutral-900">
                          R$ {item.unit_price.toFixed(2).replace(".", ",")}
                        </span>
                        {item.product.base_price > item.unit_price && (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            (Desconto Atacado)
                          </span>
                        )}
                      </div>

                      {/* Personalização gravada */}
                      {item.custom_text && (
                        <div className="mt-1 text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded inline-block truncate max-w-full">
                          ✍️ &ldquo;{item.custom_text}&rdquo;
                        </div>
                      )}

                      {/* Controles de Quantidade */}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className={classes.quantityWrapper}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                            className={classes.quantityBtn}
                            aria-label="Diminuir quantidade"
                          >
                            <FiMinus className="w-3 h-3" />
                          </button>
                          <span className={classes.quantityValue}>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                            className={classes.quantityBtn}
                            aria-label="Aumentar quantidade"
                          >
                            <FiPlus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-semibold text-neutral-900">
                          R$ {itemTotal.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>

                    {/* Botão de Remover Item */}
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="absolute top-2.5 right-2.5 text-neutral-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                      title="Remover do carrinho"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. RODAPÉ DA GAVETA (TOTALIZADORES E CHECKOUT) */}
          {cartItems.length > 0 && (
            <div className="p-4 bg-white border-t border-neutral-200/80 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal dos produtos</span>
                  <span className="font-medium text-neutral-800">
                    R$ {subtotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Frete estimado</span>
                  <span>
                    {subtotal >= freeShippingThreshold ? (
                      <span className="text-emerald-600 font-semibold">Grátis</span>
                    ) : (
                      <span className="text-neutral-500">A calcular no checkout</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                  <span>Total estimado</span>
                  <span className="text-base text-[var(--color-primary)]">
                    R$ {subtotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/checkout");
                  }}
                  className={`w-full ${classes.btnPrimary}`}
                >
                  <span>Finalizar Pedido com Segurança</span>
                  <FiArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-neutral-400 hover:text-rose-600 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Esvaziar carrinho
                  </button>
                  <Link
                    href="/carrinho"
                    onClick={onClose}
                    className="text-neutral-600 hover:text-[var(--color-primary)] text-[11px] font-medium transition-colors"
                  >
                    Ver carrinho completo →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
