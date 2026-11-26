"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchApi,
  CategoryItem,
  ProductItem,
  ProductVariantItem,
  CustomizationFieldItem,
  TenantInfo,
} from "@/lib/api";
import {
  FiArrowLeft,
  FiArrowUp,
  FiArrowDown,
  FiSave,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiStar,
  FiEdit2,
  FiCopy,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiCheck,
  FiBox,
  FiX,
  FiSliders,
} from "react-icons/fi";

function slugify(val: string) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
}

export default function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Campos Básicos
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");

  // Mídia
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Preços
  const [basePrice, setBasePrice] = useState("39.90");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [isPhysical, setIsPhysical] = useState(true);

  // Estoque e Logística
  const [sku, setSku] = useState("");
  const [trackInventory, setTrackInventory] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [allowBackorder, setAllowBackorder] = useState(false);
  const [weightGrams, setWeightGrams] = useState(300);
  const [lengthCm, setLengthCm] = useState(16);
  const [widthCm, setWidthCm] = useState(12);
  const [heightCm, setHeightCm] = useState(10);
  const [productionDays, setProductionDays] = useState(3);

  // Variações
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariantItem[]>([]);

  // Personalização & Atacado (recolhível)
  const [showCustomization, setShowCustomization] = useState(false);
  const [enableText, setEnableText] = useState(false);
  const [textLabel, setTextLabel] = useState("Nome ou Frase para Personalizar");
  const [textMaxLen, setTextMaxLen] = useState(40);
  const [enableArtwork, setEnableArtwork] = useState(false);
  const [tiers, setTiers] = useState<Array<{ min_quantity: number; unit_price: string }>>([]);
  const [enableCustomFields, setEnableCustomFields] = useState(false);
  const [customFields, setCustomFields] = useState<CustomizationFieldItem[]>([]);

  // SEO (recolhível)
  const [showSeo, setShowSeo] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // Sidebar (Status & Organização)
  const [statusVal, setStatusVal] = useState<"ACTIVE" | "DRAFT">("ACTIVE");
  const [isFeatured, setIsFeatured] = useState(false);
  const [badgeLabel, setBadgeLabel] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Modal Rápido de Categoria (+ Nova / Editar selecionada)
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catModalEditing, setCatModalEditing] = useState<CategoryItem | null>(null);
  const [catModalName, setCatModalName] = useState("");
  const [catModalSlug, setCatModalSlug] = useState("");
  const [catModalParentId, setCatModalParentId] = useState("");
  const [catModalSaving, setCatModalSaving] = useState(false);

  const loadCategoriesAndTenant = async () => {
    try {
      const [catRes, tenantRes] = await Promise.all([
        fetchApi("/categories/admin"),
        fetchApi("/tenant/me"),
      ]);
      if (catRes.ok) {
        const cats: CategoryItem[] = await catRes.json();
        setCategories(cats);
        if (mode === "create" && cats.length > 0 && !categoryId) {
          setCategoryId(cats[0].id);
        }
      }
      if (tenantRes.ok) {
        setTenant(await tenantRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCategoriesAndTenant();
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    async function loadProduct() {
      try {
        const res = await fetchApi(`/products/admin/${productId}`);
        if (!res.ok) throw new Error("Produto não encontrado nesta loja.");
        const p: ProductItem = await res.json();

        setName(p.name || "");
        setSlug(p.slug || "");
        setSlugEdited(true);
        setShortDesc(p.short_description || "");
        setDescription(p.description || "");

        const gal =
          p.images_json && p.images_json.length > 0
            ? p.images_json
            : p.image_url
            ? [p.image_url]
            : [];
        setImages(gal);

        setBasePrice(String(p.base_price ?? "0.00"));
        setCompareAtPrice(p.compare_at_price != null ? String(p.compare_at_price) : "");
        setCostPrice(p.cost_price != null ? String(p.cost_price) : "");
        setIsPhysical(p.is_physical ?? true);

        setSku(p.sku || "");
        setTrackInventory(p.track_inventory ?? false);
        setStockQuantity(p.stock_quantity ?? 0);
        setLowStockThreshold(p.low_stock_threshold ?? 5);
        setAllowBackorder(p.allow_backorder ?? false);
        setWeightGrams(p.weight_grams ?? 300);
        setLengthCm(p.length_cm ?? 16);
        setWidthCm(p.width_cm ?? 12);
        setHeightCm(p.height_cm ?? 10);
        setProductionDays(p.production_lead_time_days ?? 0);

        if (p.variants && p.variants.length > 0) {
          setHasVariants(true);
          setVariants(
            p.variants.map((v) => ({
              ...v,
              price_modifier: Number(v.price_modifier || 0),
              final_price: Number(v.final_price || 0),
            }))
          );
        }

        setEnableText(Boolean(p.enable_text_customization));
        setTextLabel(p.text_customization_label || "Nome ou Frase para Personalizar");
        setTextMaxLen(p.text_max_length || 40);
        setEnableArtwork(Boolean(p.enable_artwork_upload));
        if (p.customization_fields && p.customization_fields.length > 0) {
          setEnableCustomFields(true);
          setCustomFields(
            p.customization_fields.map((cf, idx) => ({
              ...cf,
              options: Array.isArray(cf.options) ? cf.options : [],
              additional_price: Number(cf.additional_price || 0),
              position: cf.position ?? idx,
            }))
          );
          setShowCustomization(true);
        }
        setTiers(
          (p.wholesale_tiers || []).map((t) => ({
            min_quantity: t.min_quantity,
            unit_price: String(t.unit_price),
          }))
        );

        setSeoTitle(p.seo_title || "");
        setSeoDescription(p.seo_description || "");
        setStatusVal(p.status === "DRAFT" || p.is_active === false ? "DRAFT" : "ACTIVE");
        setIsFeatured(Boolean(p.is_featured));
        setBadgeLabel(p.badge_label || "");
        setCategoryId(p.category_id || "");
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [mode, productId]);

  // Cálculo de economia promocional
  const discountPct = useMemo(() => {
    const bp = parseFloat(basePrice);
    const cp = parseFloat(compareAtPrice);
    if (!isNaN(bp) && !isNaN(cp) && cp > bp && cp > 0) {
      return Math.round(((cp - bp) / cp) * 100);
    }
    return null;
  }, [basePrice, compareAtPrice]);

  // Categorias organizadas hierarquicamente para o select
  const orderedCategoryOptions = useMemo(() => {
    const roots = categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
    const list: Array<{ id: string; label: string }> = [];
    roots.forEach((r) => {
      list.push({ id: r.id, label: r.name });
      const subs = categories
        .filter((s) => s.parent_id === r.id)
        .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
      subs.forEach((s) => list.push({ id: s.id, label: `↳ ${s.name}` }));
    });
    return list;
  }, [categories]);

  const tenantDomainPreview = useMemo(() => {
    if (tenant?.custom_domain && tenant.domain_verified) {
      return `https://${tenant.custom_domain}`;
    }
    return `https://${tenant?.slug || "minhaloja"}.seusistema.com.br`;
  }, [tenant]);

  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingImages(true);
    setErrorMsg(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetchApi("/uploads?folder=products", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || `Erro ao enviar ${file.name}`);
        }
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    setImages((prev) => [...prev, url]);
    setImageUrlInput("");
  };

  const setAsCover = (idx: number) => {
    if (idx === 0) return;
    const copy = [...images];
    const [picked] = copy.splice(idx, 1);
    copy.unshift(picked);
    setImages(copy);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImageDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const copy = [...images];
    const [moved] = copy.splice(dragIdx, 1);
    copy.splice(targetIdx, 0, moved);
    setImages(copy);
    setDragIdx(null);
  };

  const handleGenerateSku = () => {
    const prefix = (slug || name || "PROD")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSku(`${prefix || "ITEM"}-${rand}`);
  };

  const addVariant = () => {
    const idx = variants.length + 1;
    const baseSku = sku || "VAR";
    setVariants((prev) => [
      ...prev,
      {
        sku: `${baseSku}-V${idx}`,
        name: `Opção ${idx}`,
        attribute_options: { Opção: `Opção ${idx}` },
        price_modifier: 0,
        final_price: parseFloat(basePrice) || 0,
        stock_quantity: trackInventory ? 10 : null,
        weight_grams: weightGrams,
        image_url: null,
        is_active: true,
      },
    ]);
  };

  const updateVariant = (idx: number, patch: Partial<ProductVariantItem>) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const removeVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuickCategorySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatModalSaving(true);
    try {
      const payload = {
        name: catModalName.trim(),
        slug: catModalSlug.trim() || slugify(catModalName),
        parent_id: catModalParentId || null,
        is_active: true,
        ...(catModalEditing ? {} : { display_order: categories.length + 1 }),
      };
      const res = await fetchApi(
        catModalEditing ? `/categories/${catModalEditing.id}` : "/categories",
        {
          method: catModalEditing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar categoria.");
      }
      const saved: CategoryItem = await res.json();
      await loadCategoriesAndTenant();
      setCategoryId(saved.id);
      setCatModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCatModalSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanSlug = slug.trim() || slugify(name);
      const cleanSku = sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`;

      const payload: any = {
        category_id: categoryId || null,
        name: name.trim(),
        slug: cleanSlug,
        sku: cleanSku,
        product_type: hasVariants && variants.length > 0 ? "variable" : "simple",
        short_description: shortDesc.trim() || null,
        description: description.trim() || null,
        base_price: parseFloat(basePrice) || 0,
        compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        image_url: images[0] || null,
        images_json: images,
        status: statusVal,
        is_active: statusVal === "ACTIVE",
        is_featured: isFeatured,
        badge_label: badgeLabel.trim() || null,
        track_inventory: trackInventory,
        stock_quantity: trackInventory ? Number(stockQuantity) || 0 : 0,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        allow_backorder: allowBackorder,
        is_physical: isPhysical,
        weight_grams: Number(weightGrams) || 300,
        length_cm: Number(lengthCm) || 16,
        width_cm: Number(widthCm) || 12,
        height_cm: Number(heightCm) || 10,
        enable_text_customization: enableText,
        text_customization_label: textLabel,
        text_max_length: Number(textMaxLen) || 40,
        enable_artwork_upload: enableArtwork,
        production_lead_time_days: Number(productionDays) || 0,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        wholesale_tiers: tiers
          .filter((t) => t.min_quantity >= 1 && parseFloat(t.unit_price) > 0)
          .map((t) => ({
            min_quantity: Number(t.min_quantity),
            unit_price: parseFloat(t.unit_price),
          })),
        variants: hasVariants
          ? variants.map((v) => ({
              sku: v.sku.trim(),
              name: v.name.trim(),
              attribute_options: v.attribute_options || { Opção: v.name },
              price_modifier: Number(v.price_modifier || 0),
              final_price: Number(v.final_price || 0),
              stock_quantity: v.stock_quantity != null ? Number(v.stock_quantity) : null,
              weight_grams: v.weight_grams != null ? Number(v.weight_grams) : null,
              image_url: v.image_url || null,
              is_active: v.is_active ?? true,
            }))
          : [],
        customization_fields: enableCustomFields
          ? customFields
              .filter((cf) => cf.label.trim())
              .map((cf, idx) => ({
                label: cf.label.trim(),
                field_type: cf.field_type,
                placeholder: cf.placeholder || null,
                options: Array.isArray(cf.options) ? cf.options : [],
                max_length: cf.max_length ? Number(cf.max_length) : null,
                additional_price: Number(cf.additional_price || 0),
                is_required: Boolean(cf.is_required),
                position: idx,
              }))
          : [],
      };

      const res = await fetchApi(
        mode === "edit" ? `/products/${productId}` : "/products",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar produto.");
      }

      const saved: ProductItem = await res.json();
      if (mode === "create") {
        router.push(`/admin/produtos/${saved.id}/editar?saved=1`);
      } else {
        setSuccessMsg("Alterações salvas com sucesso!");
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!productId) return;
    setDuplicating(true);
    try {
      const res = await fetchApi(`/products/${productId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Falha ao duplicar produto.");
      const cloned: ProductItem = await res.json();
      router.push(`/admin/produtos/${cloned.id}/editar`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-10 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando dados do produto...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6 pb-16">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/produtos"
            className="p-2 rounded-lg border border-border-theme bg-bg-surface hover:bg-bg-subtle text-content-primary"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary">
              {mode === "edit" ? name || "Editar Produto" : "Novo Produto"}
            </h1>
            <p className="text-xs text-content-secondary">
              {mode === "edit"
                ? "Edite mídia, preços, estoque, variações e SEO isoladamente para sua loja."
                : "Preencha os detalhes para publicar na vitrine."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "edit" && slug && (
            <Link
              href={`/produto/${slug}`}
              target="_blank"
              className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <FiExternalLink className="w-3.5 h-3.5" />
              <span>Ver na loja</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-brand text-xs py-2.5 px-5 flex items-center gap-1.5 disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            <span>{submitting ? "Salvando..." : mode === "edit" ? "Salvar Alterações" : "Salvar Produto"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-status-error/30 rounded-lg text-xs font-semibold text-status-error flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-status-success/30 rounded-lg text-xs font-semibold text-status-success flex items-center gap-2">
          <FiCheck className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid 2 Colunas (70% / 30%) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA (70% -> 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Informações Básicas */}
          <section className="surface-card p-6 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
            <h2 className="font-heading text-sm font-bold text-content-primary">
              Informações Básicas
            </h2>
            <div>
              <label className="block font-semibold text-content-primary mb-1.5">Título *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (!slugEdited) setSlug(slugify(v));
                }}
                placeholder="Ex: Caneca Térmica Inox Personalizada 500ml"
                className="input-theme w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-primary mb-1.5">
                Resumo / Subtítulo
              </label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="Destaque curto exibido abaixo do título"
                className="input-theme w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-primary mb-1.5">Descrição</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva materiais, dimensões, gravação e diferenciais..."
                className="input-theme w-full resize-y"
              />
            </div>
          </section>

          {/* 2. Mídia (Editável) */}
          <section className="surface-card p-6 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-sm font-bold text-content-primary">Mídia</h2>
                <p className="text-[11px] text-content-secondary">
                  Arraste para reordenar. A primeira imagem é a capa do produto.
                </p>
              </div>
              <label className="btn-outline text-[11px] py-1.5 px-3 cursor-pointer flex items-center gap-1.5">
                <FiUploadCloud className="w-3.5 h-3.5 text-brand-primary" />
                <span>{uploadingImages ? "Enviando..." : "Adicionar Fotos"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleMultiImageUpload}
                />
              </label>
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleImageDrop(idx)}
                    className={`group relative aspect-square rounded-lg border overflow-hidden bg-bg-subtle cursor-move ${
                      idx === 0 ? "border-brand-primary ring-2 ring-brand-primary/20" : "border-border-theme"
                    }`}
                  >
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#084D6E] text-white text-[10px] font-bold">
                        Capa
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-1">
                      {idx !== 0 ? (
                        <button
                          type="button"
                          onClick={() => setAsCover(idx)}
                          className="text-[10px] text-white hover:underline flex items-center gap-1"
                          title="Definir como capa"
                        >
                          <FiStar className="w-3 h-3" />
                          <span>Capa</span>
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="p-1 rounded bg-red-600/90 text-white hover:bg-red-700"
                        title="Excluir foto"
                      >
                        <FiTrash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border-theme rounded-xl p-6 text-center text-content-secondary">
                <FiUploadCloud className="w-7 h-7 mx-auto mb-2 text-brand-primary/70" />
                <p className="text-xs font-medium">Nenhuma imagem adicionada ainda</p>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Ou cole a URL de uma imagem externa (https://...)"
                className="input-theme flex-1 text-[11px]"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="btn-outline text-[11px] py-1.5 px-3"
              >
                Adicionar URL
              </button>
            </div>
          </section>

          {/* 3. Preços */}
          <section className="surface-card p-6 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
            <h2 className="font-heading text-sm font-bold text-content-primary">Preços</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-content-primary mb-1.5">
                  Preço de venda (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="input-theme w-full font-semibold"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-content-primary">Preço "De:" (R$)</label>
                  {discountPct !== null && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-status-success">
                      -{discountPct}% OFF
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="Opcional"
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold text-content-primary mb-1.5">
                  Custo por item (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Uso interno"
                  className="input-theme w-full"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPhysical}
                onChange={(e) => setIsPhysical(e.target.checked)}
                className="w-4 h-4 accent-[#084D6E]"
              />
              <span className="font-medium text-content-primary">
                Produto físico (calcular frete via Melhor Envio)
              </span>
            </label>
          </section>

          {/* 4. Estoque e Logística */}
          <section className="surface-card p-6 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
            <h2 className="font-heading text-sm font-bold text-content-primary">
              Estoque e Logística
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block font-semibold text-content-primary mb-1.5">SKU *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="EX: CAN-INOX-01"
                    className="input-theme flex-1 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="btn-outline text-[11px] py-2 px-3 whitespace-nowrap"
                  >
                    Gerar SKU
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-subtle/60 border border-border-theme">
                <div>
                  <span className="font-semibold text-content-primary block">
                    Controlar quantidade em estoque
                  </span>
                  <span className="text-[10px] text-content-secondary">
                    Desative para itens feitos sob encomenda.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={trackInventory}
                  onChange={(e) => setTrackInventory(e.target.checked)}
                  className="w-4 h-4 accent-[#084D6E] cursor-pointer"
                />
              </div>
            </div>

            {trackInventory && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-bg-subtle/40 border border-border-theme">
                <div>
                  <label className="block font-semibold text-content-primary mb-1">
                    Quantidade disponível
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-content-primary mb-1">
                    Alerta de estoque baixo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="input-theme w-full"
                  />
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowBackorder}
                      onChange={(e) => setAllowBackorder(e.target.checked)}
                      className="w-4 h-4 accent-[#084D6E]"
                    />
                    <span className="font-medium text-content-primary">
                      Permitir venda sem estoque
                    </span>
                  </label>
                </div>
              </div>
            )}

            {isPhysical && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-border-theme">
                <div>
                  <label className="block text-[11px] font-semibold text-content-secondary mb-1">
                    Peso (g)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(Number(e.target.value))}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-content-secondary mb-1">
                    Comp. (cm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lengthCm}
                    onChange={(e) => setLengthCm(Number(e.target.value))}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-content-secondary mb-1">
                    Largura (cm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={widthCm}
                    onChange={(e) => setWidthCm(Number(e.target.value))}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-content-secondary mb-1">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-content-secondary mb-1">
                    Produção (dias)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productionDays}
                    onChange={(e) => setProductionDays(Number(e.target.value))}
                    className="input-theme w-full"
                  />
                </div>
              </div>
            )}
          </section>

          {/* 5. Variações (Editáveis) */}
          <section className="surface-card bg-bg-surface border border-border-theme rounded-xl overflow-hidden text-xs">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-sm font-bold text-content-primary">Variações</h2>
                <p className="text-[11px] text-content-secondary">
                  Adicione opções como tamanho, cor ou capacidade com preço e estoque próprios.
                </p>
              </div>
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasVariants(checked);
                  if (checked && variants.length === 0) addVariant();
                }}
                className="w-4 h-4 accent-[#084D6E] cursor-pointer"
              />
            </div>

            {hasVariants && (
              <div className="px-6 pb-6 pt-2 border-t border-border-theme space-y-3">
                {variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-lg bg-bg-subtle/40 border border-border-theme items-end"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-semibold text-content-secondary mb-1">
                        Nome / Opção
                      </label>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) =>
                          updateVariant(idx, {
                            name: e.target.value,
                            attribute_options: { Opção: e.target.value },
                          })
                        }
                        placeholder="Ex: Tamanho G / Azul"
                        className="input-theme w-full"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-content-secondary mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                        className="input-theme w-full font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-content-secondary mb-1">
                        Preço (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={v.final_price}
                        onChange={(e) =>
                          updateVariant(idx, { final_price: parseFloat(e.target.value) || 0 })
                        }
                        className="input-theme w-full"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-content-secondary mb-1">
                        Estoque
                      </label>
                      <input
                        type="number"
                        value={v.stock_quantity ?? ""}
                        onChange={(e) =>
                          updateVariant(idx, {
                            stock_quantity: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        placeholder="—"
                        className="input-theme w-full"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="p-2 rounded text-status-error hover:bg-red-500/10"
                        title="Remover variação"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  className="btn-outline text-[11px] py-1.5 px-3 flex items-center gap-1"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Adicionar Variação</span>
                </button>
              </div>
            )}
          </section>

          {/* 6. Personalização & Atacado (Bloco Recolhível) */}
          <section className="surface-card bg-bg-surface border border-border-theme rounded-xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowCustomization(!showCustomization)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <FiSliders className="w-4 h-4 text-brand-primary" />
                <div>
                  <h2 className="font-heading text-sm font-bold text-content-primary">
                    Personalização e Tabela de Atacado
                  </h2>
                  <p className="text-[11px] text-content-secondary">
                    Gravação de texto, envio de arte e descontos progressivos por quantidade.
                  </p>
                </div>
              </div>
              {showCustomization ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {showCustomization && (
              <div className="px-6 pb-6 pt-3 border-t border-border-theme space-y-5">
                {/* Construtor de Campos Dinâmicos de Personalização */}
                <div className="p-4 rounded-xl bg-bg-subtle/50 border border-border-theme space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-content-primary block">
                        Este produto permite personalização pelo cliente
                      </span>
                      <span className="text-[11px] text-content-secondary">
                        Crie campos de texto, seleção, cores ou upload de logo exibidos na vitrine.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableCustomFields}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEnableCustomFields(checked);
                        if (checked && customFields.length === 0) {
                          setCustomFields([
                            {
                              label: "Nome ou Frase para Personalizar",
                              field_type: "TEXT",
                              placeholder: "Digite aqui...",
                              options: [],
                              max_length: 40,
                              additional_price: 0,
                              is_required: false,
                              position: 0,
                            },
                          ]);
                        }
                      }}
                      className="w-4 h-4 accent-[#084D6E] cursor-pointer"
                    />
                  </div>

                  {enableCustomFields && (
                    <div className="space-y-3 pt-2 border-t border-border-theme">
                      {customFields.map((cf, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-bg-surface border border-border-theme space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                            <div className="sm:col-span-5">
                              <label className="block text-[10px] font-semibold text-content-secondary mb-1">
                                Rótulo do Campo *
                              </label>
                              <input
                                type="text"
                                value={cf.label}
                                onChange={(e) =>
                                  setCustomFields((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, label: e.target.value } : item
                                    )
                                  )
                                }
                                placeholder="Ex: Nome para gravar"
                                className="input-theme w-full"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-semibold text-content-secondary mb-1">
                                Tipo
                              </label>
                              <select
                                value={cf.field_type}
                                onChange={(e) =>
                                  setCustomFields((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? { ...item, field_type: e.target.value as any }
                                        : item
                                    )
                                  )
                                }
                                className="input-theme w-full"
                              >
                                <option value="TEXT">Texto Curto</option>
                                <option value="TEXTAREA">Texto Longo</option>
                                <option value="SELECT">Lista de Seleção</option>
                                <option value="COLOR_SWATCH">Cores (Swatch)</option>
                                <option value="FILE_UPLOAD">Upload de Arte/Logo</option>
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-semibold text-content-secondary mb-1">
                                Acréscimo (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={cf.additional_price}
                                onChange={(e) =>
                                  setCustomFields((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? { ...item, additional_price: parseFloat(e.target.value) || 0 }
                                        : item
                                    )
                                  )
                                }
                                className="input-theme w-full"
                              />
                            </div>
                            <div className="sm:col-span-2 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const copy = [...customFields];
                                  [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                                  setCustomFields(copy);
                                }}
                                className="p-1.5 rounded border border-border-theme disabled:opacity-30"
                                title="Mover para cima"
                              >
                                <FiArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === customFields.length - 1}
                                onClick={() => {
                                  const copy = [...customFields];
                                  [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                                  setCustomFields(copy);
                                }}
                                className="p-1.5 rounded border border-border-theme disabled:opacity-30"
                                title="Mover para baixo"
                              >
                                <FiArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomFields((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="p-1.5 rounded text-status-error hover:bg-red-500/10"
                                title="Remover campo"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                            {(cf.field_type === "TEXT" || cf.field_type === "TEXTAREA") && (
                              <>
                                <input
                                  type="text"
                                  value={cf.placeholder || ""}
                                  onChange={(e) =>
                                    setCustomFields((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, placeholder: e.target.value } : item
                                      )
                                    )
                                  }
                                  placeholder="Placeholder (ex: Digite o nome...)"
                                  className="input-theme w-full"
                                />
                                <input
                                  type="number"
                                  min="1"
                                  value={cf.max_length ?? ""}
                                  onChange={(e) =>
                                    setCustomFields((prev) =>
                                      prev.map((item, i) =>
                                        i === idx
                                          ? {
                                              ...item,
                                              max_length: e.target.value ? Number(e.target.value) : null,
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  placeholder="Máx. caracteres (ex: 40)"
                                  className="input-theme w-full"
                                />
                              </>
                            )}
                            {(cf.field_type === "SELECT" || cf.field_type === "COLOR_SWATCH") && (
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  value={(cf.options || []).join(", ")}
                                  onChange={(e) =>
                                    setCustomFields((prev) =>
                                      prev.map((item, i) =>
                                        i === idx
                                          ? {
                                              ...item,
                                              options: e.target.value
                                                .split(",")
                                                .map((s) => s.trim())
                                                .filter(Boolean),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  placeholder="Opções separadas por vírgula (ex: Azul, Preto, Dourado)"
                                  className="input-theme w-full"
                                />
                              </div>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cf.is_required}
                                onChange={(e) =>
                                  setCustomFields((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, is_required: e.target.checked } : item
                                    )
                                  )
                                }
                                className="w-4 h-4 accent-[#084D6E]"
                              />
                              <span className="text-[11px] font-medium">Campo obrigatório</span>
                            </label>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          setCustomFields((prev) => [
                            ...prev,
                            {
                              label: "",
                              field_type: "TEXT",
                              placeholder: "",
                              options: [],
                              max_length: 40,
                              additional_price: 0,
                              is_required: false,
                              position: prev.length,
                            },
                          ])
                        }
                        className="btn-outline text-[11px] py-1.5 px-3 flex items-center gap-1"
                      >
                        <FiPlus className="w-3.5 h-3.5" />
                        <span>Adicionar Campo de Personalização</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2.5 p-3 rounded-lg bg-bg-subtle/50 border border-border-theme cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableText}
                      onChange={(e) => setEnableText(e.target.checked)}
                      className="w-4 h-4 accent-[#084D6E]"
                    />
                    <span className="font-semibold text-content-primary">
                      Permitir texto personalizado
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-lg bg-bg-subtle/50 border border-border-theme cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableArtwork}
                      onChange={(e) => setEnableArtwork(e.target.checked)}
                      className="w-4 h-4 accent-[#084D6E]"
                    />
                    <span className="font-semibold text-content-primary">
                      Permitir upload de arte / logo
                    </span>
                  </label>
                </div>

                {enableText && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold mb-1">Rótulo do campo</label>
                      <input
                        type="text"
                        value={textLabel}
                        onChange={(e) => setTextLabel(e.target.value)}
                        className="input-theme w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">Máx. caracteres</label>
                      <input
                        type="number"
                        min="1"
                        value={textMaxLen}
                        onChange={(e) => setTextMaxLen(Number(e.target.value))}
                        className="input-theme w-full"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-content-primary">Faixas de Atacado</span>
                    <button
                      type="button"
                      onClick={() =>
                        setTiers((prev) => [
                          ...prev,
                          {
                            min_quantity: prev.length > 0 ? prev[prev.length - 1].min_quantity + 10 : 10,
                            unit_price: basePrice,
                          },
                        ])
                      }
                      className="text-[11px] font-semibold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                      <span>Adicionar Faixa</span>
                    </button>
                  </div>
                  {tiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={t.min_quantity}
                        onChange={(e) => {
                          const copy = [...tiers];
                          copy[i].min_quantity = Number(e.target.value);
                          setTiers(copy);
                        }}
                        className="input-theme w-28"
                        placeholder="Qtd mín."
                      />
                      <span className="text-content-secondary">un. → R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={t.unit_price}
                        onChange={(e) => {
                          const copy = [...tiers];
                          copy[i].unit_price = e.target.value;
                          setTiers(copy);
                        }}
                        className="input-theme w-32"
                      />
                      <button
                        type="button"
                        onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}
                        className="p-1.5 text-status-error"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 7. SEO (Bloco Recolhível com SERP Preview) */}
          <section className="surface-card bg-bg-surface border border-border-theme rounded-xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
              <div>
                <h2 className="font-heading text-sm font-bold text-content-primary">
                  Otimização para Buscadores (SEO)
                </h2>
                <p className="text-[11px] text-content-secondary">
                  Personalize como este produto aparece no Google.
                </p>
              </div>
              {showSeo ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {showSeo && (
              <div className="px-6 pb-6 pt-3 border-t border-border-theme space-y-4">
                {/* SERP Preview */}
                <div className="p-4 rounded-lg bg-bg-subtle/60 border border-border-theme space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-content-secondary block mb-1">
                    Prévia no Google
                  </span>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                    {tenantDomainPreview}/produto/{slug || "slug-do-produto"}
                  </div>
                  <div className="text-sm font-semibold text-[#1a0dab] dark:text-sky-400 truncate">
                    {seoTitle || name || "Título do Produto"} | {tenant?.name || "Loja"}
                  </div>
                  <div className="text-xs text-content-secondary line-clamp-2">
                    {seoDescription || shortDesc || description || "Descrição do produto para mecanismos de busca."}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-content-primary mb-1">URL / Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugEdited(true);
                    }}
                    className="input-theme w-full font-mono"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-semibold text-content-primary">Título SEO</label>
                    <span className="text-[10px] text-content-secondary">{seoTitle.length}/70</span>
                  </div>
                  <input
                    type="text"
                    maxLength={70}
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={name}
                    className="input-theme w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-semibold text-content-primary">Meta Descrição</label>
                    <span className="text-[10px] text-content-secondary">
                      {seoDescription.length}/160
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={160}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Resumo atrativo para melhorar o clique no Google..."
                    className="input-theme w-full resize-none"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* COLUNA DIREITA (30% -> 4 cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* Status e Ações */}
          <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
            <h2 className="font-heading text-sm font-bold text-content-primary">Status</h2>

            <select
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value as "ACTIVE" | "DRAFT")}
              className="input-theme w-full font-semibold"
            >
              <option value="ACTIVE">Ativo (visível na loja)</option>
              <option value="DRAFT">Rascunho (oculto)</option>
            </select>

            <label className="flex items-center justify-between p-3 rounded-lg bg-bg-subtle/60 border border-border-theme cursor-pointer">
              <span className="font-medium text-content-primary">Destacar na página inicial</span>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-[#084D6E]"
              />
            </label>

            <div>
              <label className="block font-semibold text-content-primary mb-1">
                Selo / Badge na Vitrine
              </label>
              <input
                type="text"
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value)}
                placeholder="Ex: Mais Vendido, HOT, Novo"
                className="input-theme w-full"
              />
            </div>

            {mode === "edit" && (
              <div className="pt-3 border-t border-border-theme">
                <button
                  type="button"
                  disabled={duplicating}
                  onClick={handleDuplicate}
                  className="btn-outline w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <FiCopy className="w-3.5 h-3.5" />
                  <span>{duplicating ? "Duplicando..." : "Duplicar Produto"}</span>
                </button>
              </div>
            )}
          </section>

          {/* Organização (Categoria + Modal Rápido) */}
          <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold text-content-primary">Organização</h2>
              <button
                type="button"
                onClick={() => {
                  setCatModalEditing(null);
                  setCatModalName("");
                  setCatModalSlug("");
                  setCatModalParentId("");
                  setCatModalOpen(true);
                }}
                className="text-[11px] font-semibold text-brand-primary hover:underline flex items-center gap-1"
              >
                <FiPlus className="w-3 h-3" />
                <span>Nova categoria</span>
              </button>
            </div>

            <div>
              <label className="block font-semibold text-content-primary mb-1.5">
                Categoria / Subcategoria
              </label>
              <div className="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-theme flex-1"
                >
                  <option value="">Sem categoria</option>
                  {orderedCategoryOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {categoryId && (
                  <button
                    type="button"
                    title="Editar categoria selecionada"
                    onClick={() => {
                      const found = categories.find((c) => c.id === categoryId);
                      if (!found) return;
                      setCatModalEditing(found);
                      setCatModalName(found.name);
                      setCatModalSlug(found.slug);
                      setCatModalParentId(found.parent_id || "");
                      setCatModalOpen(true);
                    }}
                    className="p-2 rounded-lg border border-border-theme bg-bg-subtle hover:bg-brand-primary hover:text-white transition-colors"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </form>

      {/* Modal Rápido de Categoria */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-bg-surface border border-border-theme rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-content-primary">
                {catModalEditing ? "Editar Categoria" : "Nova Categoria Rápida"}
              </h3>
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="p-1.5 rounded hover:bg-bg-subtle"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCategorySave} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={catModalName}
                  onChange={(e) => {
                    setCatModalName(e.target.value);
                    if (!catModalEditing) setCatModalSlug(slugify(e.target.value));
                  }}
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Slug *</label>
                <input
                  type="text"
                  required
                  value={catModalSlug}
                  onChange={(e) => setCatModalSlug(e.target.value)}
                  className="input-theme w-full font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Categoria Pai (opcional)</label>
                <select
                  value={catModalParentId}
                  onChange={(e) => setCatModalParentId(e.target.value)}
                  className="input-theme w-full"
                >
                  <option value="">— Categoria Principal —</option>
                  {categories
                    .filter((c) => !c.parent_id && c.id !== catModalEditing?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={catModalSaving}
                  className="btn-brand text-xs py-2 px-4"
                >
                  {catModalSaving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
