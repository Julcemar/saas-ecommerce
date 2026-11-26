import { TenantInfo } from "./api";
import { BannerData } from "@/components/InteractiveHeroBanner";

export interface TopBarLink {
  label: string;
  url: string;
}

export interface BenefitCardItem {
  icon: "Truck" | "Percent" | "Shield" | "Clock" | "Award" | "Sparkles" | "Zap" | "CheckCircle";
  title: string;
  subtitle: string;
}

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface StoreHomeConfig {
  topBar: {
    enabled: boolean;
    badgeText: string;
    message: string;
    links: TopBarLink[];
    useThemePrimary: boolean;
    bgColor: string;
    textColor: string;
  };
  header: {
    logoMaxHeightPx: number;
    searchPlaceholder: string;
    showCategoriesAuto: boolean;
  };
  hero: {
    enabled: boolean;
    mode: "compound" | "full_image";
    desktopImageUrl: string;
    mobileImageUrl: string;
    badge1: string;
    badge2: string;
    titleHighlight: string;
    titleSuffix: string;
    description: string;
    primaryBtnText: string;
    primaryBtnUrl: string;
    secondaryBtnText: string;
    secondaryBtnUrl: string;
    highlights: string[];
    bgColorStart: string;
    bgColorEnd: string;
  };
  benefits: {
    enabled: boolean;
    items: BenefitCardItem[];
  };
  howItWorks: {
    enabled: boolean;
    title: string;
    subtitle: string;
    steps: HowItWorksStep[];
  };
  bottomCta: {
    enabled: boolean;
    tag: string;
    title: string;
    description: string;
    buttonText: string;
    actionType: "link" | "whatsapp";
    buttonUrl: string;
    whatsappMessage: string;
    bgColor: string;
    textColor: string;
  };
  footer: {
    showLogo: boolean;
    description: string;
    legalInfo: string;
    columns: FooterColumn[];
    supportTitle: string;
    supportHours: string;
    supportEmail: string;
    supportPhone: string;
    supportAddress: string;
    copyrightText: string;
  };
}

export const DEFAULT_HOME_CONFIG: StoreHomeConfig = {
  topBar: {
    enabled: true,
    badgeText: "Frete & Atacado",
    message: "Descontos progressivos automáticos por quantidade no carrinho!",
    links: [
      { label: "Suporte WhatsApp", url: "https://wa.me/5541997098905" },
      { label: "Painel do Lojista", url: "/admin" },
    ],
    useThemePrimary: true,
    bgColor: "#084D6E",
    textColor: "#FFFFFF",
  },
  header: {
    logoMaxHeightPx: 52,
    searchPlaceholder: "Buscar canecas, camisetas, squeezes corporativos...",
    showCategoriesAuto: true,
  },
  hero: {
    enabled: true,
    mode: "compound",
    desktopImageUrl: "/themes/neo_brutalist/jestein_sticker_transparent.png",
    mobileImageUrl: "",
    badge1: "⚡ PRODUÇÃO PRÓPRIA E ENVIO RÁPIDO",
    badge2: "NOVO",
    titleHighlight: "Sua Marca Sempre Presente!",
    titleSuffix: "Brindes Corporativos e Presentes Sob Medida",
    description:
      "Canecas, camisetas, canetas gravadas a laser, ecobags, squeezes e kits corporativos completos de alta durabilidade com sua identidade visual.",
    primaryBtnText: "Explorar Catálogo",
    primaryBtnUrl: "#catalogo",
    secondaryBtnText: "Orçamento no WhatsApp",
    secondaryBtnUrl: "https://wa.me/5541997098905",
    highlights: [
      "Prévia virtual gratuita antes da produção",
      "Desconto progressivo por quantidade",
      "Pix imediato ou até 12x",
    ],
    bgColorStart: "#0052B4",
    bgColorEnd: "#002F6C",
  },
  benefits: {
    enabled: true,
    items: [
      { icon: "Truck", title: "Envio para Todo o Brasil", subtitle: "Frete calculado e rastreado" },
      { icon: "Percent", title: "Desconto Progressivo", subtitle: "Compre mais e pague menos" },
      { icon: "Shield", title: "Prévia Antes de Produzir", subtitle: "Aprovação digital da sua arte" },
      { icon: "Clock", title: "Produção Ágil", subtitle: "Prazos transparentes por item" },
    ],
  },
  howItWorks: {
    enabled: true,
    title: "Passo a passo simplificado",
    subtitle: "Veja como seu pedido é produzido com máxima fidelidade",
    steps: [
      { number: "1", title: "Seleção no Catálogo", description: "Adicione ao carrinho as quantidades necessárias com desconto progressivo." },
      { number: "2", title: "Envio da Sua Marca", description: "Faça o upload do seu vetor (PDF, SVG, PNG) ou informe as frases desejadas." },
      { number: "3", title: "Validação da Arte", description: "Apresentamos uma prévia virtual para sua autorização antes de iniciar." },
      { number: "4", title: "Despacho Rastreado", description: "Embalagem cuidadosa e transporte ágil com código de rastreamento." },
    ],
  },
  bottomCta: {
    enabled: true,
    tag: "Vendas Corporativas & Tiragens Especiais",
    title: "Precisa de orçamento corporativo faturado para sua empresa?",
    description:
      "Atendemos campanhas de endomarketing, brindes de fim de ano e eventos corporativos com condições exclusivas no atacado.",
    buttonText: "Solicitar Cotação B2B",
    actionType: "whatsapp",
    buttonUrl: "#catalogo",
    whatsappMessage: "Olá, gostaria de solicitar uma cotação B2B corporativa.",
    bgColor: "",
    textColor: "#FFFFFF",
  },
  footer: {
    showLogo: true,
    description:
      "Soluções completas em personalização e presentes corporativos de alto padrão com despacho para todo o Brasil.",
    legalInfo: "CNPJ Ativo • Atendimento Direto",
    columns: [
      {
        title: "Catálogo",
        links: [
          { label: "Mais Vendidos", url: "#catalogo" },
          { label: "Carrinho de Compras", url: "/carrinho" },
          { label: "Área Administrativa", url: "/admin" },
        ],
      },
    ],
    supportTitle: "Atendimento",
    supportHours: "08h às 18h (Seg. a Sex.)",
    supportEmail: "contato@loja.com.br",
    supportPhone: "(41) 99709-8905",
    supportAddress: "Curitiba - PR • Envio Nacional",
    copyrightText: "© {ano} {nome_loja}. Todos os direitos reservados.",
  },
};

export function mergeHomeConfig(
  tenant?: TenantInfo | null,
  bannerData?: BannerData | null
): StoreHomeConfig {
  const raw = (tenant?.home_config || {}) as Partial<StoreHomeConfig>;

  const heroFromBanner = bannerData
    ? {
        desktopImageUrl: bannerData.banner_image_url || DEFAULT_HOME_CONFIG.hero.desktopImageUrl,
        badge1: bannerData.badge_1 || DEFAULT_HOME_CONFIG.hero.badge1,
        badge2: bannerData.badge_2 || DEFAULT_HOME_CONFIG.hero.badge2,
        titleHighlight: bannerData.title_highlight || DEFAULT_HOME_CONFIG.hero.titleHighlight,
        titleSuffix: bannerData.title_suffix || DEFAULT_HOME_CONFIG.hero.titleSuffix,
        description: bannerData.description || DEFAULT_HOME_CONFIG.hero.description,
        primaryBtnText: bannerData.btn_1_text || DEFAULT_HOME_CONFIG.hero.primaryBtnText,
        primaryBtnUrl: bannerData.btn_1_url || DEFAULT_HOME_CONFIG.hero.primaryBtnUrl,
        secondaryBtnText: bannerData.btn_2_text || DEFAULT_HOME_CONFIG.hero.secondaryBtnText,
        secondaryBtnUrl: bannerData.btn_2_url || DEFAULT_HOME_CONFIG.hero.secondaryBtnUrl,
        highlights: [
          bannerData.highlight_1,
          bannerData.highlight_2,
          bannerData.highlight_3,
        ].filter(Boolean) as string[],
        bgColorStart: bannerData.config_json?.bg_color_start || DEFAULT_HOME_CONFIG.hero.bgColorStart,
        bgColorEnd: bannerData.config_json?.bg_color_end || DEFAULT_HOME_CONFIG.hero.bgColorEnd,
      }
    : {};

  return {
    topBar: { ...DEFAULT_HOME_CONFIG.topBar, ...(raw.topBar || {}) },
    header: { ...DEFAULT_HOME_CONFIG.header, ...(raw.header || {}) },
    hero: { ...DEFAULT_HOME_CONFIG.hero, ...heroFromBanner, ...(raw.hero || {}) },
    benefits: {
      enabled: raw.benefits?.enabled ?? DEFAULT_HOME_CONFIG.benefits.enabled,
      items:
        raw.benefits?.items && raw.benefits.items.length > 0
          ? raw.benefits.items
          : DEFAULT_HOME_CONFIG.benefits.items,
    },
    howItWorks: {
      ...DEFAULT_HOME_CONFIG.howItWorks,
      ...(raw.howItWorks || {}),
      steps:
        raw.howItWorks?.steps && raw.howItWorks.steps.length > 0
          ? raw.howItWorks.steps
          : DEFAULT_HOME_CONFIG.howItWorks.steps,
    },
    bottomCta: { ...DEFAULT_HOME_CONFIG.bottomCta, ...(raw.bottomCta || {}) },
    footer: {
      ...DEFAULT_HOME_CONFIG.footer,
      ...(raw.footer || {}),
      columns:
        raw.footer?.columns && raw.footer.columns.length > 0
          ? raw.footer.columns
          : DEFAULT_HOME_CONFIG.footer.columns,
    },
  };
}
