"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StorefrontShell from "@/components/StorefrontShell";
import WholesaleTable from "@/components/WholesaleTable";
import CustomizationBox from "@/components/CustomizationBox";
import { ProductItem, TenantInfo, fetchApi } from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";
import {
  FiArrowLeft,
  FiShoppingCart,
  FiTruck,
  FiShield,
  FiClock,
  FiCheck,
  FiPlus,
  FiMinus,
  FiTag,
} from "react-icons/fi";

export default function SingleProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<StorefrontTheme>("modern_commerce");

  // Estados do pedido do produto
  const [quantity, setQuantity] = useState<number>(1);
  const [customText, setCustomText] = useState("");
  const [artworkUrl, setArtworkUrl] = useState<string | undefined>(undefined);
  const [artworkFilename, setArtworkFilename] = useState<string | undefined>(undefined);

  // Simulação de frete
  const [cep, setCep] = useState("");
  const [shippingResult, setShippingResult] = useState<any[] | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProductData() {
      try {
        const [tenantRes, prodRes] = await Promise.all([
          fetchApi("/tenant/me"),
          fetchApi(`/products/${slug}`),
        ]);

        if (tenantRes.ok) {
          const tData = await tenantRes.json();
          setTenant(tData);
          setTheme(getActiveTheme(tData));
        }

        if (prodRes.ok) {
          const pData = await prodRes.json();
          setProduct(pData);
        } else {
          setError("Produto não encontrado.");
        }
      } catch (err: any) {
        setError("Erro ao carregar informações do produto.");
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadProductData();
    }
  }, [slug]);

  const classes = getThemeClasses(theme);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="p-6 text-center">
          <div className="animate-spin text-3xl mb-2 text-brand-primary">⚡</div>
          <p className="font-semibold text-xs text-content-primary">Carregando detalhes do produto...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <StorefrontShell tenant={tenant} themeOverride={theme} pageTitle="Produto Indisponível">
        <div className={`${classes.card} max-w-md mx-auto py-12 px-6 text-center`}>
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl mx-auto mb-4">
            📦
          </div>
          <h2 className={`${classes.cardTitle} text-lg mb-2 text-rose-600`}>Produto Indisponível</h2>
          <p className="text-xs text-neutral-500 mb-6">{error || "Este produto não existe ou foi desativado."}</p>
          <Link href="/#catalogo" className={classes.btnPrimary}>
            Voltar ao Catálogo
          </Link>
        </div>
      </StorefrontShell>
    );
  }

  // Preço unitário dinâmico conforme faixas de atacado
  let unitPrice = Number(product.base_price);
  if (product.wholesale_tiers && product.wholesale_tiers.length > 0) {
    const sorted = [...product.wholesale_tiers].sort((a, b) => a.min_quantity - b.min_quantity);
    for (const tier of sorted) {
      if (quantity >= tier.min_quantity) {
        unitPrice = Number(tier.unit_price);
      }
    }
  }

  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    try {
      const existing = localStorage.getItem("saas_cart");
      const cart = existing ? JSON.parse(existing) : [];

      const newItem = {
        product,
        quantity,
        unit_price: unitPrice,
        custom_text: customText || undefined,
        artwork_url: artworkUrl,
        artwork_filename: artworkFilename,
      };

      cart.push(newItem);
      localStorage.setItem("saas_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));

      router.push("/carrinho");
    } catch (e) {
      alert("Erro ao adicionar produto ao carrinho.");
    }
  };

  const handleSimulateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setShippingError("Digite um CEP válido com 8 dígitos.");
      return;
    }
    setShippingLoading(true);
    setShippingError(null);
    try {
      const payload = {
        dest_zip: cleanCep,
        items: [
          {
            id: product.id,
            name: product.name,
            quantity: quantity,
            unit_price: Number(unitPrice),
            weight_grams: product.weight_grams || 350,
            length_cm: product.length_cm || 16,
            width_cm: product.width_cm || 12,
            height_cm: product.height_cm || 10,
          },
        ],
      };
      const res = await fetchApi("/shipping/calculate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setShippingResult(data.options || []);
      } else {
        setShippingError("Não foi possível calcular o frete para este CEP.");
      }
    } catch (err) {
      setShippingError("Erro de comunicação ao calcular frete.");
    } finally {
      setShippingLoading(false);
    }
  };

  const imageAspect = theme === "editorial_studio" ? "aspect-[4/5]" : "aspect-square";

  return (
    <StorefrontShell tenant={tenant} themeOverride={theme} pageTitle={product.name}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-xs text-neutral-500 flex items-center gap-2">
          <Link href="/#catalogo" className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-1">
            <FiArrowLeft className="w-3 h-3" />
            <span>Catálogo</span>
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium truncate max-w-xs">{product.name}</span>
        </div>

        {/* Grade do Produto */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: Imagem & Galeria (5 colunas) */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`${classes.card} p-3 overflow-hidden relative ${imageAspect}`}>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl bg-neutral-100 rounded-xl">
                  📦
                </div>
              )}

              {product.badge_label && (
                <span className={`absolute top-5 left-5 ${classes.badgeBrand} backdrop-blur-md`}>
                  🔥 {product.badge_label}
                </span>
              )}
            </div>

            {/* Informações de Garantia & Produção */}
            <div className={`${classes.card} p-4 space-y-2`}>
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
                <FiShield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Garantia de Satisfação & Prévia Digital</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Nossa equipe revisa cada pedido antes da personalização. Você recebe o mockup digital para aprovação final antes da produção.
              </p>
            </div>
          </div>

          {/* Coluna Direita: Informações, Atacado & Personalização (7 colunas) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                SKU: {product.sku}
              </span>
              <h1 className={`${classes.cardTitle} text-2xl sm:text-3xl mt-1 leading-snug`}>
                {product.name}
              </h1>
              {product.short_description && (
                <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                  {product.short_description}
                </p>
              )}
            </div>

            {/* Preço e Totalizador */}
            <div className={`${classes.card} p-5 flex flex-wrap items-center justify-between gap-4`}>
              <div>
                <span className="text-[11px] text-neutral-500 block">Preço unitário:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-neutral-900">
                    R$ {unitPrice.toFixed(2).replace(".", ",")}
                  </span>
                  {product.compare_at_price && product.compare_at_price > unitPrice && (
                    <span className="text-xs text-neutral-400 line-through">
                      R$ {Number(product.compare_at_price).toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>
                {unitPrice < Number(product.base_price) && (
                  <span className={classes.badgeSuccess}>
                    Economia de Atacado Aplicada
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[11px] text-neutral-500 block">Total ({quantity} un):</span>
                <span className="text-2xl font-black text-[var(--color-primary)]">
                  R$ {totalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* Tabela de Preços no Atacado (se houver faixas) */}
            {product.wholesale_tiers && product.wholesale_tiers.length > 0 && (
              <div className={classes.card}>
                <WholesaleTable
                  tiers={product.wholesale_tiers}
                  basePrice={Number(product.base_price)}
                  selectedQuantity={quantity}
                  onSelectTierQuantity={(minQty) => setQuantity(minQty)}
                />
              </div>
            )}

            {/* Módulo de Personalização (Texto / Upload de Arte) */}
            {(product.enable_text_customization || product.enable_artwork_upload) && (
              <div className={classes.card}>
                <CustomizationBox
                  product={product}
                  customText={customText}
                  onCustomTextChange={setCustomText}
                  artworkUrl={artworkUrl}
                  artworkFilename={artworkFilename}
                  onArtworkUploaded={(url, filename) => {
                    setArtworkUrl(url);
                    setArtworkFilename(filename);
                  }}
                  onArtworkRemoved={() => {
                    setArtworkUrl(undefined);
                    setArtworkFilename(undefined);
                  }}
                />
              </div>
            )}

            {/* Quantidade e Botão de Compra */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className={classes.quantityWrapper}>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className={`${classes.quantityBtn} w-10 h-10`}
                  aria-label="Diminuir"
                >
                  <FiMinus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`${classes.quantityValue} w-14 text-sm font-bold bg-transparent outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className={`${classes.quantityBtn} w-10 h-10`}
                  aria-label="Aumentar"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className={`flex-1 ${classes.btnPrimary} py-3.5 text-sm`}
              >
                <FiShoppingCart className="w-4 h-4" />
                <span>Adicionar ao Carrinho • R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
              </button>
            </div>

            {/* Simulação de Frete Rápida */}
            <div className={`${classes.card} p-5 space-y-3`}>
              <div className="flex items-center gap-2">
                <FiTruck className="w-4 h-4 text-[var(--color-primary)]" />
                <h4 className={classes.cardTitle}>Simular Frete para seu Endereço</h4>
              </div>

              <form onSubmit={handleSimulateShipping} className="flex gap-2">
                <input
                  type="text"
                  placeholder="00000-000"
                  maxLength={9}
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className={classes.input}
                />
                <button
                  type="submit"
                  disabled={shippingLoading}
                  className={classes.btnSecondary}
                >
                  {shippingLoading ? "Calculando..." : "Calcular"}
                </button>
              </form>

              {shippingError && (
                <p className="text-xs text-rose-600 font-medium">{shippingError}</p>
              )}

              {shippingResult && shippingResult.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {shippingResult.map((opt, sIdx) => (
                    <div key={sIdx} className="flex justify-between items-center text-xs py-1 border-b border-neutral-100 last:border-b-0">
                      <div>
                        <span className="font-semibold text-neutral-800">{opt.service_name} ({opt.carrier})</span>
                        <span className="text-[11px] text-neutral-400 block">Prazo: até {opt.delivery_days} dias úteis</span>
                      </div>
                      <span className="font-bold text-neutral-900">
                        R$ {Number(opt.price).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descrição Longa */}
            {product.description && (
              <div className={`${classes.card} p-5 space-y-2`}>
                <h4 className={classes.cardTitle}>Descrição do Produto</h4>
                <div className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StorefrontShell>
  );
}
