"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi, ProductItem, CategoryItem } from "@/lib/api";
import {
  FiBox,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiSearch,
  FiCopy,
  FiExternalLink,
  FiCheck,
  FiX,
  FiZap,
} from "react-icons/fi";

type FilterTab = "ALL" | "ACTIVE" | "DRAFT" | "LOW_STOCK";

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");

  // Estado de Edição Rápida Inline (Quick Edit)
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [qePrice, setQePrice] = useState("");
  const [qeStock, setQeStock] = useState(0);
  const [qeCategoryId, setQeCategoryId] = useState("");
  const [qeStatus, setQeStatus] = useState<"ACTIVE" | "DRAFT">("ACTIVE");
  const [savingQuick, setSavingQuick] = useState(false);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetchApi("/products/admin"),
        fetchApi("/categories/admin"),
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  const counts = useMemo(() => {
    const active = products.filter((p) => (p.status || "ACTIVE") === "ACTIVE" && p.is_active !== false).length;
    const draft = products.filter((p) => p.status === "DRAFT" || p.is_active === false).length;
    const lowStock = products.filter(
      (p) => p.track_inventory && (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5)
    ).length;
    return { all: products.length, active, draft, lowStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const isDraft = p.status === "DRAFT" || p.is_active === false;
      if (activeTab === "ACTIVE" && isDraft) return false;
      if (activeTab === "DRAFT" && !isDraft) return false;
      if (
        activeTab === "LOW_STOCK" &&
        !(p.track_inventory && (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5))
      ) {
        return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = (p.sku || "").toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [products, activeTab, search]);

  const startQuickEdit = (p: ProductItem) => {
    setQuickEditId(p.id);
    setQePrice(String(p.base_price ?? "0.00"));
    setQeStock(p.stock_quantity ?? 0);
    setQeCategoryId(p.category_id || "");
    setQeStatus(p.status === "DRAFT" || p.is_active === false ? "DRAFT" : "ACTIVE");
  };

  const saveQuickEdit = async (productId: string) => {
    setSavingQuick(true);
    try {
      const res = await fetchApi(`/products/${productId}/quick`, {
        method: "PATCH",
        body: JSON.stringify({
          base_price: parseFloat(qePrice) || 0,
          stock_quantity: Number(qeStock) || 0,
          category_id: qeCategoryId || null,
          status: qeStatus,
          is_active: qeStatus === "ACTIVE",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar edição rápida.");
      }
      const updated: ProductItem = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      setQuickEditId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingQuick(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetchApi(`/products/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const cloned: ProductItem = await res.json();
        setProducts((prev) => [cloned, ...prev]);
      }
    } catch (e) {
      alert("Erro ao duplicar produto.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o produto "${name}"?`)) return;
    try {
      const res = await fetchApi(`/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (e) {
      alert("Erro ao excluir produto.");
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando catálogo de produtos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
            <FiBox className="w-5 h-5 text-brand-primary" />
            <span>Catálogo de Produtos</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Edite preços, estoque, categorias, mídia, variações e SEO de forma rápida ou completa.
          </p>
        </div>

        <Link
          href="/admin/produtos/novo"
          className="btn-brand text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5"
        >
          <FiPlus className="w-4 h-4" />
          <span>Novo Produto</span>
        </Link>
      </div>

      {/* Barra de Filtros + Busca */}
      <div className="surface-card p-4 border border-border-theme bg-bg-surface rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "ALL" as FilterTab, label: `Todos (${counts.all})` },
            { id: "ACTIVE" as FilterTab, label: `Ativos (${counts.active})` },
            { id: "DRAFT" as FilterTab, label: `Rascunhos (${counts.draft})` },
            { id: "LOW_STOCK" as FilterTab, label: `Estoque Baixo (${counts.lowStock})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-[#084D6E] text-white"
                  : "bg-bg-subtle text-content-secondary hover:text-content-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <FiSearch className="w-4 h-4 text-content-secondary absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            className="input-theme w-full pl-9 text-xs"
          />
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="surface-card border border-border-theme bg-bg-surface rounded-xl overflow-hidden shadow-sm">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-bg-subtle text-content-secondary flex items-center justify-center mx-auto mb-3">
              <FiBox className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-content-primary mb-1">
              Nenhum produto encontrado
            </p>
            <p className="text-xs text-content-secondary mb-4">
              {products.length === 0
                ? "Adicione seu primeiro item para começar a vender na vitrine."
                : "Ajuste os filtros ou termo de busca."}
            </p>
            {products.length === 0 && (
              <Link href="/admin/produtos/novo" className="btn-brand text-xs py-2 px-4 rounded-lg inline-flex items-center gap-1.5">
                <FiPlus className="w-3.5 h-3.5" />
                <span>Cadastrar Primeiro Produto</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-bg-subtle text-content-secondary border-b border-border-theme uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4 text-left">Produto</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Categoria</th>
                  <th className="py-3 px-4 text-left">Preço</th>
                  <th className="py-3 px-4 text-left">Estoque</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {filteredProducts.map((p) => {
                  const isEditing = quickEditId === p.id;
                  const isDraft = p.status === "DRAFT" || p.is_active === false;
                  const isLowStock =
                    p.track_inventory && (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5);

                  return (
                    <tr key={p.id} className="hover:bg-bg-subtle/40 transition-colors">
                      {/* Produto */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-bg-subtle border border-border-theme overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <FiBox className="w-4 h-4 text-content-secondary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/produtos/${p.id}/editar`}
                              className="font-semibold text-content-primary hover:text-brand-primary block truncate max-w-[260px]"
                            >
                              {p.name}
                            </Link>
                            <span className="text-[10px] font-mono text-content-secondary">
                              SKU: {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <select
                            value={qeStatus}
                            onChange={(e) => setQeStatus(e.target.value as "ACTIVE" | "DRAFT")}
                            className="input-theme py-1 px-2 text-[11px]"
                          >
                            <option value="ACTIVE">Ativo</option>
                            <option value="DRAFT">Rascunho</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isDraft
                                ? "bg-bg-subtle text-content-secondary border-border-theme"
                                : "bg-emerald-500/10 text-status-success border-status-success/30"
                            }`}
                          >
                            {isDraft ? "Rascunho" : "Ativo"}
                          </span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <select
                            value={qeCategoryId}
                            onChange={(e) => setQeCategoryId(e.target.value)}
                            className="input-theme py-1 px-2 text-[11px] max-w-[160px]"
                          >
                            <option value="">Sem categoria</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-content-secondary">
                            {p.category_id ? categoryMap[p.category_id] || "—" : "Sem categoria"}
                          </span>
                        )}
                      </td>

                      {/* Preço */}
                      <td className="py-3.5 px-4 font-semibold text-content-primary">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={qePrice}
                            onChange={(e) => setQePrice(e.target.value)}
                            className="input-theme py-1 px-2 w-24 text-[11px]"
                          />
                        ) : (
                          <span>R$ {Number(p.base_price).toFixed(2).replace(".", ",")}</span>
                        )}
                      </td>

                      {/* Estoque */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          p.track_inventory ? (
                            <input
                              type="number"
                              min="0"
                              value={qeStock}
                              onChange={(e) => setQeStock(Number(e.target.value))}
                              className="input-theme py-1 px-2 w-20 text-[11px]"
                            />
                          ) : (
                            <span className="text-[11px] text-content-secondary">Sob encomenda</span>
                          )
                        ) : p.track_inventory ? (
                          <span
                            className={`text-[11px] font-semibold ${
                              isLowStock ? "text-status-error" : "text-content-primary"
                            }`}
                          >
                            {p.stock_quantity ?? 0} un.{isLowStock ? " (Baixo)" : ""}
                          </span>
                        ) : (
                          <span className="text-[11px] text-content-secondary">Sob encomenda</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={savingQuick}
                              onClick={() => saveQuickEdit(p.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#084D6E] text-white text-[11px] font-semibold flex items-center gap-1"
                            >
                              <FiCheck className="w-3.5 h-3.5" />
                              <span>Salvar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickEditId(null)}
                              className="p-1.5 rounded-lg border border-border-theme text-content-secondary hover:bg-bg-subtle"
                            >
                              <FiX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startQuickEdit(p)}
                              title="Edição rápida inline"
                              className="p-1.5 rounded-lg border border-border-theme text-content-secondary hover:text-brand-primary hover:bg-bg-subtle"
                            >
                              <FiZap className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              href={`/admin/produtos/${p.id}/editar`}
                              className="px-3 py-1.5 rounded-lg bg-bg-subtle hover:bg-[#084D6E] hover:text-white text-content-primary border border-border-theme font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <FiEdit2 className="w-3 h-3" />
                              <span>Editar</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDuplicate(p.id)}
                              title="Duplicar produto"
                              className="p-1.5 rounded-lg text-content-secondary hover:text-brand-primary hover:bg-bg-subtle"
                            >
                              <FiCopy className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              href={`/produto/${p.slug}`}
                              target="_blank"
                              title="Ver na loja"
                              className="p-1.5 rounded-lg text-content-secondary hover:text-brand-primary hover:bg-bg-subtle"
                            >
                              <FiExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDelete(p.id, p.name)}
                              title="Excluir produto"
                              className="p-1.5 rounded-lg text-content-secondary hover:text-status-error hover:bg-red-500/10"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
