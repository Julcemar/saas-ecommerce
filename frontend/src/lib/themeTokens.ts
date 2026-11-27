import { TenantInfo } from "./api";
import { generateThemeCssVariables } from "./themeColors";
import { CSSProperties } from "react";

export type StorefrontTheme = "clean_minimal" | "modern_commerce" | "editorial_studio" | "neo_brutalist";

/**
 * Detecta o tema ativo com precedência:
 * 1. Query parameter na URL (?theme=clean_minimal)
 * 2. tenant.settings_json.theme salvo no banco de dados
 * 3. localStorage("active_theme")
 * 4. Fallback padrão: "modern_commerce"
 */
export function getActiveTheme(tenant: TenantInfo | null): StorefrontTheme {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTheme = urlParams.get("theme");
    if (urlTheme === "clean_minimal" || urlTheme === "clean-minimal") {
      localStorage.setItem("active_theme", "clean_minimal");
      return "clean_minimal";
    }
    if (urlTheme === "modern_commerce" || urlTheme === "modern-commerce") {
      localStorage.setItem("active_theme", "modern_commerce");
      return "modern_commerce";
    }
    if (urlTheme === "editorial_studio" || urlTheme === "editorial-studio") {
      localStorage.setItem("active_theme", "editorial_studio");
      return "editorial_studio";
    }
    if (urlTheme === "neo_brutalist" || urlTheme === "neo-brutalist") {
      localStorage.setItem("active_theme", "neo_brutalist");
      return "neo_brutalist";
    }

    const tenantTheme = (tenant?.settings_json as any)?.theme;
    if (tenantTheme === "clean_minimal" || tenantTheme === "clean-minimal") return "clean_minimal";
    if (tenantTheme === "editorial_studio" || tenantTheme === "editorial-studio") return "editorial_studio";
    if (tenantTheme === "neo_brutalist" || tenantTheme === "neo-brutalist") return "neo_brutalist";
    if (tenantTheme === "modern_commerce" || tenantTheme === "modern-commerce") return "modern_commerce";

    const stored = localStorage.getItem("active_theme");
    if (stored === "clean_minimal" || stored === "editorial_studio" || stored === "neo_brutalist" || stored === "modern_commerce") {
      return stored as StorefrontTheme;
    }
  }

  const tenantTheme = (tenant?.settings_json as any)?.theme;
  if (tenantTheme === "clean_minimal" || tenantTheme === "clean-minimal") return "clean_minimal";
  if (tenantTheme === "editorial_studio" || tenantTheme === "editorial-studio") return "editorial_studio";
  if (tenantTheme === "neo_brutalist" || tenantTheme === "neo-brutalist") return "neo_brutalist";

  return "modern_commerce";
}

export interface ThemeClasses {
  wrapperBg: string;
  wrapperText: string;
  card: string;
  cardHeader: string;
  cardTitle: string;
  cardSubtitle: string;
  divider: string;
  btnPrimary: string;
  btnSecondary: string;
  btnOutline: string;
  btnDanger: string;
  input: string;
  inputLabel: string;
  badge: string;
  badgeSuccess: string;
  badgeWarning: string;
  badgeBrand: string;
  quantityWrapper: string;
  quantityBtn: string;
  quantityValue: string;
  radioCard: string;
  radioCardActive: string;
  tableHead: string;
  tableRow: string;
  tableCell: string;
}

export function getThemeClasses(theme: StorefrontTheme): ThemeClasses {
  switch (theme) {
    case "clean_minimal":
      return {
        wrapperBg: "bg-[#FAFAFA]",
        wrapperText: "text-neutral-900 font-sans",
        card: "bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-xs",
        cardHeader: "border-b border-neutral-100 pb-4 mb-4",
        cardTitle: "font-heading font-semibold text-base text-neutral-900 tracking-tight",
        cardSubtitle: "text-xs text-neutral-500 mt-1",
        divider: "border-neutral-100",
        btnPrimary:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-full px-5 py-2.5 text-xs font-semibold hover:opacity-95 active:scale-98 transition-all shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer",
        btnSecondary:
          "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 rounded-full px-4 py-2 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer",
        btnOutline:
          "border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700 rounded-full px-4 py-2 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer",
        btnDanger:
          "text-rose-600 hover:bg-rose-50 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
        input:
          "w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all",
        inputLabel: "block text-xs font-medium text-neutral-700 mb-1.5",
        badge: "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-600 inline-flex items-center gap-1",
        badgeSuccess: "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1",
        badgeWarning: "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 inline-flex items-center gap-1",
        badgeBrand: "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] inline-flex items-center gap-1",
        quantityWrapper: "flex items-center border border-neutral-200 rounded-full overflow-hidden bg-white p-0.5",
        quantityBtn: "w-7 h-7 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-full text-xs font-bold transition-colors cursor-pointer",
        quantityValue: "px-2.5 text-xs font-semibold text-neutral-900 min-w-[28px] text-center",
        radioCard: "p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all cursor-pointer",
        radioCardActive: "p-4 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 transition-all cursor-pointer shadow-xs",
        tableHead: "bg-neutral-50 text-neutral-500 text-[11px] font-medium uppercase tracking-wider py-2.5 px-4 text-left border-b border-neutral-100",
        tableRow: "border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors",
        tableCell: "py-3 px-4 text-xs text-neutral-700",
      };

    case "editorial_studio":
      return {
        wrapperBg: "bg-[#FCFCFD]",
        wrapperText: "text-neutral-950 font-sans",
        card: "bg-white border border-neutral-200 rounded-none p-6 shadow-none",
        cardHeader: "border-b border-neutral-200 pb-4 mb-5",
        cardTitle: "font-heading font-black text-sm uppercase tracking-widest text-neutral-950",
        cardSubtitle: "text-[11px] text-neutral-500 uppercase tracking-wider mt-1",
        divider: "border-neutral-200",
        btnPrimary:
          "bg-neutral-950 hover:bg-neutral-900 text-white rounded-none px-6 py-3 text-xs font-bold uppercase tracking-widest active:scale-99 transition-all shadow-none inline-flex items-center justify-center gap-2 cursor-pointer",
        btnSecondary:
          "bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-none px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer",
        btnOutline:
          "border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-900 rounded-none px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer",
        btnDanger:
          "text-neutral-500 hover:text-rose-600 rounded-none px-2 py-1 text-xs uppercase tracking-wider transition-colors cursor-pointer",
        input:
          "w-full bg-white border border-neutral-300 rounded-none px-3.5 py-2.5 text-xs text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 transition-all",
        inputLabel: "block text-[11px] font-bold uppercase tracking-wider text-neutral-800 mb-1.5",
        badge: "rounded-none px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border border-neutral-300 text-neutral-700 inline-flex items-center gap-1",
        badgeSuccess: "rounded-none px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border border-emerald-300 bg-emerald-50 text-emerald-800 inline-flex items-center gap-1",
        badgeWarning: "rounded-none px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border border-amber-300 bg-amber-50 text-amber-900 inline-flex items-center gap-1",
        badgeBrand: "rounded-none px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border border-[var(--color-primary)] text-[var(--color-primary)] inline-flex items-center gap-1",
        quantityWrapper: "flex items-center border border-neutral-300 rounded-none overflow-hidden bg-white",
        quantityBtn: "w-8 h-8 flex items-center justify-center text-neutral-800 hover:bg-neutral-100 text-xs font-bold transition-colors cursor-pointer",
        quantityValue: "px-3 text-xs font-bold text-neutral-950 min-w-[32px] text-center border-x border-neutral-200",
        radioCard: "p-4 rounded-none border border-neutral-300 bg-white hover:border-neutral-950 transition-all cursor-pointer",
        radioCardActive: "p-4 rounded-none border-2 border-neutral-950 bg-neutral-50 transition-all cursor-pointer",
        tableHead: "bg-neutral-950 text-neutral-300 text-[10px] font-bold uppercase tracking-widest py-2.5 px-4 text-left border-b border-neutral-800",
        tableRow: "border-b border-neutral-200 hover:bg-neutral-50 transition-colors",
        tableCell: "py-3 px-4 text-xs text-neutral-800",
      };

    case "neo_brutalist":
      return {
        wrapperBg: "bg-[#F4F7FA]",
        wrapperText: "text-black font-sans",
        card: "bg-white border-2 border-black rounded-lg p-6 shadow-[3px_3px_0px_#111111]",
        cardHeader: "border-b-2 border-black pb-3 mb-4",
        cardTitle: "font-heading font-black text-sm uppercase text-black tracking-tight",
        cardSubtitle: "text-xs font-bold text-gray-700 mt-0.5",
        divider: "border-b-2 border-black",
        btnPrimary:
          "bg-[#FFD100] hover:bg-[#FFE033] text-black border-2 border-black rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0px_#111111] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all inline-flex items-center justify-center gap-2 cursor-pointer",
        btnSecondary:
          "bg-white hover:bg-gray-100 text-black border-2 border-black rounded-lg px-4 py-2 text-xs font-bold uppercase shadow-[2px_2px_0px_#111111] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer",
        btnOutline:
          "border-2 border-black bg-white hover:bg-gray-50 text-black rounded-lg px-4 py-2 text-xs font-bold uppercase shadow-[2px_2px_0px_#111111] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer",
        btnDanger:
          "bg-red-500 hover:bg-red-600 text-white border-2 border-black rounded-lg px-2.5 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_#111111] transition-all cursor-pointer",
        input:
          "w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:bg-amber-50 focus:shadow-[2px_2px_0px_#111111] transition-all",
        inputLabel: "block text-xs font-black uppercase tracking-tight text-black mb-1",
        badge: "rounded px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-gray-100 shadow-[1px_1px_0px_#111111] inline-flex items-center gap-1",
        badgeSuccess: "rounded px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-[#7AC943] text-black shadow-[1px_1px_0px_#111111] inline-flex items-center gap-1",
        badgeWarning: "rounded px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-[#FFD100] text-black shadow-[1px_1px_0px_#111111] inline-flex items-center gap-1",
        badgeBrand: "rounded px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-[#0052B4] text-white shadow-[1px_1px_0px_#111111] inline-flex items-center gap-1",
        quantityWrapper: "flex items-center border-2 border-black rounded-lg overflow-hidden bg-white shadow-[2px_2px_0px_#111111]",
        quantityBtn: "w-7 h-7 flex items-center justify-center text-black bg-gray-100 hover:bg-gray-200 text-xs font-black transition-colors cursor-pointer",
        quantityValue: "px-2 text-xs font-black text-black min-w-[28px] text-center border-x-2 border-black",
        radioCard: "p-4 rounded-lg border-2 border-black bg-white hover:bg-gray-50 shadow-[2px_2px_0px_#111111] transition-all cursor-pointer",
        radioCardActive: "p-4 rounded-lg border-2 border-black bg-amber-100 shadow-[3px_3px_0px_#111111] transition-all cursor-pointer",
        tableHead: "bg-black text-[#FFD100] text-[11px] font-black uppercase tracking-wider py-2.5 px-4 text-left border-b-2 border-black",
        tableRow: "border-b border-black/30 hover:bg-amber-50/50 transition-colors",
        tableCell: "py-3 px-4 text-xs font-bold text-black",
      };

    case "modern_commerce":
    default:
      return {
        wrapperBg: "bg-[#F8FAFC]",
        wrapperText: "text-slate-900 font-sans",
        card: "bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm",
        cardHeader: "border-b border-slate-100 pb-4 mb-4",
        cardTitle: "font-heading font-bold text-base text-slate-900 tracking-tight",
        cardSubtitle: "text-xs text-slate-500 mt-1",
        divider: "border-slate-100",
        btnPrimary:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-xl px-5 py-2.5 text-xs font-bold hover:brightness-105 active:scale-98 transition-all shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer",
        btnSecondary:
          "bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl px-4 py-2 text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer",
        btnOutline:
          "border border-slate-300 hover:border-slate-400 bg-white text-slate-700 rounded-xl px-4 py-2 text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer",
        btnDanger:
          "text-rose-600 hover:bg-rose-50 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
        input:
          "w-full bg-white border border-slate-300/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all",
        inputLabel: "block text-xs font-semibold text-slate-700 mb-1.5",
        badge: "rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 backdrop-blur-md inline-flex items-center gap-1",
        badgeSuccess: "rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1",
        badgeWarning: "rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1",
        badgeBrand: "rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] inline-flex items-center gap-1",
        quantityWrapper: "flex items-center border border-slate-300/80 rounded-xl overflow-hidden bg-white",
        quantityBtn: "w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer",
        quantityValue: "px-2 text-xs font-bold text-slate-900 min-w-[28px] text-center border-x border-slate-100",
        radioCard: "p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all cursor-pointer",
        radioCardActive: "p-4 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 transition-all cursor-pointer shadow-xs",
        tableHead: "bg-slate-50 text-slate-600 text-[11px] font-semibold uppercase tracking-wider py-2.5 px-4 text-left border-b border-slate-200",
        tableRow: "border-b border-slate-100 hover:bg-slate-50/70 transition-colors",
        tableCell: "py-3 px-4 text-xs text-slate-700",
      };
  }
}
