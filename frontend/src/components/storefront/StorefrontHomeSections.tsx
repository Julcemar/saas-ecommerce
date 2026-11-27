"use client";

import React from "react";
import Link from "next/link";
import { StoreHomeConfig, BenefitCardItem } from "@/lib/homeConfig";
import InteractiveHeroBanner, { BannerData } from "@/components/InteractiveHeroBanner";
import {
  Truck,
  Percent,
  Shield,
  Clock,
  Award,
  Sparkles,
  Zap,
  CheckCircle,
  MessageSquare,
  Check,
} from "lucide-react";

const LUCIDE_MAP: Record<BenefitCardItem["icon"], React.ComponentType<{ className?: string }>> = {
  Truck,
  Percent,
  Shield,
  Clock,
  Award,
  Sparkles,
  Zap,
  CheckCircle,
};

type ThemeVariant = "clean_minimal" | "modern_commerce" | "editorial_studio";

export function StorefrontTopBar({
  config,
  theme,
}: {
  config: StoreHomeConfig;
  theme: ThemeVariant;
}) {
  const tb = config.topBar;
  if (!tb.enabled) return null;

  const customStyle = tb.useThemePrimary
    ? theme === "clean_minimal"
      ? {
          backgroundColor: "color-mix(in srgb, var(--brand-surface, #ffffff) 92%, var(--brand-primary) 4%)",
          borderColor: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
        }
      : theme === "editorial_studio"
      ? undefined
      : {
          background: "var(--brand-cta-gradient, var(--brand-primary))",
          color: "var(--brand-text-on-primary, #FFFFFF)",
        }
    : {
        backgroundColor: tb.bgColor || "var(--brand-primary)",
        color: tb.textColor || "var(--brand-text-on-primary, #FFFFFF)",
      };

  const wrapperClass =
    tb.useThemePrimary && theme === "clean_minimal"
      ? "border-b text-[11px] text-neutral-600 py-2 px-4 backdrop-blur-md"
      : tb.useThemePrimary && theme === "editorial_studio"
      ? "bg-neutral-950 text-neutral-200 text-[11px] py-2 px-4 sm:px-8 tracking-wider"
      : "text-[11px] font-medium py-1.5 px-4 shadow-xs";

  return (
    <div style={customStyle} className={wrapperClass}>
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          {tb.badgeText && (
            <span
              className={
                theme === "clean_minimal" && tb.useThemePrimary
                  ? "bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  : "bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              }
            >
              {tb.badgeText}
            </span>
          )}
          <span>{tb.message}</span>
        </div>

        <div className="flex items-center gap-4">
          {tb.links.map((lk, idx) => {
            const isExternal = lk.url.startsWith("http");
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="opacity-30">|</span>}
                {isExternal ? (
                  <a
                    href={lk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline font-semibold"
                  >
                    {lk.label}
                  </a>
                ) : (
                  <Link href={lk.url || "/"} className="hover:underline font-medium">
                    {lk.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StorefrontHero({
  config,
  bannerData,
  whatsapp,
  theme = "modern_commerce",
}: {
  config: StoreHomeConfig;
  bannerData: BannerData | null;
  whatsapp: string;
  theme?: ThemeVariant;
}) {
  const h = config.hero;
  if (!h.enabled) return null;

  if (h.mode === "full_image" && h.desktopImageUrl) {
    return (
      <section className="w-full">
        <Link href={h.primaryBtnUrl || "#catalogo"} className="block w-full">
          <img
            src={h.desktopImageUrl}
            alt={h.titleHighlight || "Banner"}
            className={`w-full object-cover max-h-[520px] ${
              h.mobileImageUrl ? "hidden md:block" : "block"
            }`}
          />
          {h.mobileImageUrl && (
            <img
              src={h.mobileImageUrl}
              alt={h.titleHighlight || "Banner"}
              className="w-full object-cover md:hidden block"
            />
          )}
        </Link>
      </section>
    );
  }

  const mergedBanner: BannerData = {
    ...(bannerData || {}),
    badge_1: h.badge1,
    badge_2: h.badge2,
    title_prefix: bannerData?.title_prefix || "",
    title_highlight: h.titleHighlight,
    title_suffix: h.titleSuffix,
    description: h.description,
    btn_1_text: h.primaryBtnText,
    btn_1_url: h.primaryBtnUrl,
    btn_2_text: h.secondaryBtnText,
    btn_2_url: h.secondaryBtnUrl,
    highlight_1: h.highlights[0] || "",
    highlight_2: h.highlights[1] || "",
    highlight_3: h.highlights[2] || "",
    banner_image_url: h.desktopImageUrl || bannerData?.banner_image_url || "",
    config_json: {
      ...(bannerData?.config_json || {}),
      bg_color_start: h.bgColorStart,
      bg_color_end: h.bgColorEnd,
    },
  };

  return (
    <section className="w-full">
      <div className="w-full">
        <InteractiveHeroBanner banner={mergedBanner} theme={theme} />
      </div>
    </section>
  );
}

export function StorefrontBenefitsBar({
  config,
  theme,
}: {
  config: StoreHomeConfig;
  theme: ThemeVariant;
}) {
  if (!config.benefits.enabled || config.benefits.items.length === 0) return null;

  const colsClass =
    config.benefits.items.length === 1
      ? "grid-cols-1"
      : config.benefits.items.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : config.benefits.items.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-6">
      <div className={`grid ${colsClass} gap-4`}>
        {config.benefits.items.map((item, idx) => {
          const IconComp = LUCIDE_MAP[item.icon] || Truck;
          return (
            <div
              key={idx}
              className={`storefront-card-interactive p-4 flex items-center gap-3.5 ${
                theme === "clean_minimal"
                  ? "rounded-2xl border border-neutral-200/70 shadow-2xs"
                  : theme === "editorial_studio"
                  ? "border border-neutral-200/90 rounded-lg"
                  : "rounded-2xl border border-slate-200/80 shadow-2xs"
              }`}
            >
              <div
                style={{
                  backgroundColor: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                  color: "var(--brand-primary)",
                  borderColor: "color-mix(in srgb, var(--brand-primary) 20%, transparent)",
                }}
                className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200"
              >
                <IconComp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading text-xs font-bold text-slate-900 truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StorefrontHowItWorks({
  config,
  theme,
}: {
  config: StoreHomeConfig;
  theme: ThemeVariant;
}) {
  const hw = config.howItWorks;
  if (!hw.enabled || hw.steps.length === 0) return null;

  return (
    <section
      style={{ backgroundColor: "var(--brand-surface, #FFFFFF)" }}
      className={`py-14 px-4 sm:px-6 my-8 ${
        theme === "clean_minimal"
          ? "border-y border-neutral-100"
          : theme === "editorial_studio"
          ? "border-y border-neutral-200"
          : "border-y border-slate-200/80"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span
            style={{
              backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
              color: "var(--brand-primary)",
            }}
            className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2.5"
          >
            Como Funciona
          </span>
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {hw.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">{hw.subtitle}</p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {hw.steps.map((st, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "color-mix(in srgb, var(--brand-bg, #F8FAFC) 75%, var(--brand-surface, #FFFFFF))",
              }}
              className={`storefront-card-interactive p-6 border space-y-3 relative ${
                theme === "editorial_studio"
                  ? "rounded-lg border-neutral-200"
                  : "rounded-2xl border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  style={{
                    background: "var(--brand-cta-gradient, var(--brand-primary))",
                    color: "var(--brand-text-on-primary, #FFFFFF)",
                  }}
                  className="w-8 h-8 rounded-xl text-xs font-extrabold flex items-center justify-center shadow-xs"
                >
                  {st.number}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Etapa 0{idx + 1}
                </span>
              </div>
              <h4 className="font-heading text-sm font-bold text-slate-900">{st.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{st.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorefrontBottomCta({
  config,
  whatsapp,
}: {
  config: StoreHomeConfig;
  whatsapp: string;
}) {
  const cta = config.bottomCta;
  if (!cta.enabled) return null;

  const targetHref =
    cta.actionType === "whatsapp"
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
          cta.whatsappMessage || "Olá, gostaria de solicitar um orçamento."
        )}`
      : cta.buttonUrl || "#catalogo";

  const isExternal = targetHref.startsWith("http");

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full mb-8">
      <div
        style={{
          background: cta.bgColor
            ? cta.bgColor
            : "var(--brand-cta-gradient, var(--brand-primary))",
          color: cta.bgColor ? cta.textColor || "#FFFFFF" : "var(--brand-text-on-primary, #FFFFFF)",
          boxShadow: "var(--brand-shadow-hover)",
        }}
        className="p-8 sm:p-10 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden"
      >
        <div className="space-y-2 max-w-xl">
          {cta.tag && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider inline-block">
              {cta.tag}
            </span>
          )}
          <h3 className="font-heading text-xl sm:text-2xl font-bold leading-tight">
            {cta.title}
          </h3>
          <p className="text-xs opacity-90 leading-relaxed">{cta.description}</p>
        </div>

        {isExternal ? (
          <a
            href={targetHref}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs uppercase shadow-sm shrink-0 transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
            <span>{cta.buttonText}</span>
          </a>
        ) : (
          <Link
            href={targetHref}
            className="px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs uppercase shadow-sm shrink-0 transition-all flex items-center gap-2"
          >
            <span>{cta.buttonText}</span>
          </Link>
        )}
      </div>
    </section>
  );
}

export function StorefrontFooter({
  config,
  storeName,
  logoUrl,
}: {
  config: StoreHomeConfig;
  storeName: string;
  logoUrl?: string | null;
}) {
  const f = config.footer;
  const year = new Date().getFullYear();
  const copyright = (f.copyrightText || "© {ano} {nome_loja}. Todos os direitos reservados.")
    .replace("{ano}", String(year))
    .replace("{nome_loja}", storeName);

  return (
    <footer
      style={{ backgroundColor: "var(--brand-surface, #FFFFFF)" }}
      className="border-t border-slate-200/80 mt-auto text-xs text-slate-500"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          {f.showLogo && logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-9 w-auto object-contain" />
          ) : (
            <span className="font-heading text-sm font-bold text-slate-900 uppercase block">
              {storeName}
            </span>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">{f.description}</p>
          {f.legalInfo && <div className="text-[10px] text-slate-400">{f.legalInfo}</div>}
        </div>

        {f.columns.slice(0, 2).map((col, idx) => (
          <div key={idx}>
            <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              {col.title}
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              {col.links.map((lk, lIdx) => (
                <li key={lIdx}>
                  <Link href={lk.url || "/"} className="hover:text-[var(--color-primary)]">
                    {lk.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            {f.supportTitle}
          </h4>
          <ul className="space-y-1.5 text-[11px]">
            {f.supportPhone && <li>WhatsApp: {f.supportPhone}</li>}
            {f.supportEmail && <li>E-mail: {f.supportEmail}</li>}
            {f.supportHours && <li>Horário: {f.supportHours}</li>}
            {f.supportAddress && <li>{f.supportAddress}</li>}
          </ul>
        </div>

        {f.columns.length < 2 && (
          <div>
            <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Formas de Pagamento
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Pix Instantâneo</span>
              </div>
              <div>Cartões de Crédito em até 12x</div>
              <div>Faturamento para Empresas</div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 py-4 text-center text-[10px] text-slate-400">
        {copyright}
      </div>
    </footer>
  );
}
