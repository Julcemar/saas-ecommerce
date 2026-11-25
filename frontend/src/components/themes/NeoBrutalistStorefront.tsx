"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TenantInfo, ProductItem, fetchApi, NavigationItem } from "@/lib/api";
import InteractiveHeroBanner, { BannerData } from "@/components/InteractiveHeroBanner";
import CartDrawer from "@/components/CartDrawer";
import {
  FiSearch,
  FiUser,
  FiShoppingCart,
  FiCheckCircle,
  FiCheck,
  FiTruck,
  FiCreditCard,
  FiPercent,
  FiShield,
  FiArrowRight,
  FiMessageSquare,
  FiChevronDown,
  FiPlus,
} from "react-icons/fi";

interface NeoBrutalistStorefrontProps {
  tenant: TenantInfo | null;
  products?: ProductItem[];
  categories?: any[];
}

export default function NeoBrutalistStorefront({
  tenant,
  products = [],
  categories = [],
}: NeoBrutalistStorefrontProps) {
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bannerData, setBannerData] = useState<BannerData | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const storeName = tenant?.name || "JESTEIN PERSONALIZADOS";
  const whatsapp = tenant?.settings_json?.whatsapp_phone || "5541997098905";

  // Sincroniza a contagem do carrinho em tempo real
  const updateCartCount = () => {
    try {
      const raw = localStorage.getItem("saas_cart");
      if (raw) {
        const items = JSON.parse(raw);
        setCartCount(items.reduce((acc: number, item: any) => acc + item.quantity, 0));
      } else {
        setCartCount(0);
      }
    } catch (_) {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener("cart-updated", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    return () => {
      window.removeEventListener("cart-updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [bannerRes, navRes] = await Promise.all([
          fetchApi("/storefront/banner"),
          fetchApi("/storefront/navigation"),
        ]);

        if (bannerRes.ok) {
          const data = await bannerRes.json();
          if (data) setBannerData(data);
        }

        if (navRes.ok) {
          const nData = await navRes.json();
          if (Array.isArray(nData) && nData.length > 0) {
            setNavigationItems(nData);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar dados do cabeçalho/banner:", e);
      }
    }
    loadData();
  }, []);

  // Adição rápida ao carrinho diretamente do card de produto
  const handleQuickAddToCart = (e: React.MouseEvent, prod: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("saas_cart");
      const cart = raw ? JSON.parse(raw) : [];

      const unitPrice = prod.base_price
        ? Number(prod.base_price)
        : Number(String(prod.price || "38").replace(",", "."));

      const existingIdx = cart.findIndex(
        (item: any) =>
          item.product?.id === prod.id ||
          item.product?.slug === prod.slug
      );

      if (existingIdx >= 0) {
        cart[existingIdx].quantity += 1;
      } else {
        cart.push({
          product: {
            id: prod.id || `prod-${Date.now()}`,
            name: prod.name,
            slug: prod.slug,
            base_price: unitPrice,
            image_url: prod.image_url || prod.img || "/themes/neo_brutalist/caneca-prod-large.png",
            wholesale_tiers: prod.wholesale_tiers || [],
          },
          quantity: 1,
          unit_price: unitPrice,
        });
      }

      localStorage.setItem("saas_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
      setIsCartOpen(true);
    } catch (err) {
      console.error("Erro ao adicionar rápido ao carrinho:", err);
    }
  };

  // Categorias temáticas Pop-Art do layout oficial com imagens de alta qualidade
  const POP_ART_CATEGORIES = [
    {
      name: "Canecas",
      color: "border-[#FFD100] bg-amber-50",
      topBg: "bg-[#FFD100]",
      img: "/themes/neo_brutalist/caneca-prod-large.png",
      count: "24 itens",
      slug: "canecas",
    },
    {
      name: "Camisetas",
      color: "border-[#0052B4] bg-blue-50",
      topBg: "bg-[#0052B4]",
      img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=350&auto=format&fit=crop&q=80",
      count: "18 itens",
      slug: "camisetas",
    },
    {
      name: "Canetas",
      color: "border-[#4B2683] bg-purple-50",
      topBg: "bg-[#4B2683]",
      img: "https://images.unsplash.com/photo-1585336261026-7f41fa9044f7?w=350&auto=format&fit=crop&q=80",
      count: "32 itens",
      slug: "canetas-e-laser",
    },
    {
      name: "Bolsas e Ecobags",
      color: "border-[#7AC943] bg-emerald-50",
      topBg: "bg-[#7AC943]",
      img: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=350&auto=format&fit=crop&q=80",
      count: "12 itens",
      slug: "bolsas-e-ecobags",
    },
    {
      name: "Squeezes e Garrafas",
      color: "border-[#D92027] bg-rose-50",
      topBg: "bg-[#D92027]",
      img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=350&auto=format&fit=crop&q=80",
      count: "16 itens",
      slug: "squeezes-e-termicas",
    },
    {
      name: "Kits Corporativos",
      color: "border-[#FFD100] bg-amber-50",
      topBg: "bg-[#FFD100]",
      img: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=350&auto=format&fit=crop&q=80",
      count: "9 kits",
      slug: "kits-corporativos",
    },
  ];

  // Cores Pop-Art rotativas para molduras e badges
  const POP_COLORS = [
    { frame: "border-[#0052B4]", badgeBg: "bg-[#D92027] text-white", top: "bg-[#0052B4]" },
    { frame: "border-[#00B4D8]", badgeBg: "bg-[#FFD100] text-black", top: "bg-[#00B4D8]" },
    { frame: "border-[#4B2683]", badgeBg: "bg-[#7AC943] text-black", top: "bg-[#4B2683]" },
    { frame: "border-[#D92027]", badgeBg: "bg-[#0052B4] text-white", top: "bg-[#D92027]" },
  ];

  // Produtos demonstrativos com dados e slugs reais vinculados ao catálogo
  const FEATURED_PRODUCTS = [
    {
      id: "4e6df397-642f-47c8-9d3e-21e332f2d79c",
      name: "Camiseta 100% Algodão Fio 30.1 Personalizada",
      sku: "CAM-ALG-01",
      price: "45,90",
      wholesalePrice: "38,00",
      badge: "MAIS VENDIDO",
      badgeColor: "bg-[#D92027] text-white",
      frameColor: "border-[#0052B4]",
      topBanner: "bg-[#0052B4]",
      slug: "camiseta-100-algodao-fio-30-1",
    },
    {
      id: "47c08ca7-7b43-473b-b4cd-83e0d967e21b",
      name: "Camiseta Dry-Fit Esportiva / Eventos Personalizada",
      sku: "CAM-DRY-02",
      price: "44,90",
      wholesalePrice: "37,00",
      badge: "HOT 2026",
      badgeColor: "bg-[#FFD100] text-black",
      frameColor: "border-[#00B4D8]",
      topBanner: "bg-[#00B4D8]",
      slug: "camiseta-dry-fit-esportiva",
    },
    {
      id: "0b4ac33f-98d9-49b4-b9a4-9cf54b3bf3e0",
      name: "Caneca de Cerâmica Branca Personalizada 325ml",
      sku: "CAN-CER-03",
      price: "38,00",
      wholesalePrice: "29,90",
      badge: "MAIS VENDIDO",
      badgeColor: "bg-[#D92027] text-white",
      frameColor: "border-[#0052B4]",
      topBanner: "bg-[#0052B4]",
      img: "/themes/neo_brutalist/caneca-prod-large.png",
      slug: "caneca-ceramica-325ml",
    },
    {
      id: "e725c784-d814-4c84-84d9-e2d4a3b0ca5e",
      name: "Caneca Térmica Inox Escovado Personalizada 500ml",
      sku: "CAN-TER-04",
      price: "42,90",
      wholesalePrice: "36,00",
      badge: "GRAVAÇÃO LASER",
      badgeColor: "bg-[#4B2683] text-white",
      frameColor: "border-black",
      topBanner: "bg-black",
      slug: "caneca-termica-inox-escovado-500ml",
    },
    {
      id: "ed9b4331-b9a6-4152-bf9d-b21bcc9181c7",
      name: "Caneta Metálica Executiva Gravada a Laser",
      sku: "CAN-MET-05",
      price: "12,90",
      wholesalePrice: "9,90",
      badge: "GRAVAÇÃO LASER",
      badgeColor: "bg-[#7AC943] text-black",
      frameColor: "border-[#0052B4]",
      topBanner: "bg-[#0052B4]",
      slug: "caneta-metalica-executiva-laser",
    },
    {
      id: "c9476cd9-e45e-461d-8bf2-4e8c81b46ccf",
      name: "Caneta Metálica Touch com Ponta Stylus",
      sku: "CAN-PLA-06",
      price: "9,90",
      wholesalePrice: "7,80",
      badge: "ECONÔMICO",
      badgeColor: "bg-[#FFD100] text-black",
      frameColor: "border-[#4B2683]",
      topBanner: "bg-[#4B2683]",
      slug: "caneta-metalica-touch-laser",
    },
    {
      id: "0fa9191c-b43f-425e-ab57-74ecedaa4697",
      name: "Squeeze Alumínio 500ml com Tampa Mosquetão",
      sku: "SQU-ALU-07",
      price: "28,90",
      wholesalePrice: "21,50",
      badge: "ECOLÓGICO",
      badgeColor: "bg-[#00B4D8] text-white",
      frameColor: "border-[#7AC943]",
      topBanner: "bg-[#7AC943]",
      slug: "squeeze-aluminio-500ml-personalizado",
    },
    {
      id: "71ebb46f-640e-48a0-b6ed-1dea632819f1",
      name: "Kit Boas-Vindas Corporativo Premium (Caderno + Caneta + Garrafa)",
      sku: "KIT-ONB-08",
      price: "99,90",
      wholesalePrice: "85,00",
      badge: "KIT EXCLUSIVO",
      badgeColor: "bg-[#FFD100] text-black",
      frameColor: "border-[#D92027]",
      topBanner: "bg-[#D92027]",
      slug: "kit-boas-vindas-corporativo-premium",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FA] text-[#111111] font-sans">
      {/* 1. TOP BAR PRETA OFICIAL */}
      <div className="bg-[#111111] text-white text-[11px] font-semibold py-1.5 px-4 border-b border-black">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span>48h para produzir</span>
            <span className="text-[#FFD100]">•</span>
            <span>Atacado progressivo com desconto por quantidade</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`https://wa.me/${whatsapp}?text=Olá,%20gostaria%20de%20atendimento%20corporativo.`}
              target="_blank"
              rel="noreferrer"
              className="text-[#7AC943] hover:underline flex items-center gap-1 font-bold"
            >
              WhatsApp: (41) 99709-8905
            </a>
            <Link href="/admin" className="text-gray-300 hover:text-white font-medium">
              Acesso Administrador
            </Link>
          </div>
        </div>
      </div>

      {/* 2. HEADER PRINCIPAL */}
      <header className="bg-white border-b-2 border-black sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo Jestein Comic 3D */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="relative">
              <span className="font-heading text-xl sm:text-2xl font-black italic tracking-tighter text-[#0052B4] drop-shadow-[2px_2px_0px_#111111] uppercase select-none">
                JESTEIN
              </span>
              <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#111111] bg-[#FFD100] px-1.5 py-0.2 rounded border border-black shadow-[1px_1px_0px_#111111]">
                PERSONALIZADOS
              </span>
            </div>
          </Link>

          {/* Campo de Busca com Botão Amarelo */}
          <div className="hidden md:flex flex-1 max-w-lg items-center relative">
            <input
              type="text"
              placeholder="Buscar canecas, camisetas, squeezes corporativos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border-2 border-black rounded-l-lg bg-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button
              type="button"
              className="bg-[#FFD100] hover:bg-[#FFE033] text-black font-black text-xs px-5 py-2 border-2 border-l-0 border-black rounded-r-lg uppercase shadow-[2px_2px_0px_#111111] transition-all"
            >
              BUSCAR
            </button>
          </div>

          {/* Botões à Direita: Conta & Carrinho Comic */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-black border-2 border-black rounded-lg px-3 py-1.5 bg-white shadow-[2px_2px_0px_#111111] hover:bg-gray-50"
            >
              <FiUser className="w-3.5 h-3.5" />
              <span>CONTA</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 bg-[#FFD100] hover:bg-[#FFE033] text-black font-black text-xs px-3.5 py-2 border-2 border-black rounded-lg shadow-[3px_3px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer select-none"
              title="Abrir carrinho de compras"
            >
              <FiShoppingCart className="w-4 h-4" />
              <span>CARRINHO ({cartCount})</span>
            </button>
          </div>
        </div>

        {/* 3. BARRA DE CATEGORIAS AZUL ROYAL COM DROPDOWN DE 2 NÍVEIS */}
        <div className="bg-[#0052B4] border-t-2 border-black px-4 py-1.5 relative z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] font-bold text-white uppercase tracking-wide gap-4 select-none">
            <nav className="flex items-center gap-5 whitespace-nowrap overflow-x-visible py-1">
              {(navigationItems.length > 0
                ? navigationItems
                : [
                    { id: "def-1", label: "TODOS OS PRODUTOS", url: "/#catalogo", type: "custom_link", children: [] },
                    { id: "def-2", label: "CANECAS", url: "/#catalogo?categoria=canecas", type: "category", children: [] },
                    { id: "def-3", label: "CAMISETAS", url: "/#catalogo?categoria=camisetas", type: "category", children: [] },
                    { id: "def-4", label: "KITS CORPORATIVOS", url: "/#catalogo?categoria=kits-corporativos", type: "category", children: [] },
                    { id: "def-5", label: "SQUEEZES", url: "/#catalogo?categoria=squeezes-e-termicas", type: "category", children: [] },
                  ]
              ).map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isOpen = activeDropdown === item.id;

                if (!hasChildren) {
                  return (
                    <Link
                      key={item.id}
                      href={item.url}
                      className="hover:text-[#FFD100] transition-colors py-1 flex items-center gap-1"
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="relative group py-1"
                    onMouseEnter={() => setActiveDropdown(item.id)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <Link
                      href={item.url}
                      onClick={(e) => {
                        if (typeof window !== "undefined" && window.innerWidth < 768 && activeDropdown !== item.id) {
                          e.preventDefault();
                          setActiveDropdown(item.id);
                        }
                      }}
                      className="hover:text-[#FFD100] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <FiChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#FFD100]" : "group-hover:rotate-180"
                        }`}
                      />
                    </Link>

                    {/* Dropdown Nível 2 Pop-Art */}
                    <div
                      className={`absolute left-0 top-full pt-1.5 z-50 min-w-[210px] ${
                        isOpen ? "block" : "hidden group-hover:block"
                      }`}
                    >
                      <div className="bg-white text-black border-2 border-black rounded-lg shadow-[4px_4px_0px_#111111] p-1.5 flex flex-col gap-1">
                        {item.children.map((sub) => (
                          <Link
                            key={sub.id}
                            href={sub.url}
                            className="px-3 py-1.5 text-xs font-black uppercase text-left hover:bg-[#FFD100] text-black rounded border border-transparent hover:border-black transition-colors"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>

            <a
              href={`https://wa.me/${whatsapp}?text=Olá,%20gostaria%20de%20um%20orçamento%20no%20Atacado%20B2B.`}
              target="_blank"
              rel="noreferrer"
              className="bg-[#FFD100] hover:bg-[#FFE033] text-black px-3 py-1 rounded border-2 border-black shadow-[2px_2px_0px_#111111] font-black text-[10px] whitespace-nowrap shrink-0 transition-transform hover:scale-105 ml-auto"
            >
              ⚡ ATACADO B2B
            </a>
          </div>
        </div>
      </header>

      {/* 4. HERO BANNER PRINCIPAL POP-ART TOTALMENTE EDITÁVEL COM EFEITO FLUTUANTE 3D */}
      <InteractiveHeroBanner banner={bannerData} />

      {/* 5. FAIXA DE 4 BENEFÍCIOS */}
      <section className="max-w-7xl mx-auto px-4 -mt-5 z-10 w-full mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0052B4] text-white flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_#111111]">
              <FiShield className="w-5 h-5 text-[#FFD100]" />
            </div>
            <div>
              <h4 className="font-heading text-xs font-bold text-black leading-tight">
                Trabalho sem Intermediário
              </h4>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Direto da fábrica para o seu evento ou empresa.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0052B4] text-white flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_#111111]">
              <FiCreditCard className="w-5 h-5 text-[#FFD100]" />
            </div>
            <div>
              <h4 className="font-heading text-xs font-bold text-black leading-tight">
                Divida em até 12x
              </h4>
              <p className="text-[10px] text-gray-600 mt-0.5">
                No cartão de crédito ou Pix com desconto.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0052B4] text-white flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_#111111]">
              <FiPercent className="w-5 h-5 text-[#FFD100]" />
            </div>
            <div>
              <h4 className="font-heading text-xs font-bold text-black leading-tight">
                Desconto Progressivo
              </h4>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Quanto mais você compra, menos paga por unidade.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0052B4] text-white flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_#111111]">
              <FiTruck className="w-5 h-5 text-[#FFD100]" />
            </div>
            <div>
              <h4 className="font-heading text-xs font-bold text-black leading-tight">
                Envio para Todo o Brasil
              </h4>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Frete rápido e seguro com rastreamento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CATEGORIAS POPULARES */}
      <section className="max-w-7xl mx-auto px-4 py-6 w-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-heading text-lg font-black text-black">
              Categorias Populares
            </h2>
            <p className="text-xs text-gray-500">
              Navegue pelo nosso catálogo especializado por nicho
            </p>
          </div>
          <a
            href="#catalogo"
            className="text-xs font-black px-3 py-1 bg-white border-2 border-black rounded shadow-[2px_2px_0px_#111111] hover:bg-gray-50 uppercase"
          >
            VER TODAS
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
          {POP_ART_CATEGORIES.map((cat, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_#111111] hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between`}
            >
              {/* Miniatura do nicho */}
              <div className={`w-full h-20 rounded-lg border-2 ${cat.color} flex items-center justify-center overflow-hidden mb-2 relative`}>
                {cat.img ? (
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-between p-1">
                    <div className={`w-full h-2 rounded ${cat.topBg}`} />
                    <span className="font-bold text-[9px] text-gray-400">Preview</span>
                    <div className={`w-full h-1.5 rounded ${cat.topBg} opacity-50`} />
                  </div>
                )}
              </div>

              <div className="text-center">
                <h4 className="font-heading text-xs font-bold text-black">
                  {cat.name}
                </h4>
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  {cat.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. DESTAQUES & MAIS VENDIDOS */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-3">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-black uppercase">
              Destaques & Mais Vendidos
            </h2>
            <p className="text-xs text-gray-500">
              Muitos pedidos entregues e avaliações 5 estrelas
            </p>
          </div>
          <button
            type="button"
            className="bg-[#0052B4] hover:bg-[#003B82] text-white font-black text-xs px-4 py-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_#111111] uppercase hidden sm:block"
          >
            VER CATÁLOGO COMPLETO
          </button>
        </div>

        {/* Grid de Cards de Produtos Reais do Catálogo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {((products && products.length > 0 ? products : FEATURED_PRODUCTS) as any[])
            .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((prod, idx) => {
              const colorTheme = POP_COLORS[idx % POP_COLORS.length];
              const priceFormatted = prod.base_price
                ? Number(prod.base_price).toFixed(2).replace(".", ",")
                : (prod.price || "38,00");

              let wholesaleTag = "Atacado progressivo no carrinho";
              if (prod.wholesale_tiers && prod.wholesale_tiers.length > 0) {
                const sortedTiers = [...prod.wholesale_tiers].sort((a, b) => Number(a.unit_price) - Number(b.unit_price));
                const bestTier = sortedTiers[0];
                wholesaleTag = `${bestTier.min_quantity}+ un: R$ ${Number(bestTier.unit_price).toFixed(2).replace(".", ",")}/un`;
              } else if (prod.wholesalePrice) {
                wholesaleTag = `100+ un: R$ ${prod.wholesalePrice}/un`;
              }

              const badgeText = prod.badge_label || prod.badge || "DESTAQUE";
              const imgUrl = prod.image_url || prod.img || "/themes/neo_brutalist/caneca-prod-large.png";

              return (
                <div
                  key={prod.id || idx}
                  className="p-3 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#111111] hover:-translate-y-1 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Badge Superior */}
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border border-black uppercase shadow-[1px_1px_0px_#111111] ${colorTheme.badgeBg}`}>
                        🔥 {badgeText}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {prod.sku || `SKU-${idx + 1}`}
                      </span>
                    </div>

                    {/* Moldura Interna do Produto com Foto Real */}
                    <Link
                      href={`/produto/${prod.slug}`}
                      className={`w-full h-40 rounded-lg border-2 ${colorTheme.frame} bg-white flex items-center justify-center overflow-hidden mb-3 p-1 relative block group`}
                    >
                      <img
                        src={imgUrl}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          // Fallback gracioso para a caneca do tema se a URL externa falhar
                          (e.target as HTMLImageElement).src = "/themes/neo_brutalist/caneca-prod-large.png";
                        }}
                      />
                    </Link>

                    {/* Título do Produto */}
                    <Link href={`/produto/${prod.slug}`}>
                      <h3 className="font-heading text-xs font-bold text-black line-clamp-2 min-h-[32px] hover:text-[#0052B4] transition-colors">
                        {prod.name}
                      </h3>
                    </Link>

                    {/* Preço Unitário Base */}
                    <div className="mt-2">
                      <span className="text-sm font-black text-[#0052B4]">
                        R$ {priceFormatted}
                      </span>
                    </div>

                    {/* Tag de Atacado Progressivo */}
                    <div className="mt-1">
                      <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-500 font-bold text-[10px] px-2 py-0.5 rounded">
                        {wholesaleTag}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação do Card: Personalizar e Compra Rápida */}
                  <div className="pt-3 mt-3 border-t border-gray-100 flex items-center gap-2">
                    <Link
                      href={`/produto/${prod.slug}`}
                      className="flex-1 bg-white hover:bg-gray-100 text-black font-black text-[11px] py-2 px-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all text-center uppercase tracking-tight"
                    >
                      PERSONALIZAR
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => handleQuickAddToCart(e, prod)}
                      className="flex-1 bg-[#FFD100] hover:bg-[#FFE033] text-black font-black text-[11px] py-2 px-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1 uppercase tracking-tight cursor-pointer"
                      title="Adicionar ao carrinho imediatamente"
                    >
                      <FiShoppingCart className="w-3.5 h-3.5" />
                      <span>COMPRAR</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* 8. SEÇÃO: COMO FUNCIONA A PERSONALIZAÇÃO */}
      <section className="bg-white border-y-2 border-black py-12 px-4 my-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-xl sm:text-2xl font-black text-[#0052B4] uppercase">
              Como Funciona a Personalização na JESTEIN
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Processo simples, transparente e sem burocracia
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111]">
              <div className="w-7 h-7 rounded-full bg-[#FFD100] border-2 border-black text-black font-black text-xs flex items-center justify-center mb-3 shadow-[1px_1px_0px_#111111]">
                1
              </div>
              <h4 className="font-heading text-xs font-bold text-black mb-1">
                Escolha o Produto
              </h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Selecione os itens, cores e quantidades desejadas direto pelo catálogo online.
              </p>
            </div>

            <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111]">
              <div className="w-7 h-7 rounded-full bg-[#FFD100] border-2 border-black text-black font-black text-xs flex items-center justify-center mb-3 shadow-[1px_1px_0px_#111111]">
                2
              </div>
              <h4 className="font-heading text-xs font-bold text-black mb-1">
                Envie Arte ou Texto
              </h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Anexe seu logotipo em vetor ou digite as frases/nomes para gravação a laser.
              </p>
            </div>

            <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111]">
              <div className="w-7 h-7 rounded-full bg-[#FFD100] border-2 border-black text-black font-black text-xs flex items-center justify-center mb-3 shadow-[1px_1px_0px_#111111]">
                3
              </div>
              <h4 className="font-heading text-xs font-bold text-black mb-1">
                Aprovação da Prévia
              </h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Nossos designers enviam um mockup digital para você aprovar antes de iniciar a produção.
              </p>
            </div>

            <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#111111]">
              <div className="w-7 h-7 rounded-full bg-[#FFD100] border-2 border-black text-black font-black text-xs flex items-center justify-center mb-3 shadow-[1px_1px_0px_#111111]">
                4
              </div>
              <h4 className="font-heading text-xs font-bold text-black mb-1">
                Produção e Entrega
              </h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Produzimos com equipamentos industriais e despachamos com código de rastreio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. BANNER CTA B2B / GRANDES TIRAGENS (ROXO VIBRANTE) */}
      <section className="max-w-7xl mx-auto px-4 py-4 w-full mb-8">
        <div className="bg-[#4B2683] text-white p-6 sm:p-8 rounded-2xl border-2 border-black shadow-[6px_6px_0px_#111111] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2">
            <span className="bg-[#FFD100] text-black font-black text-[10px] px-2.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#111111] uppercase inline-block">
              ATACADO B2B • FATURAMENTO 28D
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-black">
              Precisa de <span className="text-[#FFD100]">Grandes Tiragens</span> ou Kits Onboarding para sua Empresa?
            </h3>
            <p className="text-xs text-purple-200 max-w-xl leading-relaxed">
              Atendemos departamentos de Marketing e RH com condições comerciais diferenciadas, faturamento empresarial e entrega fracionada.
            </p>
          </div>

          <a
            href={`https://wa.me/${whatsapp}?text=Olá,%20preciso%20de%20um%20orçamento%20B2B%20para%20grandes%20tiragens.`}
            target="_blank"
            rel="noreferrer"
            className="bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm px-6 py-3 rounded-lg border-2 border-black shadow-[3px_3px_0px_#111111] uppercase shrink-0 transition-all flex items-center gap-2"
          >
            <FiMessageSquare className="w-4 h-4" />
            <span>SOLICITAR ORÇAMENTO B2B</span>
          </a>
        </div>
      </section>

      {/* 10. FOOTER PRETO COMPLETO */}
      <footer className="bg-[#111111] text-gray-300 border-t-2 border-black mt-auto text-xs">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Sobre */}
          <div className="space-y-3">
            <div className="font-heading text-xl font-black italic tracking-tighter text-[#FFD100] drop-shadow-[2px_2px_0px_#000]">
              JESTEIN <span className="text-white text-xs font-normal">PERSONALIZADOS</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Alta performance em artigos promocionais, brindes corporativos e presentes sob demanda para empresas e eventos.
            </p>
            <div className="text-[10px] text-gray-500 font-mono">
              CNPJ: 00.000.000/0001-00 • Curitiba / PR
            </div>
          </div>

          {/* Categorias */}
          <div>
            <h4 className="font-heading text-xs font-bold text-white uppercase tracking-wider mb-3">
              Categorias
            </h4>
            <ul className="space-y-1.5 text-[11px] text-gray-400">
              <li><a href="#catalogo" className="hover:text-white">Canecas Personalizadas</a></li>
              <li><a href="#catalogo" className="hover:text-white">Camisetas & Uniformes</a></li>
              <li><a href="#catalogo" className="hover:text-white">Canetas a Laser</a></li>
              <li><a href="#catalogo" className="hover:text-white">Bolsas & Ecobags</a></li>
              <li><a href="#catalogo" className="hover:text-white">Squeezes & Garrafas</a></li>
              <li><a href="#catalogo" className="hover:text-white">Kits Boas-Vindas B2B</a></li>
            </ul>
          </div>

          {/* Atendimento */}
          <div>
            <h4 className="font-heading text-xs font-bold text-white uppercase tracking-wider mb-3">
              Atendimento
            </h4>
            <ul className="space-y-1.5 text-[11px] text-gray-400">
              <li>WhatsApp: (41) 99709-8905</li>
              <li>E-mail: contato@jestein.com.br</li>
              <li>Seg. a Sex. das 08h às 18h</li>
              <li><Link href="/admin" className="text-[#FFD100] font-bold hover:underline">Área do Lojista</Link></li>
            </ul>
          </div>

          {/* Pagamento & Envio */}
          <div>
            <h4 className="font-heading text-xs font-bold text-white uppercase tracking-wider mb-3">
              Pagamento & Envio
            </h4>
            <div className="space-y-1.5 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5 text-[#7AC943] font-bold">
                ✓ Pix com Desconto
              </div>
              <div>✓ Cartão em até 12x</div>
              <div>✓ Boleto Bancário</div>
              <div>✓ Correios SEDEX / PAC</div>
              <div>✓ Melhor Envio / Jadlog</div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 py-4 text-center text-[10px] text-gray-500">
          © 2026 JESTEIN Personalizados. Todos os direitos reservados. Plataforma Antigravity SaaS Core.
        </div>
      </footer>

      {/* GAVETA LATERAL DO CARRINHO (CART DRAWER POP-ART) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        tenant={tenant}
      />
    </div>
  );
}
