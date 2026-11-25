"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StorefrontShell from "@/components/StorefrontShell";
import { CartItem, TenantInfo, fetchApi } from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";
import {
  FiShoppingCart,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiArrowRight,
  FiTruck,
  FiCheck,
  FiArrowLeft,
  FiTag,
  FiShield,
} from "react-icons/fi";

export default function CartPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<StorefrontTheme>("modern_commerce");

  // Simulação de frete dinâmico no carrinho
  const [cep, setCep] = useState("");
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<any | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const tenantRes = await fetchApi("/tenant/me");
        if (tenantRes.ok) {
          const tData = await tenantRes.json();
          setTenant(tData);
          setTheme(getActiveTheme(tData));
        }

        const raw = localStorage.getItem("saas_cart");
        if (raw) {
          setCartItems(JSON.parse(raw));
        }
      } catch (e) {
        console.error("Erro ao carregar dados do carrinho:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleCartSync = () => {
      try {
        const raw = localStorage.getItem("saas_cart");
        if (raw) setCartItems(JSON.parse(raw));
        else setCartItems([]);
      } catch (_) {
        setCartItems([]);
      }
    };

    window.addEventListener("cart-updated", handleCartSync);
    window.addEventListener("storage", handleCartSync);
    return () => {
      window.removeEventListener("cart-updated", handleCartSync);
      window.removeEventListener("storage", handleCartSync);
    };
  }, []);

  const classes = getThemeClasses(theme);

  const handleCalculateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setShippingError("Digite um CEP válido com 8 dígitos.");
      return;
    }
    setLoadingShipping(true);
    setShippingError(null);
    try {
      const payload = {
        dest_zip: cleanCep,
        items: cartItems.map((ci) => ({
          id: ci.product.id,
          name: ci.product.name,
          quantity: ci.quantity,
          unit_price: Number(ci.unit_price),
          weight_grams: ci.product.weight_grams || 350,
          length_cm: ci.product.length_cm || 16,
          width_cm: ci.product.width_cm || 12,
          height_cm: ci.product.height_cm || 10,
        })),
      };

      const res = await fetchApi("/shipping/calculate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const opts = data.options || [];
        setShippingOptions(opts);
        if (opts.length > 0) {
          setSelectedShipping(opts[0]);
        }
      } else {
        setShippingError("Não foi possível calcular as tarifas de frete.");
      }
    } catch (err) {
      setShippingError("Erro de comunicação ao cotar frete.");
    } finally {
      setLoadingShipping(false);
    }
  };

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
      const sorted = [...item.product.wholesale_tiers].sort((a, b) => a.min_quantity - b.min_quantity);
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

  const removeItem = (index: number) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    localStorage.setItem("saas_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const freeShippingThreshold = tenant?.settings_json?.free_shipping_min_amount || 299;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingCost = isFreeShipping ? 0 : selectedShipping ? Number(selectedShipping.price) : 25.0;
  const total = subtotal + shippingCost;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="p-6 text-center">
          <div className="animate-spin text-3xl mb-2 text-brand-primary">⚡</div>
          <p className="font-semibold text-xs text-content-primary">Carregando carrinho...</p>
        </div>
      </div>
    );
  }

  return (
    <StorefrontShell tenant={tenant} themeOverride={theme} pageTitle="Meu Carrinho">
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/#catalogo"
                className="text-xs text-neutral-500 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Continuar comprando</span>
              </Link>
            </div>
            <h1 className={`${classes.cardTitle} text-xl sm:text-2xl mt-1`}>
              Meu Carrinho de Compras
            </h1>
          </div>
          <span className={classes.badge}>
            {totalQuantity} {totalQuantity === 1 ? "item" : "itens"}
          </span>
        </div>

        {cartItems.length === 0 ? (
          <div className={`${classes.card} text-center py-16 px-6 max-w-lg mx-auto`}>
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-3xl mx-auto mb-4">
              🛒
            </div>
            <h3 className={`${classes.cardTitle} text-lg mb-2`}>Seu carrinho está vazio</h3>
            <p className="text-xs text-neutral-500 mb-6">
              Adicione produtos com opções de personalização e aproveite nossos descontos no atacado.
            </p>
            <Link href="/#catalogo" className={classes.btnPrimary}>
              <span>Ver Catálogo de Produtos</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna Esquerda: Itens do Carrinho (7 colunas) */}
            <div className="lg:col-span-7 space-y-4">
              {cartItems.map((item, idx) => {
                const itemTotal = item.unit_price * item.quantity;
                const imgUrl = item.product.image_url || "/uploads/jestein/garrafa-inox-500ml.jpg";

                return (
                  <div key={idx} className={`${classes.card} p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between relative`}>
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 bg-neutral-100 rounded-xl overflow-hidden flex-shrink-0 border border-neutral-200/80">
                        <img
                          src={imgUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Informações do Produto & Personalização */}
                      <div className="space-y-1">
                        <h4 className="font-semibold text-xs sm:text-sm text-neutral-900">
                          {item.product.name}
                        </h4>
                        <div className="text-xs text-neutral-500 flex items-center gap-2">
                          <span>Unitário:</span>
                          <strong className="text-neutral-900">
                            R$ {item.unit_price.toFixed(2).replace(".", ",")}
                          </strong>
                          {item.product.base_price > item.unit_price && (
                            <span className={classes.badgeSuccess}>
                              Atacado
                            </span>
                          )}
                        </div>

                        {/* Detalhes da personalização */}
                        {item.custom_text && (
                          <div className="mt-1 text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                            ✍️ <strong>Gravação:</strong> &ldquo;{item.custom_text}&rdquo;
                          </div>
                        )}

                        {item.artwork_filename && (
                          <div className="mt-1 text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md block">
                            🎨 <strong>Arte:</strong> {item.artwork_filename}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantidade & Subtotal */}
                    <div className="flex sm:flex-col justify-between sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0 gap-3">
                      <div className={classes.quantityWrapper}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className={classes.quantityBtn}
                          aria-label="Diminuir"
                        >
                          <FiMinus className="w-3 h-3" />
                        </button>
                        <span className={classes.quantityValue}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className={classes.quantityBtn}
                          aria-label="Aumentar"
                        >
                          <FiPlus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block sm:hidden">Total item</span>
                        <span className="text-sm font-bold text-neutral-900">
                          R$ {itemTotal.toFixed(2).replace(".", ",")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className={classes.btnDanger}
                        title="Remover produto"
                      >
                        <FiTrash2 className="w-3.5 h-3.5 inline mr-1" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Bloco de Frete no Carrinho */}
              <div className={`${classes.card} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <FiTruck className="w-4 h-4 text-[var(--color-primary)]" />
                  <h4 className={classes.cardTitle}>Calcular Frete e Prazo</h4>
                </div>
                <form onSubmit={handleCalculateShipping} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite seu CEP (ex: 80010-000)"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    maxLength={9}
                    className={classes.input}
                  />
                  <button
                    type="submit"
                    disabled={loadingShipping}
                    className={classes.btnSecondary}
                  >
                    {loadingShipping ? "Calculando..." : "Calcular"}
                  </button>
                </form>

                {shippingError && (
                  <p className="text-xs text-rose-600 mt-2 font-medium">{shippingError}</p>
                )}

                {shippingOptions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold text-neutral-600 uppercase">
                      Opções disponíveis:
                    </p>
                    {shippingOptions.map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedShipping?.service_code === opt.service_code
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                            : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="cart_shipping"
                            checked={selectedShipping?.service_code === opt.service_code}
                            onChange={() => setSelectedShipping(opt)}
                            className="text-[var(--color-primary)]"
                          />
                          <div>
                            <span className="font-semibold text-neutral-900 block">
                              {opt.service_name} ({opt.carrier})
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              Entrega em até {opt.delivery_days} dias úteis
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-neutral-900">
                          {isFreeShipping ? "Grátis" : `R$ ${Number(opt.price).toFixed(2).replace(".", ",")}`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita: Resumo Financeiro do Pedido (5 colunas) */}
            <div className="lg:col-span-5 space-y-4">
              <div className={`${classes.card} p-6 space-y-4`}>
                <h3 className={`${classes.cardTitle} border-b border-neutral-100 pb-3`}>
                  Resumo do Pedido
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal ({totalQuantity} {totalQuantity === 1 ? "item" : "itens"})</span>
                    <span className="font-medium text-neutral-900">
                      R$ {subtotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-600 items-center">
                    <span className="flex items-center gap-1">
                      <FiTruck className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Frete</span>
                    </span>
                    <span className="font-medium text-neutral-900">
                      {isFreeShipping ? (
                        <span className={classes.badgeSuccess}>Grátis</span>
                      ) : (
                        `R$ ${shippingCost.toFixed(2).replace(".", ",")}`
                      )}
                    </span>
                  </div>

                  {isFreeShipping && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-[11px] text-emerald-800 flex items-center gap-2">
                      <FiCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Parabéns! Sua compra atingiu o valor de <strong>Frete Grátis</strong>.</span>
                    </div>
                  )}

                  <div className="border-t border-neutral-200/80 pt-3 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-neutral-900">Total a Pagar</span>
                    <span className="text-xl font-black text-[var(--color-primary)]">
                      R$ {total.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => router.push("/checkout")}
                    className={`w-full ${classes.btnPrimary} py-3 text-sm`}
                  >
                    <span>Avançar para Checkout Seguro</span>
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Garantias */}
                <div className="pt-3 border-t border-neutral-100 space-y-2 text-[11px] text-neutral-500">
                  <div className="flex items-center gap-2">
                    <FiShield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Ambiente criptografado e 100% seguro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiTag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Descontos de atacado aplicados automaticamente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StorefrontShell>
  );
}
