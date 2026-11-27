"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FiExternalLink, FiMessageSquare, FiZap } from "react-icons/fi";

export interface BannerConfig {
  bg_color_start?: string;
  bg_color_end?: string;
  has_halftone_pattern?: boolean;
  badge_1_bg?: string;
  badge_1_color?: string;
  badge_2_bg?: string;
  badge_2_color?: string;
  title_highlight_color?: string;
  title_suffix_color?: string;
  description_color?: string;
  btn_1_bg?: string;
  btn_1_color?: string;
  btn_2_bg?: string;
  btn_2_color?: string;
  checkmarks_color?: string;
  floating_effect?: boolean;
  floating_speed?: "slow" | "normal" | "fast";
  floating_amplitude?: number;
}

export interface BannerData {
  badge_1?: string | null;
  badge_2?: string | null;
  title_prefix?: string | null;
  title_highlight: string;
  title_suffix?: string | null;
  description?: string | null;
  btn_1_text?: string | null;
  btn_1_url?: string | null;
  btn_2_text?: string | null;
  btn_2_url?: string | null;
  highlight_1?: string | null;
  highlight_2?: string | null;
  highlight_3?: string | null;
  banner_image_url: string;
  config_json?: BannerConfig | null;
}

interface InteractiveHeroBannerProps {
  banner?: BannerData | null;
  isPreview?: boolean;
  theme?: "clean_minimal" | "modern_commerce" | "editorial_studio" | "neo_brutalist";
}

export default function InteractiveHeroBanner({
  banner,
  isPreview = false,
  theme = "modern_commerce",
}: InteractiveHeroBannerProps) {
  const config = banner?.config_json || {};
  const isClean = theme === "clean_minimal";
  const isEditorial = theme === "editorial_studio";
  const isNeoBrutalist = theme === "neo_brutalist";

  const hasCustomBg = Boolean(config.bg_color_start && config.bg_color_start !== "#0052B4");
  const bgStart = hasCustomBg ? config.bg_color_start! : "var(--brand-primary, #084D6E)";
  const bgEnd =
    config.bg_color_end && config.bg_color_end !== "#002F6C"
      ? config.bg_color_end
      : "color-mix(in srgb, var(--brand-primary, #084D6E) 68%, #07131F)";

  const hasHalftone = isNeoBrutalist ? (config.has_halftone_pattern ?? true) : false;

  const badge1Bg = config.badge_1_bg && config.badge_1_bg !== "#FFD100"
    ? config.badge_1_bg
    : "var(--brand-secondary, #00B4D8)";
  const badge1Color = config.badge_1_color && config.badge_1_color !== "#000000"
    ? config.badge_1_color
    : "var(--brand-text-on-secondary, #0F172A)";
  const badge2Bg = config.badge_2_bg || "rgba(255,255,255,0.16)";
  const badge2Color = config.badge_2_color || "#FFFFFF";

  const titleHighlightColor = isClean
    ? "var(--brand-primary, #084D6E)"
    : config.title_highlight_color && config.title_highlight_color !== "#FFD100"
    ? config.title_highlight_color
    : "var(--brand-secondary, #FFD100)";
  const titleSuffixColor = isClean
    ? "#0F172A"
    : config.title_suffix_color || "#FFFFFF";
  const descriptionColor = isClean
    ? "#475569"
    : config.description_color && config.description_color !== "#E0E7FF"
    ? config.description_color
    : "rgba(255, 255, 255, 0.86)";

  const btn1Bg = config.btn_1_bg && config.btn_1_bg !== "#FFD100"
    ? config.btn_1_bg
    : "var(--brand-secondary, #00B4D8)";
  const btn1Color = config.btn_1_color && config.btn_1_color !== "#000000"
    ? config.btn_1_color
    : "var(--brand-text-on-secondary, #0F172A)";
  const btn2Bg = config.btn_2_bg || "rgba(255, 255, 255, 0.14)";
  const btn2Color = isClean ? "#0F172A" : "#FFFFFF";

  const checkmarksColor = isClean ? "#334155" : config.checkmarks_color || "rgba(255,255,255,0.9)";
  const floatingEnabled = config.floating_effect ?? true;
  const speed = config.floating_speed || "normal";

  // Duração da animação baseada na velocidade
  const durationMap = {
    slow: "4.5s",
    normal: "3.2s",
    fast: "2.2s",
  };
  const animDuration = durationMap[speed] || "3.2s";

  // Efeito interativo de Tilt 3D com o mouse
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 8;
    const rotateY = (x / (rect.width / 2)) * 8;
    setTilt({ rotateX, rotateY, scale: 1.04 });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
  };

  const sectionBgStyle = isClean
    ? {
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary, #084D6E) 6%, #FFFFFF) 0%, color-mix(in srgb, var(--brand-secondary, #00B4D8) 8%, #F8FAFC) 100%)",
      }
    : isEditorial
    ? {
        background:
          "linear-gradient(135deg, #0F1115 0%, color-mix(in srgb, var(--brand-primary, #084D6E) 35%, #090B0E) 100%)",
      }
    : {
        background: `linear-gradient(135deg, ${bgStart} 0%, ${bgEnd} 100%)`,
      };

  return (
    <section
      className={`relative w-full overflow-hidden transition-all duration-300 ${
        isClean ? "text-neutral-900 border-b border-neutral-200/70" : "text-white"
      } ${
        isPreview
          ? "rounded-2xl border border-slate-200 shadow-lg py-8 sm:py-12 px-4 sm:px-8"
          : "py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8"
      }`}
      style={sectionBgStyle}
    >
      {/* Textura Halftone apenas no tema Neo-Brutalist */}
      {hasHalftone && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1.5px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
        />
      )}

      {/* Brilho radial suave tingido com a cor secundária da marca */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[320px] sm:w-[540px] h-[320px] sm:h-[540px] rounded-full pointer-events-none opacity-35 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand-secondary, #00B4D8) 45%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Coluna Esquerda: Textos, Badges, Botões e Checkmarks (7 colunas) */}
        <div className="lg:col-span-7 space-y-5 text-left">
          {/* Badges de Destaque */}
          <div className="flex flex-wrap items-center gap-2">
            {banner?.badge_1 && (
              <span
                className={
                  isNeoBrutalist
                    ? "text-[11px] font-black uppercase px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_#000] inline-flex items-center gap-1"
                    : "text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm inline-flex items-center gap-1.5"
                }
                style={{ backgroundColor: badge1Bg, color: badge1Color }}
              >
                {banner.badge_1}
              </span>
            )}
            {banner?.badge_2 && (
              <span
                className={
                  isNeoBrutalist
                    ? "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_#000] tracking-wider"
                    : isClean
                    ? "text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-neutral-200 bg-white text-neutral-700 tracking-wider"
                    : "text-[10px] font-bold uppercase px-3 py-1 rounded-full backdrop-blur-md border border-white/25 tracking-wider"
                }
                style={isClean ? undefined : { backgroundColor: badge2Bg, color: badge2Color }}
              >
                {banner.badge_2}
              </span>
            )}
          </div>

          {/* Título Principal de Alto Impacto */}
          <h1 className="font-heading font-extrabold tracking-tight leading-[1.08] text-3xl sm:text-4xl lg:text-5xl">
            <span className="block mb-1.5" style={{ color: titleHighlightColor }}>
              {banner?.title_highlight || "Sua Marca Sempre Presente!"}
            </span>
            <span className="block font-bold" style={{ color: titleSuffixColor }}>
              {banner?.title_suffix || "Brindes Corporativos e Presentes Sob Medida"}
            </span>
          </h1>

          {/* Descrição detalhada */}
          {banner?.description && (
            <p
              className="text-xs sm:text-sm leading-relaxed max-w-2xl font-medium"
              style={{ color: descriptionColor }}
            >
              {banner.description}
            </p>
          )}

          {/* Botões de Ação (CTAs) */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {banner?.btn_1_text && (
              <a
                href={banner.btn_1_url || "#catalogo"}
                className={
                  isNeoBrutalist
                    ? "font-heading font-black text-xs sm:text-sm py-3 px-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_#000] hover:scale-105 transition-all uppercase inline-flex items-center gap-2"
                    : isClean
                    ? "storefront-cta-btn font-heading font-semibold text-xs sm:text-sm py-3.5 px-7 rounded-full inline-flex items-center gap-2"
                    : isEditorial
                    ? "font-heading font-bold text-xs sm:text-sm py-3.5 px-7 rounded-lg tracking-wider uppercase shadow-lg hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
                    : "font-heading font-bold text-xs sm:text-sm py-3.5 px-7 rounded-xl shadow-lg hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center gap-2"
                }
                style={
                  isClean
                    ? undefined
                    : { backgroundColor: btn1Bg, color: btn1Color }
                }
              >
                <span>{banner.btn_1_text}</span>
              </a>
            )}

            {banner?.btn_2_text && (
              <a
                href={banner.btn_2_url || "https://wa.me/5541997098905"}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isNeoBrutalist
                    ? "font-heading font-black text-xs sm:text-sm py-3 px-5 rounded-lg border-2 border-black shadow-[4px_4px_0px_#000] hover:scale-105 transition-all uppercase inline-flex items-center gap-2"
                    : isClean
                    ? "font-heading font-semibold text-xs sm:text-sm py-3.5 px-6 rounded-full bg-white border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 transition-all inline-flex items-center gap-2"
                    : "font-heading font-semibold text-xs sm:text-sm py-3.5 px-6 rounded-xl backdrop-blur-md border border-white/25 hover:bg-white/25 transition-all inline-flex items-center gap-2"
                }
                style={isClean ? { color: btn2Color } : { backgroundColor: btn2Bg, color: btn2Color }}
              >
                <span>{banner.btn_2_text}</span>
              </a>
            )}
          </div>

          {/* Diferenciais / Checkmarks Pop-Art */}
          <div
            className="flex flex-wrap items-center gap-y-2 gap-x-5 pt-3 text-[11px] sm:text-xs font-bold"
            style={{ color: checkmarksColor }}
          >
            {banner?.highlight_1 && (
              <div className="flex items-center gap-1.5 drop-shadow-sm">
                <span>{banner.highlight_1}</span>
              </div>
            )}
            {banner?.highlight_2 && (
              <div className="flex items-center gap-1.5 drop-shadow-sm">
                <span>{banner.highlight_2}</span>
              </div>
            )}
            {banner?.highlight_3 && (
              <div className="flex items-center gap-1.5 drop-shadow-sm">
                <span>{banner.highlight_3}</span>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Imagem 3D Pop-Art com Efeito de Flutuação Idêntico ao Vídeo (5 colunas) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div
            className="relative cursor-pointer select-none perspective-[1000px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Imagem com Flutuação e Tilt 3D */}
            <div
              className={`relative z-10 transition-transform ${
                floatingEnabled ? "animate-pop-float" : ""
              }`}
              style={{
                animationDuration: animDuration,
                transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
                transition: "transform 0.15s ease-out",
              }}
            >
              <img
                src={banner?.banner_image_url || "/themes/neo_brutalist/jestein_sticker_transparent.png"}
                alt="Banner Pop-Art 3D"
                className="w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[480px] h-auto object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.4)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/themes/neo_brutalist/jestein_sticker_transparent.png";
                }}
              />
            </div>

            {/* Sombra de Chão 3D Dinâmica (expande e contrai com a levitação) */}
            {floatingEnabled && (
              <div
                className="w-48 sm:w-64 h-5 sm:h-6 mx-auto rounded-[100%] bg-black/40 blur-md mt-[-10px] animate-pop-shadow"
                style={{
                  animationDuration: animDuration,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Estilos CSS das Animações Pop-Art de Flutuação e Sombra */}
      <style jsx>{`
        @keyframes popFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-8px) rotate(0.8deg);
          }
          50% {
            transform: translateY(-15px) rotate(0deg);
          }
          75% {
            transform: translateY(-6px) rotate(-0.8deg);
          }
        }

        @keyframes popShadow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(0.75);
            opacity: 0.18;
          }
        }

        .animate-pop-float {
          animation: popFloat ease-in-out infinite;
        }

        .animate-pop-shadow {
          animation: popShadow ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
