"use client";

import { useState, useEffect, useMemo, MouseEvent } from "react";
import { TenantInfo, ProductItem, NavigationItem, fetchApi } from "./api";
import { BannerData } from "@/components/InteractiveHeroBanner";
import { generateThemeCssVariables } from "./themeColors";

export interface UseStorefrontStateProps {
  tenant: TenantInfo | null;
  products?: ProductItem[];
  categories?: any[];
  initialPageSize?: number;
}

export function useStorefrontState({
  tenant,
  products = [],
  categories = [],
  initialPageSize = 12,
}: UseStorefrontStateProps) {
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(initialPageSize);
  const [bannerData, setBannerData] = useState<BannerData | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const storeName = tenant?.name || "JESTEIN PERSONALIZADOS";
  const whatsapp = tenant?.settings_json?.whatsapp_phone || "5541997098905";

  // Variáveis CSS calculadas para injeção inline no container raiz (zero FOUC)
  const cssVariables = useMemo(() => generateThemeCssVariables(tenant), [tenant]);

  // Atualiza contagem do carrinho via localStorage e evento global
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

  // Carrega banner e navegação do tenant
  useEffect(() => {
    async function loadData() {
      try {
        const [bannerRes, navRes] = await Promise.all([
          fetchApi("/storefront/banner"),
          fetchApi("/storefront/navigation"),
        ]);

        if (bannerRes.ok) {
          const bData = await bannerRes.json();
          if (bData) setBannerData(bData);
        }

        if (navRes.ok) {
          const nData = await navRes.json();
          if (Array.isArray(nData) && nData.length > 0) {
            setNavigationItems(nData);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do cabeçalho/banner:", err);
      }
    }
    loadData();
  }, []);

  // Adição rápida ao carrinho
  const handleQuickAddToCart = (e: MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("saas_cart");
      const currentCart = raw ? JSON.parse(raw) : [];

      const basePrice = Number(product.base_price || product.price || 0);
      const existingIdx = currentCart.findIndex((it: any) => it.product.id === product.id);

      if (existingIdx >= 0) {
        currentCart[existingIdx].quantity += 1;
      } else {
        currentCart.push({
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            base_price: basePrice,
            image_url: product.image_url || product.img,
            enable_text_customization: Boolean(product.enable_text_customization),
            enable_artwork_upload: Boolean(product.enable_artwork_upload),
            production_lead_time_days: product.production_lead_time_days || 0,
            wholesale_tiers: product.wholesale_tiers || [],
          },
          quantity: 1,
          unit_price: basePrice,
        });
      }

      localStorage.setItem("saas_cart", JSON.stringify(currentCart));
      window.dispatchEvent(new Event("cart-updated"));
      setIsCartOpen(true);
    } catch (err) {
      console.error("Falha ao adicionar ao carrinho:", err);
    }
  };

  // Filtragem reativa de produtos por busca e categoria
  const filteredProducts = useMemo(() => {
    let list = products && products.length > 0 ? products : [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)));
    }

    if (selectedCategory) {
      list = list.filter((p: any) => {
        if (!p.category) return false;
        if (typeof p.category === "string") return p.category.toLowerCase() === selectedCategory.toLowerCase();
        if (p.category.slug) return p.category.slug.toLowerCase() === selectedCategory.toLowerCase();
        if (p.category_id && selectedCategory) return String(p.category_id) === String(selectedCategory);
        return false;
      });
    }

    return list;
  }, [products, searchQuery, selectedCategory]);

  // Produtos visíveis com base na paginação
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayedCount);
  }, [filteredProducts, displayedCount]);

  const hasMore = displayedCount < filteredProducts.length;

  const loadMore = () => {
    setDisplayedCount((prev) => prev + initialPageSize);
  };

  // Helper para formatar moeda brasileira
  const formatPrice = (price?: number | string | null) => {
    if (price === undefined || price === null || isNaN(Number(price))) return "0,00";
    return Number(price).toFixed(2).replace(".", ",");
  };

  // Helper para calcular tag de atacado
  const getWholesaleBadge = (product: any): string | null => {
    if (product.wholesale_tiers && product.wholesale_tiers.length > 0) {
      const sortedTiers = [...product.wholesale_tiers].sort((a, b) => Number(a.unit_price) - Number(b.unit_price));
      const bestTier = sortedTiers[0];
      return `${bestTier.min_quantity}+ un: R$ ${formatPrice(bestTier.unit_price)}/un`;
    }
    if (product.wholesalePrice) {
      return `Atacado: R$ ${product.wholesalePrice}/un`;
    }
    return null;
  };

  return {
    tenant,
    products,
    categories,
    storeName,
    whatsapp,
    cssVariables,
    // Busca & Categorias
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    // Paginação
    displayedCount,
    hasMore,
    loadMore,
    totalCount: filteredProducts.length,
    visibleProducts,
    filteredProducts,
    // Carrinho
    cartCount,
    isCartOpen,
    setIsCartOpen,
    handleQuickAddToCart,
    // Banner & Navegação
    bannerData,
    navigationItems,
    activeDropdown,
    setActiveDropdown,
    // Helpers
    formatPrice,
    getWholesaleBadge,
  };
}
