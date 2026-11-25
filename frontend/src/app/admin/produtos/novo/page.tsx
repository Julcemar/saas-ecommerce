"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import {
  FiBox,
  FiArrowLeft,
  FiDollarSign,
  FiPlus,
  FiTrash2,
  FiSliders,
  FiClock,
  FiSave,
  FiAlertCircle,
} from "react-icons/fi";

export default function AdminNewProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos básicos
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("39.90");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");

  // Logística & Dimensões
  const [weightGrams, setWeightGrams] = useState(350);
  const [lengthCm, setLengthCm] = useState(16);
  const [widthCm, setWidthCm] = useState(12);
  const [heightCm, setHeightCm] = useState(10);
  const [badgeLabel, setBadgeLabel] = useState("Mais Vendido");
  const [isFeatured, setIsFeatured] = useState(true);

  // Personalização
  const [enableText, setEnableText] = useState(true);
  const [textLabel, setTextLabel] = useState("Nome ou Frase para Gravação");
  const [textMaxLen, setTextMaxLen] = useState(40);
  const [enableArtwork, setEnableArtwork] = useState(true);
  const [productionDays, setProductionDays] = useState(3);

  // Faixas de atacado progressivo
  const [tiers, setTiers] = useState<Array<{ min_quantity: number; unit_price: string }>>([
    { min_quantity: 1, unit_price: "39.90" },
    { min_quantity: 4, unit_price: "34.90" },
    { min_quantity: 36, unit_price: "29.90" },
  ]);

  useEffect(() => {
    async function loadCats() {
      try {
        const res = await fetchApi("/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0) setCategoryId(data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCats();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    const genSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(genSlug);
  };

  const addTier = () => {
    const lastQty = tiers.length > 0 ? tiers[tiers.length - 1].min_quantity : 1;
    setTiers([...tiers, { min_quantity: lastQty + 10, unit_price: "25.00" }]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: "min_quantity" | "unit_price", val: any) => {
    const copy = [...tiers];
    copy[index] = { ...copy[index], [field]: val };
    setTiers(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name,
      slug,
      sku,
      category_id: categoryId || null,
      base_price: parseFloat(basePrice),
      compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
      image_url: imageUrl || null,
      short_description: shortDesc || null,
      description: description || null,
      weight_grams: weightGrams,
      length_cm: lengthCm,
      width_cm: widthCm,
      height_cm: heightCm,
      badge_label: badgeLabel || null,
      is_featured: isFeatured,
      enable_text_customization: enableText,
      text_customization_label: textLabel,
      text_max_length: textMaxLen,
      enable_artwork_upload: enableArtwork,
      production_lead_time_days: productionDays,
      wholesale_tiers: tiers.map((t) => ({
        min_quantity: t.min_quantity,
        unit_price: parseFloat(t.unit_price),
      })),
    };

    try {
      const res = await fetchApi("/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar produto.");
      }

      router.push("/admin/produtos");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
            <FiBox className="w-5 h-5 text-brand-primary" />
            <span>Cadastrar Novo Produto</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Configure dados do item, regras de gravação industrial e faixas de atacado progressivo.
          </p>
        </div>
        <Link href="/admin/produtos" className="btn-brand-outline text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5">
          <FiArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Catálogo</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-status-error/30 rounded-lg text-xs font-semibold text-status-error flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloco 1: Informações Básicas */}
        <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl space-y-4">
          <h3 className="font-heading text-sm font-bold text-content-primary border-b border-border-theme pb-3">
            1. Dados Gerais do Produto
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-content-primary mb-1.5">Nome do Produto *</label>
              <input
                type="text"
                required
                placeholder="Ex: Caneca Térmica Inox Gravada a Laser"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input-theme w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-primary mb-1.5">Slug URL *</label>
              <input
                type="text"
                required
                placeholder="caneca-termica-inox"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="input-theme w-full font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-primary mb-1.5">Código SKU *</label>
              <input
                type="text"
                required
                placeholder="CAN-INOX-001"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="input-theme w-full font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-primary mb-1.5">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-theme w-full"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-content-primary mb-1.5">Badge de Destaque</label>
              <input
                type="text"
                placeholder="Ex: Mais Vendido, HOT, Kit Corporativo"
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value)}
                className="input-theme w-full"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-content-primary mb-1.5">URL da Imagem de Destaque</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="input-theme w-full"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-content-primary mb-1.5">Descrição Curta</label>
              <input
                type="text"
                placeholder="Aço inoxidável 500ml com dupla camada de isolamento térmico"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                className="input-theme w-full"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-content-primary mb-1.5">Descrição Completa</label>
              <textarea
                rows={3}
                placeholder="Descreva especificações técnicas, métodos de personalização e acabamento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-theme w-full"
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Faixas de Atacado Progressivo */}
        <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-border-theme pb-3">
            <div>
              <h3 className="font-heading text-sm font-bold text-content-primary flex items-center gap-1.5">
                <FiDollarSign className="w-4 h-4 text-brand-primary" />
                <span>2. Tabela de Atacado Progressivo</span>
              </h3>
              <p className="text-[11px] text-content-secondary mt-0.5">
                Defina preços unitários decrescentes conforme o volume adquirido pelo cliente.
              </p>
            </div>
            <button
              type="button"
              onClick={addTier}
              className="btn-brand-outline text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>Adicionar Faixa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4">
            <div>
              <label className="block font-semibold text-content-primary mb-1.5">Preço Base Unitário (1 un.) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={basePrice}
                onChange={(e) => {
                  setBasePrice(e.target.value);
                  if (tiers.length > 0 && tiers[0].min_quantity === 1) {
                    updateTier(0, "unit_price", e.target.value);
                  }
                }}
                className="input-theme w-full font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-primary mb-1.5">Preço "De" (Riscado - Opcional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 49.90"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="input-theme w-full"
              />
            </div>
          </div>

          {/* Faixas */}
          <div className="space-y-2">
            {tiers.map((tier, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-bg-subtle/70 border border-border-theme rounded-lg text-xs"
              >
                <span className="font-semibold text-content-primary w-16">Faixa {idx + 1}:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-content-secondary">A partir de:</span>
                  <input
                    type="number"
                    min={1}
                    value={tier.min_quantity}
                    onChange={(e) => updateTier(idx, "min_quantity", parseInt(e.target.value) || 1)}
                    className="input-theme w-20 text-center font-semibold"
                  />
                  <span className="text-content-secondary">unidades</span>
                </div>

                <div className="flex items-center gap-1.5 ml-4">
                  <span className="text-content-secondary">Preço Unitário: R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tier.unit_price}
                    onChange={(e) => updateTier(idx, "unit_price", e.target.value)}
                    className="input-theme w-24 text-center font-bold text-brand-primary"
                  />
                </div>

                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => removeTier(idx)}
                    className="p-1 text-status-error hover:bg-red-500/10 rounded transition-colors ml-auto"
                    title="Remover Faixa"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bloco 3: Regras de Personalização */}
        <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl space-y-4">
          <h3 className="font-heading text-sm font-bold text-content-primary border-b border-border-theme pb-3 flex items-center gap-1.5">
            <FiSliders className="w-4 h-4 text-brand-primary" />
            <span>3. Personalização Industrial & Prazos</span>
          </h3>

          <div className="space-y-4 text-xs">
            <label className="flex items-center gap-2.5 font-semibold text-content-primary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableText}
                onChange={(e) => setEnableText(e.target.checked)}
                className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
              />
              <span>Habilitar gravação de texto (nome, frase ou dedicatória)</span>
            </label>

            {enableText && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="block font-semibold text-content-primary mb-1">Rótulo do Campo de Texto</label>
                  <input
                    type="text"
                    value={textLabel}
                    onChange={(e) => setTextLabel(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-content-primary mb-1">Limite Máximo de Caracteres</label>
                  <input
                    type="number"
                    value={textMaxLen}
                    onChange={(e) => setTextMaxLen(parseInt(e.target.value) || 40)}
                    className="input-theme w-full"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2.5 font-semibold text-content-primary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableArtwork}
                onChange={(e) => setEnableArtwork(e.target.checked)}
                className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
              />
              <span>Habilitar upload de arte / logotipo do cliente (PNG, JPG, SVG, PDF)</span>
            </label>

            <div className="pt-2">
              <label className="block font-semibold text-content-primary mb-1">
                Prazo Adicional de Produção Industrial (Dias Úteis)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={productionDays}
                  onChange={(e) => setProductionDays(parseInt(e.target.value) || 0)}
                  className="input-theme w-32 font-bold"
                />
                <span className="text-content-secondary">dias</span>
              </div>
              <p className="text-[11px] text-content-secondary mt-1">
                Dias somados automaticamente ao prazo de frete na calculadora da loja.
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Submissão */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/produtos" className="btn-brand-outline text-xs py-2.5 px-5 rounded-lg">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-brand text-xs py-2.5 px-7 rounded-lg flex items-center gap-2"
          >
            <FiSave className="w-4 h-4" />
            <span>{submitting ? "Cadastrando..." : "Salvar Produto no Catálogo"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
