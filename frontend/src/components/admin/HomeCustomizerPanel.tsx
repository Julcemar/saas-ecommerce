"use client";

import React, { useState } from "react";
import Link from "next/link";
import { fetchApi, TenantInfo } from "@/lib/api";
import {
  StoreHomeConfig,
  mergeHomeConfig,
  BenefitCardItem,
} from "@/lib/homeConfig";
import { BannerData } from "@/components/InteractiveHeroBanner";
import {
  FiSave,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";

interface HomeCustomizerPanelProps {
  tenant: TenantInfo | null;
  bannerData?: BannerData | null;
  onTenantUpdated: (updated: TenantInfo) => void;
  onGoToMenuTab: () => void;
}

type SectionKey =
  | "topBar"
  | "header"
  | "hero"
  | "benefits"
  | "howItWorks"
  | "bottomCta"
  | "footer";

const ICON_OPTIONS: Array<{ value: BenefitCardItem["icon"]; label: string }> = [
  { value: "Truck", label: "Caminhão (Envio)" },
  { value: "Percent", label: "Desconto (%)" },
  { value: "Shield", label: "Escudo (Garantia)" },
  { value: "Clock", label: "Relógio (Prazo)" },
  { value: "Award", label: "Prêmio (Qualidade)" },
  { value: "Sparkles", label: "Brilho (Personalizado)" },
  { value: "Zap", label: "Raio (Agilidade)" },
  { value: "CheckCircle", label: "Check (Aprovação)" },
];

export default function HomeCustomizerPanel({
  tenant,
  bannerData,
  onTenantUpdated,
  onGoToMenuTab,
}: HomeCustomizerPanelProps) {
  const [config, setConfig] = useState<StoreHomeConfig>(() =>
    mergeHomeConfig(tenant, bannerData)
  );
  const [logoUrl, setLogoUrl] = useState<string>(tenant?.logo_url || "");
  const [openSection, setOpenSection] = useState<SectionKey>("topBar");
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpload = async (
    key: string,
    e: React.ChangeEvent<HTMLInputElement>,
    onDone: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchApi("/uploads?folder=appearance", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao enviar imagem.");
      }
      const data = await res.json();
      onDone(data.url);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetchApi("/tenant/settings", {
        method: "PUT",
        body: JSON.stringify({
          logo_url: logoUrl.trim(),
          home_config: config,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar personalização da Home.");
      }
      const updated: TenantInfo = await res.json();
      onTenantUpdated(updated);
      setSuccessMsg("Todas as 7 seções da Home foram salvas com sucesso!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderSectionHeader = (
    key: SectionKey,
    title: string,
    subtitle: string,
    enabled?: boolean,
    onToggle?: (val: boolean) => void
  ) => {
    const isOpen = openSection === key;
    return (
      <div className="px-5 py-4 flex items-center justify-between gap-4 bg-bg-surface">
        <button
          type="button"
          onClick={() => setOpenSection(isOpen ? key : key)}
          className="flex-1 text-left flex items-center gap-3"
        >
          <span className="w-7 h-7 rounded-lg bg-[#084D6E]/10 text-[#084D6E] dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
            {["topBar", "header", "hero", "benefits", "howItWorks", "bottomCta", "footer"].indexOf(key) + 1}
          </span>
          <div>
            <h3 className="font-heading text-sm font-bold text-content-primary">{title}</h3>
            <p className="text-[11px] text-content-secondary">{subtitle}</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {typeof enabled === "boolean" && onToggle && (
            <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer">
              <span className={enabled ? "text-status-success" : "text-content-secondary"}>
                {enabled ? "Ativo" : "Oculto"}
              </span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onToggle(e.target.checked)}
                className="w-4 h-4 accent-[#084D6E]"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => setOpenSection(key)}
            className="p-1.5 rounded-lg hover:bg-bg-subtle text-content-secondary"
          >
            {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Barra Fixa de Ações */}
      <div className="sticky top-16 z-20 p-4 rounded-xl bg-bg-surface/95 backdrop-blur-md border border-border-theme shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-content-primary">
            Personalização da Home (7 Seções Editáveis)
          </h2>
          <p className="text-[11px] text-content-secondary">
            Expanda cada seção abaixo para editar textos, ícones, imagens e visibilidade na vitrine.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <FiExternalLink className="w-3.5 h-3.5" />
            <span>Visualizar Loja</span>
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="btn-brand text-xs py-2.5 px-5 flex items-center gap-1.5"
          >
            <FiSave className="w-4 h-4" />
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-status-success/30 rounded-xl text-xs font-semibold text-status-success flex items-center gap-2">
          <FiCheck className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-status-error/30 rounded-xl text-xs font-semibold text-status-error flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. BARRA NO TOPO */}
      <div className="surface-card border border-border-theme rounded-xl overflow-hidden text-xs">
        {renderSectionHeader(
          "topBar",
          "Barra no Topo (Top Bar)",
          "Aviso promocional, badge e links rápidos no topo da vitrine",
          config.topBar.enabled,
          (v) => setConfig((p) => ({ ...p, topBar: { ...p.topBar, enabled: v } }))
        )}
        {openSection === "topBar" && (
          <div className="p-5 border-t border-border-theme bg-bg-subtle/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Etiqueta / Badge</label>
                <input
                  type="text"
                  value={config.topBar.badgeText}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, topBar: { ...p.topBar, badgeText: e.target.value } }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Mensagem Central</label>
                <input
                  type="text"
                  value={config.topBar.message}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, topBar: { ...p.topBar, message: e.target.value } }))
                  }
                  className="input-theme w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.topBar.useThemePrimary}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      topBar: { ...p.topBar, useThemePrimary: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-[#084D6E]"
                />
                <span className="font-semibold">Usar cor primária do tema</span>
              </label>

              {!config.topBar.useThemePrimary && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5">
                    <span>Fundo:</span>
                    <input
                      type="color"
                      value={config.topBar.bgColor}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          topBar: { ...p.topBar, bgColor: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span>Texto:</span>
                    <input
                      type="color"
                      value={config.topBar.textColor}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          topBar: { ...p.topBar, textColor: e.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Links Rápidos à Direita</span>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      topBar: {
                        ...p.topBar,
                        links: [...p.topBar.links, { label: "Novo Link", url: "#" }],
                      },
                    }))
                  }
                  className="text-brand-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Adicionar Link</span>
                </button>
              </div>
              {config.topBar.links.map((lk, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={lk.label}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        topBar: {
                          ...p.topBar,
                          links: p.topBar.links.map((item, i) =>
                            i === idx ? { ...item, label: e.target.value } : item
                          ),
                        },
                      }))
                    }
                    placeholder="Rótulo"
                    className="input-theme w-44"
                  />
                  <input
                    type="text"
                    value={lk.url}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        topBar: {
                          ...p.topBar,
                          links: p.topBar.links.map((item, i) =>
                            i === idx ? { ...item, url: e.target.value } : item
                          ),
                        },
                      }))
                    }
                    placeholder="URL (https://... ou /admin)"
                    className="input-theme flex-1"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((p) => ({
                        ...p,
                        topBar: {
                          ...p.topBar,
                          links: p.topBar.links.filter((_, i) => i !== idx),
                        },
                      }))
                    }
                    className="p-1.5 text-status-error"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. CABEÇALHO E MENU PRINCIPAL */}
      <div className="surface-card border border-border-theme rounded-xl overflow-hidden text-xs">
        {renderSectionHeader(
          "header",
          "Cabeçalho e Menu Principal",
          "Logotipo, altura, placeholder da busca e exibição automática de categorias"
        )}
        {openSection === "header" && (
          <div className="p-5 border-t border-border-theme bg-bg-subtle/30 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-16 px-4 rounded-lg border border-border-theme bg-bg-surface flex items-center justify-center min-w-[140px]">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ maxHeight: `${config.header.logoMaxHeightPx}px` }}
                    className="w-auto object-contain"
                  />
                ) : (
                  <span className="font-heading font-bold text-sm">{tenant?.name || "Sua Loja"}</span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="btn-outline text-[11px] py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5">
                    <FiUploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingKey === "logo" ? "Enviando..." : "Enviar Logotipo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload("logo", e, (u) => setLogoUrl(u))}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="text-status-error hover:underline font-semibold"
                    >
                      Remover logo (usar texto)
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>Altura máxima da logo:</span>
                  <input
                    type="number"
                    min="28"
                    max="90"
                    value={config.header.logoMaxHeightPx}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        header: { ...p.header, logoMaxHeightPx: Number(e.target.value) || 52 },
                      }))
                    }
                    className="input-theme w-20 py-1"
                  />
                  <span>px</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Placeholder do Campo de Busca</label>
                <input
                  type="text"
                  value={config.header.searchPlaceholder}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      header: { ...p.header, searchPlaceholder: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-border-theme">
                <div>
                  <span className="font-semibold block">Exibir categorias ativas no menu</span>
                  <button
                    type="button"
                    onClick={onGoToMenuTab}
                    className="text-[11px] text-brand-primary hover:underline font-semibold"
                  >
                    Abrir editor completo de submenus →
                  </button>
                </div>
                <input
                  type="checkbox"
                  checked={config.header.showCategoriesAuto}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      header: { ...p.header, showCategoriesAuto: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-[#084D6E]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BANNER PRINCIPAL (HERO) */}
      <div className="surface-card border border-border-theme rounded-xl overflow-hidden text-xs">
        {renderSectionHeader(
          "hero",
          "Banner Principal (Hero)",
          "Modo Composto (Texto + Arte) ou Imagem Full-Width (Desktop + Mobile)",
          config.hero.enabled,
          (v) => setConfig((p) => ({ ...p, hero: { ...p.hero, enabled: v } }))
        )}
        {openSection === "hero" && (
          <div className="p-5 border-t border-border-theme bg-bg-subtle/30 space-y-4">
            <div className="flex gap-2">
              {[
                { id: "compound" as const, label: "Composto (Texto + Arte Lateral)" },
                { id: "full_image" as const, label: "Imagem Full-Width (Desktop + Mobile)" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setConfig((p) => ({ ...p, hero: { ...p.hero, mode: m.id } }))
                  }
                  className={`px-3 py-2 rounded-lg font-semibold border ${
                    config.hero.mode === m.id
                      ? "bg-[#084D6E] text-white border-[#084D6E]"
                      : "bg-bg-surface text-content-secondary border-border-theme"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {config.hero.mode === "full_image" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-bg-surface border border-border-theme space-y-2">
                  <span className="font-semibold block">Imagem Desktop (1920x600)</span>
                  {config.hero.desktopImageUrl && (
                    <img
                      src={config.hero.desktopImageUrl}
                      alt="Desktop"
                      className="w-full h-28 object-cover rounded"
                    />
                  )}
                  <label className="btn-outline text-[11px] py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5">
                    <FiUploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingKey === "hero_desktop" ? "Enviando..." : "Upload Desktop"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUpload("hero_desktop", e, (u) =>
                          setConfig((p) => ({ ...p, hero: { ...p.hero, desktopImageUrl: u } }))
                        )
                      }
                    />
                  </label>
                </div>

                <div className="p-3 rounded-lg bg-bg-surface border border-border-theme space-y-2">
                  <span className="font-semibold block">Imagem Mobile (opcional)</span>
                  {config.hero.mobileImageUrl && (
                    <img
                      src={config.hero.mobileImageUrl}
                      alt="Mobile"
                      className="w-full h-28 object-cover rounded"
                    />
                  )}
                  <label className="btn-outline text-[11px] py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5">
                    <FiUploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingKey === "hero_mobile" ? "Enviando..." : "Upload Mobile"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUpload("hero_mobile", e, (u) =>
                          setConfig((p) => ({ ...p, hero: { ...p.hero, mobileImageUrl: u } }))
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Badge Superior</label>
                    <input
                      type="text"
                      value={config.hero.badge1}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, hero: { ...p.hero, badge1: e.target.value } }))
                      }
                      className="input-theme w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Selo Destaque</label>
                    <input
                      type="text"
                      value={config.hero.badge2}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, hero: { ...p.hero, badge2: e.target.value } }))
                      }
                      className="input-theme w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Título Principal (H1 Destaque)</label>
                    <input
                      type="text"
                      value={config.hero.titleHighlight}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          hero: { ...p.hero, titleHighlight: e.target.value },
                        }))
                      }
                      className="input-theme w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Subtítulo / Complemento</label>
                    <input
                      type="text"
                      value={config.hero.titleSuffix}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          hero: { ...p.hero, titleSuffix: e.target.value },
                        }))
                      }
                      className="input-theme w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    value={config.hero.description}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, hero: { ...p.hero, description: e.target.value } }))
                    }
                    className="input-theme w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Botão Primário</label>
                    <input
                      type="text"
                      value={config.hero.primaryBtnText}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          hero: { ...p.hero, primaryBtnText: e.target.value },
                        }))
                      }
                      className="input-theme w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Link Primário</label>
                    <input
                      type="text"
                      value={config.hero.primaryBtnUrl}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          hero: { ...p.hero, primaryBtnUrl: e.target.value },
                        }))
                      }
                      className="input-theme w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Botão Secundário</label>
                    <input
                      type="text"
                      value={config.hero.secondaryBtnText}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          hero: { ...p.hero, secondaryBtnText: e.target.value },
                        }))
                      }
                      className="input-theme w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Link Secundário</label>
                    <input
                      type="text"
                      value={config.hero.secondaryBtnUrl}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          hero: { ...p.hero, secondaryBtnUrl: e.target.value },
                        }))
                      }
                      className="input-theme w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="btn-outline text-[11px] py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5">
                    <FiUploadCloud className="w-3.5 h-3.5" />
                    <span>
                      {uploadingKey === "hero_art" ? "Enviando..." : "Upload Arte Lateral (PNG/WebP)"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUpload("hero_art", e, (u) =>
                          setConfig((p) => ({ ...p, hero: { ...p.hero, desktopImageUrl: u } }))
                        )
                      }
                    />
                  </label>

                  <label className="flex items-center gap-1.5">
                    <span>Cor Início:</span>
                    <input
                      type="color"
                      value={config.hero.bgColorStart}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          hero: { ...p.hero, bgColorStart: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span>Cor Fim:</span>
                    <input
                      type="color"
                      value={config.hero.bgColorEnd}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          hero: { ...p.hero, bgColorEnd: e.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. BLOCOS DE BENEFÍCIOS */}
      <div className="surface-card border border-border-theme rounded-xl overflow-hidden text-xs">
        {renderSectionHeader(
          "benefits",
          "Blocos de Benefícios (Abaixo do Banner)",
          "Gerenciador de 1 a 4 cards horizontais com ícone Lucide, título e subtítulo",
          config.benefits.enabled,
          (v) => setConfig((p) => ({ ...p, benefits: { ...p.benefits, enabled: v } }))
        )}
        {openSection === "benefits" && (
          <div className="p-5 border-t border-border-theme bg-bg-subtle/30 space-y-3">
            {config.benefits.items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-lg bg-bg-surface border border-border-theme items-center"
              >
                <div className="sm:col-span-3">
                  <select
                    value={item.icon}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        benefits: {
                          ...p.benefits,
                          items: p.benefits.items.map((b, i) =>
                            i === idx ? { ...b, icon: e.target.value as any } : b
                          ),
                        },
                      }))
                    }
                    className="input-theme w-full"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        benefits: {
                          ...p.benefits,
                          items: p.benefits.items.map((b, i) =>
                            i === idx ? { ...b, title: e.target.value } : b
                          ),
                        },
                      }))
                    }
                    placeholder="Título"
                    className="input-theme w-full"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={item.subtitle}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        benefits: {
                          ...p.benefits,
                          items: p.benefits.items.map((b, i) =>
                            i === idx ? { ...b, subtitle: e.target.value } : b
                          ),
                        },
                      }))
                    }
                    placeholder="Subtítulo curto"
                    className="input-theme w-full"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  {config.benefits.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          benefits: {
                            ...p.benefits,
                            items: p.benefits.items.filter((_, i) => i !== idx),
                          },
                        }))
                      }
                      className="p-1.5 text-status-error"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {config.benefits.items.length < 4 && (
              <button
                type="button"
                onClick={() =>
                  setConfig((p) => ({
                    ...p,
                    benefits: {
                      ...p.benefits,
                      items: [
                        ...p.benefits.items,
                        { icon: "Sparkles", title: "Novo Benefício", subtitle: "Descrição curta" },
                      ],
                    },
                  }))
                }
                className="btn-outline text-[11px] py-1.5 px-3 flex items-center gap-1"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Adicionar Card de Benefício</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. PASSO A PASSO SIMPLIFICADO */}
      <div className="surface-card border border-border-theme rounded-xl overflow-hidden text-xs">
        {renderSectionHeader(
          "howItWorks",
          "Passo a Passo Simplificado",
          "Etapas numeradas explicando como funciona a personalização e entrega",
          config.howItWorks.enabled,
          (v) => setConfig((p) => ({ ...p, howItWorks: { ...p.howItWorks, enabled: v } }))
        )}
        {openSection === "howItWorks" && (
          <div className="p-5 border-t border-border-theme bg-bg-subtle/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Título da Seção</label>
                <input
                  type="text"
                  value={config.howItWorks.title}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      howItWorks: { ...p.howItWorks, title: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={config.howItWorks.subtitle}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      howItWorks: { ...p.howItWorks, subtitle: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {config.howItWorks.steps.map((st, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-lg bg-bg-surface border border-border-theme items-center"
                >
                  <div className="sm:col-span-1">
                    <input
                      type="text"
                      value={st.number}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          howItWorks: {
                            ...p.howItWorks,
                            steps: p.howItWorks.steps.map((s, i) =>
                              i === idx ? { ...s, number: e.target.value } : s
                            ),
                          },
                        }))
                      }
                      className="input-theme w-full text-center font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={st.title}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          howItWorks: {
                            ...p.howItWorks,
                            steps: p.howItWorks.steps.map((s, i) =>
                              i === idx ? { ...s, title: e.target.value } : s
                            ),
                          },
                        }))
                      }
                      placeholder="Título da etapa"
                      className="input-theme w-full"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={st.description}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          howItWorks: {
                            ...p.howItWorks,
                            steps: p.howItWorks.steps.map((s, i) =>
                              i === idx ? { ...s, description: e.target.value } : s
                            ),
                          },
                        }))
                      }
                      placeholder="Descrição curta"
                      className="input-theme w-full"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          howItWorks: {
                            ...p.howItWorks,
                            steps: p.howItWorks.steps.filter((_, i) => i !== idx),
                          },
                        }))
                      }
                      className="p-1.5 text-status-error"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setConfig((p) => ({
                    ...p,
                    howItWorks: {
                      ...p.howItWorks,
                      steps: [
                        ...p.howItWorks.steps,
                        {
                          number: String(p.howItWorks.steps.length + 1),
                          title: "Nova Etapa",
                          description: "Descrição da etapa...",
                        },
                      ],
                    },
                  }))
                }
                className="btn-outline text-[11px] py-1.5 px-3 flex items-center gap-1"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Adicionar Etapa</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. BANNER FINAL (CTA CORPORATIVO) */}
      <div className="surface-card border border-border-theme rounded-xl overflow-hidden text-xs">
        {renderSectionHeader(
          "bottomCta",
          "Banner Final (CTA Corporativo / Fechamento)",
          "Chamada de fechamento para cotações B2B ou WhatsApp",
          config.bottomCta.enabled,
          (v) => setConfig((p) => ({ ...p, bottomCta: { ...p.bottomCta, enabled: v } }))
        )}
        {openSection === "bottomCta" && (
          <div className="p-5 border-t border-border-theme bg-bg-subtle/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Tag Superior</label>
                <input
                  type="text"
                  value={config.bottomCta.tag}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      bottomCta: { ...p.bottomCta, tag: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Título Principal</label>
                <input
                  type="text"
                  value={config.bottomCta.title}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      bottomCta: { ...p.bottomCta, title: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Texto Descritivo</label>
              <textarea
                rows={2}
                value={config.bottomCta.description}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    bottomCta: { ...p.bottomCta, description: e.target.value },
                  }))
                }
                className="input-theme w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Texto do Botão</label>
                <input
                  type="text"
                  value={config.bottomCta.buttonText}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      bottomCta: { ...p.bottomCta, buttonText: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Ação do Botão</label>
                <select
                  value={config.bottomCta.actionType}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      bottomCta: { ...p.bottomCta, actionType: e.target.value as any },
                    }))
                  }
                  className="input-theme w-full"
                >
                  <option value="whatsapp">Abrir WhatsApp com Mensagem</option>
                  <option value="link">Link Interno / Externo</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  {config.bottomCta.actionType === "whatsapp" ? "Mensagem WhatsApp" : "URL de Destino"}
                </label>
                <input
                  type="text"
                  value={
                    config.bottomCta.actionType === "whatsapp"
                      ? config.bottomCta.whatsappMessage
                      : config.bottomCta.buttonUrl
                  }
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      bottomCta: {
                        ...p.bottomCta,
                        ...(p.bottomCta.actionType === "whatsapp"
                          ? { whatsappMessage: e.target.value }
                          : { buttonUrl: e.target.value }),
                      },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. RODAPÉ (FOOTER) */}
      <div className="surface-card border border-border-theme rounded-xl overflow-hidden text-xs">
        {renderSectionHeader(
          "footer",
          "Rodapé (Footer)",
          "Informações institucionais, colunas de links, atendimento e copyright"
        )}
        {openSection === "footer" && (
          <div className="p-5 border-t border-border-theme bg-bg-subtle/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Descrição Institucional</label>
                <textarea
                  rows={2}
                  value={config.footer.description}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      footer: { ...p.footer, description: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">CNPJ / Informações Legais</label>
                <input
                  type="text"
                  value={config.footer.legalInfo}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      footer: { ...p.footer, legalInfo: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Título Atendimento</label>
                <input
                  type="text"
                  value={config.footer.supportTitle}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      footer: { ...p.footer, supportTitle: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Horários</label>
                <input
                  type="text"
                  value={config.footer.supportHours}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      footer: { ...p.footer, supportHours: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={config.footer.supportPhone}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      footer: { ...p.footer, supportPhone: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">E-mail</label>
                <input
                  type="text"
                  value={config.footer.supportEmail}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      footer: { ...p.footer, supportEmail: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Cidade / Endereço</label>
                <input
                  type="text"
                  value={config.footer.supportAddress}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      footer: { ...p.footer, supportAddress: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  Copyright (use {"{ano}"} e {"{nome_loja}"})
                </label>
                <input
                  type="text"
                  value={config.footer.copyrightText}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      footer: { ...p.footer, copyrightText: e.target.value },
                    }))
                  }
                  className="input-theme w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
