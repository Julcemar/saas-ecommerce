"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { fetchApi, TenantInfo, NavigationItem, NavigationSubItem } from "@/lib/api";
import InteractiveHeroBanner, { BannerData, BannerConfig } from "@/components/InteractiveHeroBanner";
import {
  FiCheck,
  FiSave,
  FiSliders,
  FiImage,
  FiUpload,
  FiRefreshCw,
  FiEye,
  FiMenu,
  FiPlus,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
  FiCornerDownRight,
  FiTag,
  FiPackage,
  FiLink,
  FiChevronDown,
  FiLayers,
  FiExternalLink,
} from "react-icons/fi";

const DEFAULT_BANNER: BannerData = {
  badge_1: "⚡ CAMPANHA ESPECIAL DE FIM DE ANO",
  badge_2: "URGENTE",
  title_prefix: "",
  title_highlight: "Sua Marca Sempre Presente!",
  title_suffix: "Brindes Corporativos e Presentes Sob Medida",
  description:
    "Canecas, camisetas, canetas gravadas a laser, ecobags, squeezes e kits corporativos completos de alta durabilidade com sua identidade visual. Descontos progressivos automáticos por quantidade e envio com rastreio para todo o Brasil.",
  btn_1_text: "🚀 EXPLORAR CATÁLOGO",
  btn_1_url: "#catalogo",
  btn_2_text: "💬 ORÇAMENTO RÁPIDO NO WHATSAPP",
  btn_2_url: "https://wa.me/5541997098905",
  highlight_1: "✓ Prévia virtual gratuita antes da produção",
  highlight_2: "✓ Desconto por volume",
  highlight_3: "✓ Pix D+0 ou até 12x",
  banner_image_url: "/themes/neo_brutalist/jestein_sticker_transparent.png",
  config_json: {
    bg_color_start: "#0052B4",
    bg_color_end: "#002F6C",
    has_halftone_pattern: true,
    badge_1_bg: "#FFD100",
    badge_1_color: "#000000",
    badge_2_bg: "#D92027",
    badge_2_color: "#FFFFFF",
    title_highlight_color: "#FFD100",
    title_suffix_color: "#FFFFFF",
    description_color: "#FFFFFF",
    btn_1_bg: "#FFD100",
    btn_1_color: "#000000",
    btn_2_bg: "#FFFFFF",
    btn_2_color: "#000000",
    checkmarks_color: "#FFFFFF",
    floating_effect: true,
    floating_speed: "normal",
    floating_amplitude: 10,
  },
};

export default function AparenciaPage() {
  const [activeTab, setActiveTab] = useState<"banner" | "navigation" | "theme">("banner");
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [banner, setBanner] = useState<BannerData>(DEFAULT_BANNER);

  // Lê aba padrão da URL (?tab=theme) se presente
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam === "theme" || tabParam === "temas") {
        setActiveTab("theme");
      }
    }
  }, []);

  // Estados de Tema geral
  const [primaryColor, setPrimaryColor] = useState("#084D6E");
  const [secondaryColor, setSecondaryColor] = useState("#00B4D8");
  const [selectedTheme, setSelectedTheme] = useState<"clean_minimal" | "modern_commerce" | "editorial_studio">("modern_commerce");
  const [savingTheme, setSavingTheme] = useState(false);

  // Estados de Logotipo da Empresa
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Estados do Menu Superior & Navegação
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [savingNav, setSavingNav] = useState(false);
  const [previewDropdown, setPreviewDropdown] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [tenantRes, bannerRes, navRes, catRes, prodRes] = await Promise.all([
          fetchApi("/tenant/me"),
          fetchApi("/storefront/banner"),
          fetchApi("/storefront/navigation"),
          fetchApi("/categories"),
          fetchApi("/products"),
        ]);

        if (tenantRes.ok) {
          const data: TenantInfo = await tenantRes.json();
          setTenant(data);
          if (data.primary_color) setPrimaryColor(data.primary_color);
          if (data.secondary_color) setSecondaryColor(data.secondary_color);
          if (data.logo_url) setLogoUrl(data.logo_url);
          if (data.settings_json && (data.settings_json as any).theme) {
            setSelectedTheme((data.settings_json as any).theme);
          }
        }

        if (bannerRes.ok) {
          const bData = await bannerRes.json();
          if (bData) {
            setBanner({
              ...DEFAULT_BANNER,
              ...bData,
              config_json: {
                ...DEFAULT_BANNER.config_json,
                ...(bData.config_json || {}),
              },
            });
          }
        }

        if (navRes.ok) {
          const nData = await navRes.json();
          if (Array.isArray(nData)) setNavItems(nData);
        }

        if (catRes.ok) {
          const cData = await catRes.json();
          if (Array.isArray(cData)) setCategories(cData);
        }

        if (prodRes.ok) {
          const pData = await prodRes.json();
          if (Array.isArray(pData)) setProducts(pData);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Atualizador de propriedades do banner
  const updateBannerField = (field: keyof BannerData, value: any) => {
    setBanner((prev) => ({ ...prev, [field]: value }));
  };

  const updateBannerConfig = (field: keyof BannerConfig, value: any) => {
    setBanner((prev) => ({
      ...prev,
      config_json: {
        ...(prev.config_json || {}),
        [field]: value,
      },
    }));
  };

  // Upload de Imagem do Banner
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("saas_token") : null;
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("Falha no upload da imagem.");

      const data = await res.json();
      if (data.url) {
        updateBannerField("banner_image_url", data.url);
      }
    } catch (err: any) {
      alert(err.message || "Erro no upload.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Salvar Banner
  const handleSaveBanner = async () => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetchApi("/storefront/banner", {
        method: "PUT",
        body: JSON.stringify(banner),
      });

      if (!res.ok) throw new Error("Erro ao salvar banner.");

      setSuccessMsg("Banner da página inicial atualizado com sucesso!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Falha ao salvar banner.");
    } finally {
      setSaving(false);
    }
  };

  // Resetar Banner para o Padrão do Vídeo
  const handleResetToDefault = () => {
    if (confirm("Deseja restaurar todos os textos, cores e imagem para o modelo original do vídeo?")) {
      setBanner(DEFAULT_BANNER);
    }
  };

  // Upload do Logotipo da Empresa
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("saas_token") : null;
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Falha ao enviar arquivo de logotipo.");
      }

      const data = await res.json();
      const newLogoUrl = data.url;
      setLogoUrl(newLogoUrl);

      // Salva imediatamente nas configurações da loja
      const saveRes = await fetchApi("/tenant/settings", {
        method: "PUT",
        body: JSON.stringify({
          logo_url: newLogoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          settings_json: {
            ...(tenant?.settings_json || {}),
            theme: selectedTheme,
          },
        }),
      });

      if (saveRes.ok) {
        const updated = await saveRes.json();
        setTenant(updated);
        setSuccessMsg("Logotipo da empresa atualizado e salvo com sucesso!");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || "Erro no upload do logotipo.");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // Remover Logotipo
  const handleRemoveLogo = async () => {
    if (!confirm("Deseja remover o logotipo? A loja voltará a exibir o nome da empresa em texto estilizado.")) return;

    setUploadingLogo(true);
    setSuccessMsg(null);
    try {
      const saveRes = await fetchApi("/tenant/settings", {
        method: "PUT",
        body: JSON.stringify({
          logo_url: null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          settings_json: {
            ...(tenant?.settings_json || {}),
            theme: selectedTheme,
          },
        }),
      });

      if (saveRes.ok) {
        const updated = await saveRes.json();
        setTenant(updated);
        setLogoUrl(null);
        setSuccessMsg("Logotipo removido com sucesso!");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao remover logotipo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Salvar Tema e Aparência da Loja
  const handleSaveTheme = async () => {
    setSavingTheme(true);
    setSuccessMsg(null);
    try {
      const res = await fetchApi("/tenant/settings", {
        method: "PUT",
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl,
          settings_json: {
            ...(tenant?.settings_json || {}),
            theme: selectedTheme,
          },
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar tema da loja.");

      const updated = await res.json();
      setTenant(updated);
      setSuccessMsg("Tema visual, logotipo e paleta da loja atualizados com sucesso!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Falha ao salvar tema.");
    } finally {
      setSavingTheme(false);
    }
  };

  // --- MANIPULADORES DO MENU SUPERIOR (2 NÍVEIS) ---
  const handleAddNavItem = () => {
    const newItem: NavigationItem = {
      id: `nav-${Date.now()}`,
      label: "NOVO ITEM",
      type: "custom_link",
      target_id: null,
      url: "/#catalogo",
      children: [],
    };
    setNavItems((prev) => [...prev, newItem]);
  };

  const handleRemoveNavItem = (idx: number) => {
    setNavItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveNavItem = (idx: number, dir: "up" | "down") => {
    setNavItems((prev) => {
      const next = [...prev];
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleUpdateNavItem = (idx: number, field: string, val: any) => {
    setNavItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };

      if (field === "type") {
        item.type = val;
        if (val === "category" && categories.length > 0) {
          item.target_id = categories[0].id;
          item.label = categories[0].name.toUpperCase();
          item.url = `/#catalogo?categoria=${categories[0].slug}`;
        } else if (val === "product" && products.length > 0) {
          item.target_id = products[0].id;
          item.label = products[0].name;
          item.url = `/produto/${products[0].slug}`;
        } else if (val === "custom_link") {
          item.target_id = null;
          item.url = "/#catalogo";
        }
      } else if (field === "target_id") {
        item.target_id = val;
        if (item.type === "category") {
          const found = categories.find((c) => c.id === val);
          if (found) {
            item.label = found.name.toUpperCase();
            item.url = `/#catalogo?categoria=${found.slug}`;
          }
        } else if (item.type === "product") {
          const found = products.find((p) => p.id === val);
          if (found) {
            item.label = found.name;
            item.url = `/produto/${found.slug}`;
          }
        }
      } else {
        (item as any)[field] = val;
      }

      next[idx] = item;
      return next;
    });
  };

  const handleAddSubItem = (parentIdx: number) => {
    setNavItems((prev) => {
      const next = [...prev];
      const parent = { ...next[parentIdx] };
      const newSub: NavigationSubItem = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: "Novo Submenu",
        type: "custom_link",
        target_id: null,
        url: "/#catalogo",
      };
      parent.children = [...(parent.children || []), newSub];
      next[parentIdx] = parent;
      return next;
    });
  };

  const handleRemoveSubItem = (parentIdx: number, subIdx: number) => {
    setNavItems((prev) => {
      const next = [...prev];
      const parent = { ...next[parentIdx] };
      parent.children = parent.children.filter((_, i) => i !== subIdx);
      next[parentIdx] = parent;
      return next;
    });
  };

  const handleUpdateSubItem = (parentIdx: number, subIdx: number, field: string, val: any) => {
    setNavItems((prev) => {
      const next = [...prev];
      const parent = { ...next[parentIdx] };
      const subs = [...parent.children];
      const sub = { ...subs[subIdx] };

      if (field === "type") {
        sub.type = val;
        if (val === "category" && categories.length > 0) {
          sub.target_id = categories[0].id;
          sub.label = categories[0].name;
          sub.url = `/#catalogo?categoria=${categories[0].slug}`;
        } else if (val === "product" && products.length > 0) {
          sub.target_id = products[0].id;
          sub.label = products[0].name;
          sub.url = `/produto/${products[0].slug}`;
        } else if (val === "custom_link") {
          sub.target_id = null;
          sub.url = "/#catalogo";
        }
      } else if (field === "target_id") {
        sub.target_id = val;
        if (sub.type === "category") {
          const found = categories.find((c) => c.id === val);
          if (found) {
            sub.label = found.name;
            sub.url = `/#catalogo?categoria=${found.slug}`;
          }
        } else if (sub.type === "product") {
          const found = products.find((p) => p.id === val);
          if (found) {
            sub.label = found.name;
            sub.url = `/produto/${found.slug}`;
          }
        }
      } else {
        (sub as any)[field] = val;
      }

      subs[subIdx] = sub;
      parent.children = subs;
      next[parentIdx] = parent;
      return next;
    });
  };

  const handleSaveNavigation = async () => {
    setSavingNav(true);
    setSuccessMsg(null);
    try {
      const res = await fetchApi("/storefront/navigation", {
        method: "PUT",
        body: JSON.stringify({ items: navItems }),
      });
      if (!res.ok) throw new Error("Erro ao salvar menu superior.");
      setSuccessMsg("Menu superior atualizado com sucesso!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Falha ao salvar menu.");
    } finally {
      setSavingNav(false);
    }
  };

  const handleResetDefaultNav = async () => {
    if (!confirm("Deseja redefinir o menu superior para as categorias ativas padrão da loja?")) return;
    const defaultNav: NavigationItem[] = [
      {
        id: "nav-all-products",
        label: "TODOS OS PRODUTOS",
        type: "custom_link",
        target_id: null,
        url: "/#catalogo",
        children: [],
      },
      ...categories.map((cat) => ({
        id: `nav-cat-${cat.id}`,
        label: cat.name.toUpperCase(),
        type: "category" as const,
        target_id: cat.id,
        url: `/#catalogo?categoria=${cat.slug}`,
        children: [],
      })),
      {
        id: "nav-b2b",
        label: "⚡ ATACADO B2B",
        type: "custom_link",
        target_id: null,
        url: `https://wa.me/${tenant?.settings_json?.whatsapp_phone || "5541997098905"}?text=Olá,%20gostaria%20de%20um%20orçamento%20no%20Atacado%20B2B.`,
        children: [],
      },
    ];
    setNavItems(defaultNav);
  };

  if (loading) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando configurações de aparência...</p>
      </div>
    );
  }

  const cfg = banner.config_json || {};

  return (
    <div className="space-y-6">
      {/* Topo / Título com Abas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-content-primary flex items-center gap-2">
            <FiSliders className="w-5 h-5 text-brand-primary" />
            <span>Módulo de Aparência & Vitrine</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Personalize o banner da página inicial com efeito 3D flutuante e a identidade visual da sua loja.
          </p>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center gap-2 bg-bg-subtle p-1 rounded-xl border border-border-theme">
          <button
            type="button"
            onClick={() => setActiveTab("banner")}
            className={`text-xs font-bold py-2 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "banner"
                ? "bg-bg-surface text-brand-primary shadow-sm border border-border-theme"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <span>⚡ Banner Principal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("navigation")}
            className={`text-xs font-bold py-2 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "navigation"
                ? "bg-bg-surface text-brand-primary shadow-sm border border-border-theme"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <FiMenu className="w-3.5 h-3.5" />
            <span>🧭 Menu Superior & Links</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("theme")}
            className={`text-xs font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "theme"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-content-secondary hover:text-content-primary hover:bg-bg-surface"
            }`}
          >
            <span>🎨 Tema, Logo & Cores</span>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${activeTab === "theme" ? "bg-white/25 text-white" : "bg-brand-primary/10 text-brand-primary"}`}>
              Logotipo + 3 Temas
            </span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-status-success/30 rounded-xl text-xs font-semibold text-status-success flex items-center gap-2">
          <FiCheck className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ABA 1: BANNER PRINCIPAL DA PÁGINA INICIAL */}
      {activeTab === "banner" && (
        <div className="space-y-8">
          {/* Card de Atalho para os Novos Temas */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-brand-primary/10 via-brand-accent/5 to-transparent border border-brand-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎨</span>
              <div>
                <h4 className="text-xs font-bold text-content-primary">Novos Temas Modernos Disponíveis</h4>
                <p className="text-[11px] text-content-secondary">
                  Alterne entre <strong>Clean Minimal</strong>, <strong>Modern Commerce</strong> e <strong>Editorial Studio</strong> na aba de temas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("theme")}
              className="btn-brand text-xs py-1.5 px-3.5 rounded-lg self-start sm:self-auto cursor-pointer"
            >
              Configurar Temas da Vitrine
            </button>
          </div>

          {/* Live Preview em Tempo Real */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-content-secondary flex items-center gap-1.5">
                <FiEye className="w-3.5 h-3.5 text-brand-primary" />
                <span>Pré-visualização em Tempo Real (Com Efeito Flutuante 3D)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="btn-ghost text-xs py-1.5 px-2.5 rounded-lg flex items-center gap-1 text-content-secondary hover:text-content-primary"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão do Vídeo</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  disabled={saving}
                  className="btn-brand text-xs py-1.5 px-4 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <FiSave className="w-3.5 h-3.5" />
                  <span>{saving ? "Salvando..." : "Salvar Banner"}</span>
                </button>
              </div>
            </div>

            {/* Renderização do Banner Exato */}
            <InteractiveHeroBanner banner={banner} isPreview={true} />
          </div>

          {/* Painel de Controles e Formulário Completo do Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bloco 1: Cores de Fundo & Efeitos Visuais (4 colunas) */}
            <div className="lg:col-span-4 surface-card p-5 rounded-xl border border-border-theme space-y-4">
              <h3 className="font-heading text-xs font-bold uppercase text-content-primary border-b border-border-theme pb-2">
                1. Fundo do Banner & Efeitos
              </h3>

              {/* Cor de Início do Gradiente */}
              <div>
                <label className="block text-[11px] font-bold text-content-secondary mb-1">
                  Cor Inicial do Gradiente:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.bg_color_start || "#0052B4"}
                    onChange={(e) => updateBannerConfig("bg_color_start", e.target.value)}
                    className="w-9 h-9 rounded-lg border border-border-theme cursor-pointer p-0.5 bg-bg-surface"
                  />
                  <input
                    type="text"
                    value={cfg.bg_color_start || "#0052B4"}
                    onChange={(e) => updateBannerConfig("bg_color_start", e.target.value)}
                    className="input-theme flex-1 text-xs uppercase font-mono py-1.5 px-2.5"
                  />
                </div>
              </div>

              {/* Cor Final do Gradiente */}
              <div>
                <label className="block text-[11px] font-bold text-content-secondary mb-1">
                  Cor Final do Gradiente:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.bg_color_end || "#002F6C"}
                    onChange={(e) => updateBannerConfig("bg_color_end", e.target.value)}
                    className="w-9 h-9 rounded-lg border border-border-theme cursor-pointer p-0.5 bg-bg-surface"
                  />
                  <input
                    type="text"
                    value={cfg.bg_color_end || "#002F6C"}
                    onChange={(e) => updateBannerConfig("bg_color_end", e.target.value)}
                    className="input-theme flex-1 text-xs uppercase font-mono py-1.5 px-2.5"
                  />
                </div>
              </div>

              {/* Halftone Pattern Toggle */}
              <div className="pt-2 border-t border-border-theme flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-content-primary block">Textura Pontilhada Pop-Art</span>
                  <span className="text-[10px] text-content-secondary">Pontilhado geométrico retrô idêntico ao vídeo</span>
                </div>
                <input
                  type="checkbox"
                  checked={cfg.has_halftone_pattern ?? true}
                  onChange={(e) => updateBannerConfig("has_halftone_pattern", e.target.checked)}
                  className="w-4 h-4 accent-brand-primary cursor-pointer"
                />
              </div>

              {/* Efeito de Flutuação 3D */}
              <div className="pt-2 border-t border-border-theme space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-content-primary block">Efeito Flutuante 3D (Levitação)</span>
                    <span className="text-[10px] text-content-secondary">Animação contínua da imagem no ar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={cfg.floating_effect ?? true}
                    onChange={(e) => updateBannerConfig("floating_effect", e.target.checked)}
                    className="w-4 h-4 accent-brand-primary cursor-pointer"
                  />
                </div>

                {cfg.floating_effect && (
                  <div>
                    <label className="block text-[10px] font-bold text-content-secondary mb-1">
                      Velocidade da Levitação:
                    </label>
                    <select
                      value={cfg.floating_speed || "normal"}
                      onChange={(e) => updateBannerConfig("floating_speed", e.target.value as any)}
                      className="input-theme w-full text-xs py-1 px-2"
                    >
                      <option value="slow">Suave & Lenta (4.5s)</option>
                      <option value="normal">Normal / Vídeo (3.2s)</option>
                      <option value="fast">Rápida & Dinâmica (2.2s)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Bloco 2: Textos, Títulos e Badges (8 colunas) */}
            <div className="lg:col-span-8 surface-card p-5 rounded-xl border border-border-theme space-y-5">
              <h3 className="font-heading text-xs font-bold uppercase text-content-primary border-b border-border-theme pb-2">
                2. Badges, Título & Conteúdo
              </h3>

              {/* Badges do Topo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Badge 1 */}
                <div className="p-3 bg-bg-subtle/50 rounded-lg border border-border-theme space-y-2">
                  <span className="text-[11px] font-bold text-content-primary block">Badge 1 (Ex: Campanha):</span>
                  <input
                    type="text"
                    value={banner.badge_1 || ""}
                    onChange={(e) => updateBannerField("badge_1", e.target.value)}
                    placeholder="⚡ CAMPANHA ESPECIAL DE FIM DE ANO"
                    className="input-theme w-full text-xs py-1.5 px-2"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <span className="text-[9px] text-content-secondary block">Cor Fundo:</span>
                      <input
                        type="color"
                        value={cfg.badge_1_bg || "#FFD100"}
                        onChange={(e) => updateBannerConfig("badge_1_bg", e.target.value)}
                        className="w-full h-7 rounded border border-border-theme cursor-pointer p-0.5 bg-bg-surface"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[9px] text-content-secondary block">Cor Texto:</span>
                      <input
                        type="color"
                        value={cfg.badge_1_color || "#000000"}
                        onChange={(e) => updateBannerConfig("badge_1_color", e.target.value)}
                        className="w-full h-7 rounded border border-border-theme cursor-pointer p-0.5 bg-bg-surface"
                      />
                    </div>
                  </div>
                </div>

                {/* Badge 2 */}
                <div className="p-3 bg-bg-subtle/50 rounded-lg border border-border-theme space-y-2">
                  <span className="text-[11px] font-bold text-content-primary block">Badge 2 (Ex: Urgência):</span>
                  <input
                    type="text"
                    value={banner.badge_2 || ""}
                    onChange={(e) => updateBannerField("badge_2", e.target.value)}
                    placeholder="URGENTE"
                    className="input-theme w-full text-xs py-1.5 px-2"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <span className="text-[9px] text-content-secondary block">Cor Fundo:</span>
                      <input
                        type="color"
                        value={cfg.badge_2_bg || "#D92027"}
                        onChange={(e) => updateBannerConfig("badge_2_bg", e.target.value)}
                        className="w-full h-7 rounded border border-border-theme cursor-pointer p-0.5 bg-bg-surface"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[9px] text-content-secondary block">Cor Texto:</span>
                      <input
                        type="color"
                        value={cfg.badge_2_color || "#FFFFFF"}
                        onChange={(e) => updateBannerConfig("badge_2_color", e.target.value)}
                        className="w-full h-7 rounded border border-border-theme cursor-pointer p-0.5 bg-bg-surface"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Título Principal */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-content-secondary">
                      Título - Linha de Destaque (Amarela):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-content-secondary">Cor:</span>
                      <input
                        type="color"
                        value={cfg.title_highlight_color || "#FFD100"}
                        onChange={(e) => updateBannerConfig("title_highlight_color", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-border-theme p-0"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={banner.title_highlight}
                    onChange={(e) => updateBannerField("title_highlight", e.target.value)}
                    placeholder="Sua Marca Sempre Presente!"
                    className="input-theme w-full text-xs font-bold py-2 px-3"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-content-secondary">
                      Título - Linha Complementar (Branca):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-content-secondary">Cor:</span>
                      <input
                        type="color"
                        value={cfg.title_suffix_color || "#FFFFFF"}
                        onChange={(e) => updateBannerConfig("title_suffix_color", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-border-theme p-0"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={banner.title_suffix || ""}
                    onChange={(e) => updateBannerField("title_suffix", e.target.value)}
                    placeholder="Brindes Corporativos e Presentes Sob Medida"
                    className="input-theme w-full text-xs font-bold py-2 px-3"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-content-secondary">
                      Texto de Descrição:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-content-secondary">Cor:</span>
                      <input
                        type="color"
                        value={cfg.description_color || "#FFFFFF"}
                        onChange={(e) => updateBannerConfig("description_color", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-border-theme p-0"
                      />
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={banner.description || ""}
                    onChange={(e) => updateBannerField("description", e.target.value)}
                    className="input-theme w-full text-xs py-2 px-3 resize-none"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 border-t border-border-theme space-y-3">
                <span className="text-xs font-bold text-content-primary block">
                  Botões de Ação (CTAs):
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Botão 1 */}
                  <div className="p-3 bg-bg-subtle/50 rounded-lg border border-border-theme space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-content-primary">Botão 1 (Catálogo):</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-content-secondary">Fundo:</span>
                        <input
                          type="color"
                          value={cfg.btn_1_bg || "#FFD100"}
                          onChange={(e) => updateBannerConfig("btn_1_bg", e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border border-border-theme p-0"
                        />
                        <span className="text-[9px] text-content-secondary ml-1">Texto:</span>
                        <input
                          type="color"
                          value={cfg.btn_1_color || "#000000"}
                          onChange={(e) => updateBannerConfig("btn_1_color", e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border border-border-theme p-0"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={banner.btn_1_text || ""}
                      onChange={(e) => updateBannerField("btn_1_text", e.target.value)}
                      placeholder="🚀 EXPLORAR CATÁLOGO"
                      className="input-theme w-full text-xs py-1.5 px-2"
                    />
                    <input
                      type="text"
                      value={banner.btn_1_url || ""}
                      onChange={(e) => updateBannerField("btn_1_url", e.target.value)}
                      placeholder="#catalogo"
                      className="input-theme w-full text-[11px] font-mono py-1 px-2 text-content-secondary"
                    />
                  </div>

                  {/* Botão 2 */}
                  <div className="p-3 bg-bg-subtle/50 rounded-lg border border-border-theme space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-content-primary">Botão 2 (WhatsApp):</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-content-secondary">Fundo:</span>
                        <input
                          type="color"
                          value={cfg.btn_2_bg || "#FFFFFF"}
                          onChange={(e) => updateBannerConfig("btn_2_bg", e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border border-border-theme p-0"
                        />
                        <span className="text-[9px] text-content-secondary ml-1">Texto:</span>
                        <input
                          type="color"
                          value={cfg.btn_2_color || "#000000"}
                          onChange={(e) => updateBannerConfig("btn_2_color", e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border border-border-theme p-0"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={banner.btn_2_text || ""}
                      onChange={(e) => updateBannerField("btn_2_text", e.target.value)}
                      placeholder="💬 ORÇAMENTO RÁPIDO NO WHATSAPP"
                      className="input-theme w-full text-xs py-1.5 px-2"
                    />
                    <input
                      type="text"
                      value={banner.btn_2_url || ""}
                      onChange={(e) => updateBannerField("btn_2_url", e.target.value)}
                      placeholder="https://wa.me/5541997098905"
                      className="input-theme w-full text-[11px] font-mono py-1 px-2 text-content-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Checkmarks / Diferenciais */}
              <div className="pt-2 border-t border-border-theme space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-content-primary">
                    3 Diferenciais em Destaque (Rodapé do Banner):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-content-secondary">Cor dos textos:</span>
                    <input
                      type="color"
                      value={cfg.checkmarks_color || "#FFFFFF"}
                      onChange={(e) => updateBannerConfig("checkmarks_color", e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border border-border-theme p-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={banner.highlight_1 || ""}
                    onChange={(e) => updateBannerField("highlight_1", e.target.value)}
                    placeholder="✓ Prévia virtual gratuita antes da produção"
                    className="input-theme text-[11px] py-1.5 px-2"
                  />
                  <input
                    type="text"
                    value={banner.highlight_2 || ""}
                    onChange={(e) => updateBannerField("highlight_2", e.target.value)}
                    placeholder="✓ Desconto por volume"
                    className="input-theme text-[11px] py-1.5 px-2"
                  />
                  <input
                    type="text"
                    value={banner.highlight_3 || ""}
                    onChange={(e) => updateBannerField("highlight_3", e.target.value)}
                    placeholder="✓ Pix D+0 ou até 12x"
                    className="input-theme text-[11px] py-1.5 px-2"
                  />
                </div>
              </div>

              {/* Upload da Imagem Principal 3D */}
              <div className="pt-2 border-t border-border-theme space-y-2">
                <span className="text-xs font-bold text-content-primary block">
                  3. Imagem 3D do Banner (Sticker Pop-Art):
                </span>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border-2 border-black bg-blue-600/20 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    <img
                      src={banner.banner_image_url}
                      alt="Miniatura Banner"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-1.5">
                    <input
                      type="text"
                      value={banner.banner_image_url}
                      onChange={(e) => updateBannerField("banner_image_url", e.target.value)}
                      placeholder="/themes/neo_brutalist/jestein_sticker_transparent.png"
                      className="input-theme w-full text-xs font-mono py-1.5 px-2.5"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="btn-brand-outline text-xs py-1 px-3 rounded-lg flex items-center gap-1.5"
                      >
                        <FiUpload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? "Enviando arquivo..." : "Fazer Upload de Nova Imagem"}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => updateBannerField("banner_image_url", "/themes/neo_brutalist/jestein_sticker_transparent.png")}
                        className="text-[10px] text-content-secondary hover:underline"
                      >
                        Usar Sticker Oficial Jestein
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar no Rodapé */}
              <div className="pt-4 border-t border-border-theme flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  disabled={saving}
                  className="btn-brand text-xs py-2.5 px-6 rounded-lg flex items-center gap-2 shadow-md"
                >
                  <FiSave className="w-4 h-4" />
                  <span>{saving ? "Salvando Alterações..." : "Salvar Configurações do Banner"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: MENU SUPERIOR & NAVEGAÇÃO (2 NÍVEIS) */}
      {activeTab === "navigation" && (
        <div className="space-y-6">
          {/* Header de Ações Rápidas */}
          <div className="surface-card p-5 rounded-xl border border-border-theme flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-heading text-sm font-bold text-content-primary flex items-center gap-2">
                <FiMenu className="w-4 h-4 text-brand-primary" />
                <span>Configuração do Menu Superior da Loja</span>
              </h3>
              <p className="text-xs text-content-secondary mt-1">
                Configure os itens de navegação do topo (Nível 1) e seus submenus suspensos (Nível 2). Adicione links para categorias, produtos ou URLs personalizadas.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleResetDefaultNav}
                className="btn-brand-outline text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Categorias</span>
              </button>
              <button
                type="button"
                onClick={handleAddNavItem}
                className="btn-brand-outline text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>+ Novo Item Nível 1</span>
              </button>
              <button
                type="button"
                onClick={handleSaveNavigation}
                disabled={savingNav}
                className="btn-brand text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <FiSave className="w-3.5 h-3.5" />
                <span>{savingNav ? "Salvando..." : "Salvar Menu"}</span>
              </button>
            </div>
          </div>

          {/* LIVE PREVIEW DA BARRA SUPERIOR POP-ART */}
          <div className="surface-card p-5 rounded-xl border border-border-theme space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-content-secondary flex items-center gap-1.5">
                <FiEye className="w-3.5 h-3.5 text-brand-primary" />
                <span>Prévia em Tempo Real da Barra de Navegação</span>
              </h4>
              <span className="text-[11px] text-content-secondary">
                Passe o mouse ou clique nos itens com seta (▼) para testar os submenus
              </span>
            </div>

            <div className="bg-[#0052B4] rounded-lg border-2 border-black p-2.5 shadow-[3px_3px_0px_#111111] overflow-visible">
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-white uppercase select-none">
                {navItems.length === 0 ? (
                  <span className="text-white/60 italic text-xs py-1">Nenhum item adicionado ao menu superior ainda.</span>
                ) : (
                  navItems.map((item, idx) => {
                    const hasChildren = item.children && item.children.length > 0;
                    const isOpen = previewDropdown === item.id;

                    return (
                      <div
                        key={item.id || idx}
                        className="relative group py-1"
                        onMouseEnter={() => setPreviewDropdown(item.id)}
                        onMouseLeave={() => setPreviewDropdown(null)}
                      >
                        <div
                          onClick={() => setPreviewDropdown(isOpen ? null : item.id)}
                          className={`flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded transition-colors ${
                            isOpen || hasChildren ? "hover:text-[#FFD100]" : "hover:text-[#FFD100]"
                          }`}
                        >
                          <span>{item.label || "ITEM SEM TEXTO"}</span>
                          {hasChildren && (
                            <FiChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isOpen ? "rotate-180 text-[#FFD100]" : ""
                              }`}
                            />
                          )}
                        </div>

                        {/* Dropdown Nível 2 na Prévia */}
                        {hasChildren && isOpen && (
                          <div className="absolute left-0 top-full pt-1 z-50 min-w-[220px]">
                            <div className="bg-white text-black border-2 border-black rounded-lg shadow-[4px_4px_0px_#111111] p-1.5 flex flex-col gap-1">
                              <div className="px-2 py-1 text-[10px] font-black uppercase text-gray-400 border-b border-gray-200">
                                Submenu ({item.children.length} itens)
                              </div>
                              {item.children.map((sub, sIdx) => (
                                <div
                                  key={sub.id || sIdx}
                                  className="px-2.5 py-1.5 text-xs font-bold hover:bg-[#FFD100] text-black rounded border border-transparent hover:border-black transition-colors flex items-center justify-between"
                                >
                                  <span>{sub.label || "Subitem"}</span>
                                  <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                                    {sub.type === "category" ? "Cat" : sub.type === "product" ? "Prod" : "Link"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* LISTA DE ITENS DO MENU (NÍVEL 1 E NÍVEL 2) */}
          <div className="space-y-4">
            {navItems.map((item, index) => (
              <div
                key={item.id || index}
                className="surface-card rounded-xl border border-border-theme overflow-hidden shadow-sm transition-all"
              >
                {/* Cabeçalho do Item de Nível 1 */}
                <div className="bg-bg-subtle px-4 py-2.5 border-b border-border-theme flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-primary text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      Nível 1 #{index + 1}
                    </span>
                    <span className="text-xs font-bold text-content-primary">
                      {item.label || "Item sem título"}
                    </span>
                    <span className="text-[10px] font-mono text-content-secondary bg-bg-surface px-1.5 py-0.5 rounded border border-border-theme">
                      {item.type === "category"
                        ? "🏷️ Categoria"
                        : item.type === "product"
                        ? "📦 Produto"
                        : "🔗 Link Personalizado"}
                    </span>
                    {item.children?.length > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {item.children.length} submenus
                      </span>
                    )}
                  </div>

                  {/* Controles de Ordem e Exclusão */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveNavItem(index, "up")}
                      title="Mover para cima"
                      className="p-1 rounded hover:bg-bg-surface text-content-secondary hover:text-content-primary disabled:opacity-30"
                    >
                      <FiArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === navItems.length - 1}
                      onClick={() => handleMoveNavItem(index, "down")}
                      title="Mover para baixo"
                      className="p-1 rounded hover:bg-bg-surface text-content-secondary hover:text-content-primary disabled:opacity-30"
                    >
                      <FiArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveNavItem(index)}
                      title="Excluir este item"
                      className="p-1 rounded hover:bg-red-500/10 text-red-500 hover:text-red-700 ml-2"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Campos do Item de Nível 1 */}
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 1. Texto do Menu */}
                    <div>
                      <label className="block text-xs font-bold text-content-secondary mb-1">
                        Texto do Menu (Label):
                      </label>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateNavItem(index, "label", e.target.value)}
                        placeholder="Ex: CANECAS, CAMISETAS, NOVIDADES"
                        className="input-theme w-full text-xs font-bold py-1.5 px-3"
                      />
                    </div>

                    {/* 2. Tipo do Item */}
                    <div>
                      <label className="block text-xs font-bold text-content-secondary mb-1">
                        Tipo de Destino:
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) => handleUpdateNavItem(index, "type", e.target.value)}
                        className="input-theme w-full text-xs py-1.5 px-3 bg-bg-surface"
                      >
                        <option value="category">🏷️ Categoria da Loja</option>
                        <option value="product">📦 Produto Específico</option>
                        <option value="custom_link">🔗 Link Personalizado (URL)</option>
                      </select>
                    </div>

                    {/* 3. Destino Conforme o Tipo */}
                    <div>
                      <label className="block text-xs font-bold text-content-secondary mb-1">
                        Destino / Alvo:
                      </label>

                      {item.type === "category" ? (
                        <select
                          value={item.target_id || ""}
                          onChange={(e) => handleUpdateNavItem(index, "target_id", e.target.value)}
                          className="input-theme w-full text-xs py-1.5 px-3 bg-bg-surface"
                        >
                          <option value="">Selecione a Categoria...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : item.type === "product" ? (
                        <select
                          value={item.target_id || ""}
                          onChange={(e) => handleUpdateNavItem(index, "target_id", e.target.value)}
                          className="input-theme w-full text-xs py-1.5 px-3 bg-bg-surface"
                        >
                          <option value="">Selecione o Produto...</option>
                          {products.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => handleUpdateNavItem(index, "url", e.target.value)}
                          placeholder="/#catalogo ou https://..."
                          className="input-theme w-full text-xs font-mono py-1.5 px-3"
                        />
                      )}
                    </div>
                  </div>

                  {/* SEÇÃO DE SUBMENUS (NÍVEL 2) */}
                  <div className="bg-bg-subtle/50 rounded-lg p-3.5 border border-border-theme/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-content-primary">
                        <FiCornerDownRight className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Subitens Suspensos (Dropdown Nível 2)</span>
                        <span className="text-[10px] text-content-secondary">
                          ({item.children?.length || 0} cadastrados)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSubItem(index)}
                        className="btn-brand-outline text-[11px] py-1 px-2.5 rounded flex items-center gap-1"
                      >
                        <FiPlus className="w-3 h-3" />
                        <span>+ Adicionar Submenu</span>
                      </button>
                    </div>

                    {(!item.children || item.children.length === 0) ? (
                      <p className="text-[11px] text-content-secondary italic py-1">
                        Nenhum submenu neste item. Ao clicar nele, o cliente será direcionado diretamente ao destino.
                      </p>
                    ) : (
                      <div className="space-y-2.5 pt-1">
                        {item.children.map((sub, subIdx) => (
                          <div
                            key={sub.id || subIdx}
                            className="bg-bg-surface p-2.5 rounded-lg border border-border-theme flex flex-col md:flex-row items-start md:items-center gap-2.5 shadow-xs"
                          >
                            <span className="text-brand-primary text-xs shrink-0 select-none font-bold">
                              ↳ #{subIdx + 1}
                            </span>

                            {/* Texto do Submenu */}
                            <div className="flex-1 w-full">
                              <input
                                type="text"
                                value={sub.label}
                                onChange={(e) =>
                                  handleUpdateSubItem(index, subIdx, "label", e.target.value)
                                }
                                placeholder="Texto do submenu (ex: Canecas Gamer)"
                                className="input-theme w-full text-xs py-1 px-2 font-semibold"
                              />
                            </div>

                            {/* Tipo do Submenu */}
                            <div className="w-full md:w-44">
                              <select
                                value={sub.type}
                                onChange={(e) =>
                                  handleUpdateSubItem(index, subIdx, "type", e.target.value)
                                }
                                className="input-theme w-full text-xs py-1 px-2 bg-bg-surface"
                              >
                                <option value="category">🏷️ Categoria</option>
                                <option value="product">📦 Produto</option>
                                <option value="custom_link">🔗 Link</option>
                              </select>
                            </div>

                            {/* Destino do Submenu */}
                            <div className="flex-1 w-full">
                              {sub.type === "category" ? (
                                <select
                                  value={sub.target_id || ""}
                                  onChange={(e) =>
                                    handleUpdateSubItem(index, subIdx, "target_id", e.target.value)
                                  }
                                  className="input-theme w-full text-xs py-1 px-2 bg-bg-surface"
                                >
                                  <option value="">Selecione a Categoria...</option>
                                  {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                              ) : sub.type === "product" ? (
                                <select
                                  value={sub.target_id || ""}
                                  onChange={(e) =>
                                    handleUpdateSubItem(index, subIdx, "target_id", e.target.value)
                                  }
                                  className="input-theme w-full text-xs py-1 px-2 bg-bg-surface"
                                >
                                  <option value="">Selecione o Produto...</option>
                                  {products.map((prod) => (
                                    <option key={prod.id} value={prod.id}>
                                      {prod.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={sub.url}
                                  onChange={(e) =>
                                    handleUpdateSubItem(index, subIdx, "url", e.target.value)
                                  }
                                  placeholder="/#catalogo ou link externo"
                                  className="input-theme w-full text-xs font-mono py-1 px-2"
                                />
                              )}
                            </div>

                            {/* Botão de Excluir Subitem */}
                            <button
                              type="button"
                              onClick={() => handleRemoveSubItem(index, subIdx)}
                              title="Remover este submenu"
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-500/10 shrink-0 self-end md:self-center"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Botão para Adicionar Novo Item Nível 1 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddNavItem}
                className="btn-brand-outline w-full sm:w-auto text-xs py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 border-dashed"
              >
                <FiPlus className="w-4 h-4" />
                <span>+ Adicionar Item ao Menu Superior (Nível 1)</span>
              </button>

              <button
                type="button"
                onClick={handleSaveNavigation}
                disabled={savingNav}
                className="btn-brand w-full sm:w-auto text-xs py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 shadow-md"
              >
                <FiSave className="w-4 h-4" />
                <span>{savingNav ? "Salvando Alterações..." : "Salvar Menu Superior"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: TEMAS, LOGOTIPO E CORES DA VITRINE */}
      {activeTab === "theme" && (
        <div className="space-y-6">
          {/* Card 1: Identidade da Empresa - Logotipo Oficial */}
          <div className="surface-card p-6 rounded-2xl border border-border-theme space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-theme pb-4">
              <div>
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
                  <FiImage className="w-4 h-4 text-brand-primary" />
                  <span>Logotipo Oficial da Empresa</span>
                </h3>
                <p className="text-xs text-content-secondary mt-0.5">
                  Suba a imagem da logomarca da sua empresa para ser exibida automaticamente no topo e no rodapé de todas as páginas da loja.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleUploadLogo}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="btn-brand text-xs flex items-center gap-1.5 py-2 px-3.5 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FiUpload className="w-3.5 h-3.5" />
                  <span>{uploadingLogo ? "Enviando Logotipo..." : "Enviar Logotipo"}</span>
                </button>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    title="Remover logotipo e voltar ao texto"
                  >
                    <FiTrash2 className="w-3.5 h-3.5 inline mr-1" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-1">
              {/* Pré-visualização em Fundo Claro e Escuro */}
              <div className="lg:col-span-7 space-y-3">
                <span className="text-xs font-semibold text-content-secondary block">
                  Pré-visualização em tempo real na loja:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Fundo Claro (Header da loja) */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center min-h-[95px] relative">
                    <span className="absolute top-1.5 left-2 text-[9px] font-bold text-slate-400 uppercase">
                      Header Claro
                    </span>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logotipo da Loja"
                        className="max-h-12 max-w-[200px] object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <span className="font-heading font-bold text-sm text-slate-800 uppercase tracking-tight block">
                          {tenant?.name || "Jestein Personalizados"}
                        </span>
                        <span className="text-[10px] text-slate-400">Texto padrão (sem logo)</span>
                      </div>
                    )}
                  </div>

                  {/* Fundo Escuro (Topbar / Footer) */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex flex-col items-center justify-center min-h-[95px] relative">
                    <span className="absolute top-1.5 left-2 text-[9px] font-bold text-slate-400 uppercase">
                      Fundo Escuro / Rodapé
                    </span>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logotipo da Loja"
                        className="max-h-12 max-w-[200px] object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <span className="font-heading font-bold text-sm text-white uppercase tracking-tight block">
                          {tenant?.name || "Jestein Personalizados"}
                        </span>
                        <span className="text-[10px] text-slate-400">Texto padrão (sem logo)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informações e URL direta */}
              <div className="lg:col-span-5 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1">
                    URL Direta do Logotipo:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... ou envie um arquivo acima"
                      value={logoUrl || ""}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="input-theme w-full text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTheme}
                      disabled={savingTheme}
                      className="btn-theme-secondary text-xs px-3 py-2 shrink-0"
                    >
                      Salvar URL
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-bg-subtle border border-border-theme text-[11px] text-content-secondary space-y-1">
                  <p className="font-semibold text-content-primary">💡 Dicas para a melhor visualização:</p>
                  <p>• Dê preferência para imagens com <strong>fundo transparente (.PNG ou .SVG)</strong>.</p>
                  <p>• Formato horizontal recomendado: <strong>240x60px</strong> até <strong>400x120px</strong>.</p>
                  <p>• A logomarca se adapta automaticamente ao tema selecionado.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seletor Visual dos 3 Novos Temas Modernos */}
          <div className="surface-card p-6 rounded-2xl border border-border-theme space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-theme pb-4">
              <div>
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
                  <FiSliders className="w-4 h-4 text-brand-primary" />
                  <span>Escolha o Tema Visual da Vitrine</span>
                </h3>
                <p className="text-xs text-content-secondary mt-0.5">
                  Selecione entre os 3 temas modernos e clean. Todos consom 100% das cores configuradas abaixo, sem cores fixas dissonantes.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  target="_blank"
                  className="btn-theme-secondary text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
                  title="Abrir vitrine em nova aba"
                >
                  <FiExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Vitrine</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSaveTheme}
                  disabled={savingTheme}
                  className="btn-brand text-xs flex items-center gap-1.5 py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FiSave className="w-3.5 h-3.5" />
                  <span>{savingTheme ? "Salvando..." : "Salvar Tema e Cores"}</span>
                </button>
              </div>
            </div>

            {/* Grid dos 3 Temas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              {/* Tema 1: Clean Minimal */}
              <div
                onClick={() => setSelectedTheme("clean_minimal")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedTheme === "clean_minimal"
                    ? "border-brand-primary bg-brand-primary/5 shadow-md ring-2 ring-brand-primary/20"
                    : "border-border-theme bg-bg-surface hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Minimalista / Boutique
                    </span>
                    {selectedTheme === "clean_minimal" && (
                      <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">
                        <FiCheck className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-heading text-sm font-bold text-content-primary">
                      1. Clean Minimal
                    </h4>
                    <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                      Fundo ultra limpo, tipografia moderna, imagem quadrada (1:1) com cantos suaves, respiro generoso e zero bordas pesadas.
                    </p>
                  </div>

                  {/* Mockup Esquemático do Card */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/60 shadow-2xs space-y-2">
                    <div className="w-full aspect-square rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 text-xs">
                      [Foto Quadrada 1:1]
                    </div>
                    <div className="h-2 w-3/4 rounded bg-slate-200"></div>
                    <div className="h-2 w-1/2 rounded bg-slate-100"></div>
                    <div
                      style={{ backgroundColor: primaryColor }}
                      className="h-5 w-full rounded-md mt-1 opacity-90"
                    ></div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-border-theme/60 flex items-center justify-between text-xs">
                  <span className="text-content-secondary">Proporção: <strong>Square 1:1</strong></span>
                  <span className={`font-semibold ${selectedTheme === "clean_minimal" ? "text-brand-primary" : "text-content-secondary"}`}>
                    {selectedTheme === "clean_minimal" ? "✓ Ativo" : "Selecionar"}
                  </span>
                </div>
              </div>

              {/* Tema 2: Modern Commerce */}
              <div
                onClick={() => setSelectedTheme("modern_commerce")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedTheme === "modern_commerce"
                    ? "border-brand-primary bg-brand-primary/5 shadow-md ring-2 ring-brand-primary/20"
                    : "border-border-theme bg-bg-surface hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Recomendado / Conversão
                    </span>
                    {selectedTheme === "modern_commerce" && (
                      <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">
                        <FiCheck className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-heading text-sm font-bold text-content-primary">
                      2. Modern Commerce
                    </h4>
                    <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                      Estruturado para alta performance em vendas. Fundo neutro (#F8FAFC), cards brancos elevados, badge pill translúcido e botão de compra full-width.
                    </p>
                  </div>

                  {/* Mockup Esquemático do Card */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2 relative">
                    <span className="absolute top-4 left-4 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-white/90 text-slate-800 shadow-2xs">
                      🔥 DESTAQUE
                    </span>
                    <div className="w-full aspect-square rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 text-xs">
                      [Foto Quadrada 1:1]
                    </div>
                    <div className="h-2 w-4/5 rounded bg-slate-200"></div>
                    <div className="h-2 w-1/3 rounded bg-emerald-100"></div>
                    <div
                      style={{ backgroundColor: primaryColor }}
                      className="h-6 w-full rounded-xl mt-1 shadow-xs"
                    ></div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-border-theme/60 flex items-center justify-between text-xs">
                  <span className="text-content-secondary">Proporção: <strong>Square 1:1</strong></span>
                  <span className={`font-semibold ${selectedTheme === "modern_commerce" ? "text-brand-primary" : "text-content-secondary"}`}>
                    {selectedTheme === "modern_commerce" ? "✓ Ativo" : "Selecionar"}
                  </span>
                </div>
              </div>

              {/* Tema 3: Editorial Studio */}
              <div
                onClick={() => setSelectedTheme("editorial_studio")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedTheme === "editorial_studio"
                    ? "border-brand-primary bg-brand-primary/5 shadow-md ring-2 ring-brand-primary/20"
                    : "border-border-theme bg-bg-surface hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      Premium / Editorial
                    </span>
                    {selectedTheme === "editorial_studio" && (
                      <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">
                        <FiCheck className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-heading text-sm font-bold text-content-primary">
                      3. Editorial Studio
                    </h4>
                    <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                      Foco absoluto na fotografia com aspecto vertical (4:5), grid respirado, tipografia sofisticada e CTA integrado à identidade do tenant.
                    </p>
                  </div>

                  {/* Mockup Esquemático do Card */}
                  <div className="p-3 rounded-xl bg-white border border-neutral-200 space-y-2">
                    <div className="w-full aspect-[4/5] rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs">
                      [Foto Vertical 4:5]
                    </div>
                    <div className="h-2 w-3/4 rounded bg-neutral-300"></div>
                    <div className="h-2 w-1/2 rounded bg-neutral-200"></div>
                    <div
                      style={{ backgroundColor: primaryColor }}
                      className="h-5 w-full rounded mt-1"
                    ></div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-border-theme/60 flex items-center justify-between text-xs">
                  <span className="text-content-secondary">Proporção: <strong>Vertical 4:5</strong></span>
                  <span className={`font-semibold ${selectedTheme === "editorial_studio" ? "text-brand-primary" : "text-content-secondary"}`}>
                    {selectedTheme === "editorial_studio" ? "✓ Ativo" : "Selecionar"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Cores Dinâmicas da Marca */}
          <div className="surface-card p-6 rounded-2xl border border-border-theme space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-theme pb-4">
              <div>
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-content-primary">
                  Cores Globais da Marca (Injeção Dinâmica)
                </h3>
                <p className="text-xs text-content-secondary mt-0.5">
                  Estas cores são injetadas em tempo real em qualquer um dos 3 temas selecionados, com cálculo automático de contraste para o texto dos botões.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveTheme}
                disabled={savingTheme}
                className="btn-brand text-xs flex items-center gap-1.5 py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <FiSave className="w-3.5 h-3.5" />
                <span>Salvar Cores</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              <div className="p-4 rounded-xl bg-bg-subtle/50 border border-border-theme space-y-2">
                <label className="block text-xs font-bold text-content-primary">
                  Cor Primária da Loja (Botões de Ação e Destaques):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-border-theme cursor-pointer p-0.5 bg-bg-surface"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="input-theme flex-1 text-xs font-mono uppercase font-bold"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    style={{ backgroundColor: primaryColor }}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white shadow-xs pointer-events-none"
                  >
                    Prévia do Botão Principal
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-subtle/50 border border-border-theme space-y-2">
                <label className="block text-xs font-bold text-content-primary">
                  Cor Secundária da Loja (Destaques, Badges e Gradientes):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-border-theme cursor-pointer p-0.5 bg-bg-surface"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="input-theme flex-1 text-xs font-mono uppercase font-bold"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    style={{ backgroundColor: secondaryColor }}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold text-slate-900 shadow-xs pointer-events-none"
                  >
                    Prévia de Destaque Secundário
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
