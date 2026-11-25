"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi, ProductItem } from "@/lib/api";
import { FiBox, FiPlus, FiTrash2, FiEdit2, FiTag } from "react-icons/fi";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    try {
      const res = await fetchApi("/products");
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o produto "${name}"?`)) return;

    try {
      const res = await fetchApi(`/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts(products.filter((p) => p.id !== id));
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
            <FiBox className="w-5 h-5 text-brand-primary" />
            <span>Catálogo de Produtos</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Gerencie itens, fotos, regras de gravação/arte e faixas de preço de atacado.
          </p>
        </div>

        <Link
          href="/admin/produtos/novo"
          className="btn-brand text-xs py-2 px-4 rounded-lg flex items-center gap-1.5"
        >
          <FiPlus className="w-3.5 h-3.5" />
          <span>Cadastrar Novo Produto</span>
        </Link>
      </div>

      <div className="surface-card border border-border-theme bg-bg-surface rounded-xl overflow-hidden shadow-sm">
        {products.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-bg-subtle text-content-secondary flex items-center justify-center mx-auto mb-3">
              <FiBox className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-content-primary mb-1">Nenhum produto cadastrado ainda</p>
            <p className="text-xs text-content-secondary mb-4">Adicione seus itens para começar a vender na vitrine.</p>
            <Link href="/admin/produtos/novo" className="btn-brand text-xs py-2 px-4 rounded-lg inline-flex items-center gap-1.5">
              <FiPlus className="w-3.5 h-3.5" />
              <span>Cadastrar Primeiro Produto</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-bg-subtle text-content-secondary border-b border-border-theme uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4 text-left">Produto</th>
                  <th className="py-3 px-4 text-left">SKU</th>
                  <th className="py-3 px-4 text-left">Preço Base</th>
                  <th className="py-3 px-4 text-left">Faixas de Atacado</th>
                  <th className="py-3 px-4 text-left">Personalização</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-bg-subtle/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-bg-subtle border border-border-theme overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiBox className="w-4 h-4 text-content-secondary" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-content-primary block">{p.name}</span>
                          {p.badge_label && (
                            <span className="badge-theme badge-brand text-[9px] mt-0.5">
                              {p.badge_label}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-content-secondary">{p.sku}</td>
                    <td className="py-3.5 px-4 font-semibold text-content-primary">
                      R$ {Number(p.base_price).toFixed(2).replace(".", ",")}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.wholesale_tiers && p.wholesale_tiers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.wholesale_tiers.map((t, i) => (
                            <span key={i} className="bg-bg-subtle border border-border-theme px-2 py-0.5 rounded text-[10px] font-medium text-content-primary">
                              {t.min_quantity}+ un: R$ {Number(t.unit_price).toFixed(2).replace(".", ",")}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-content-secondary">Preço único</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 text-[10px]">
                        {p.enable_text_customization && (
                          <span className="bg-sky-500/10 text-brand-accent border border-brand-accent/20 px-2 py-0.5 rounded font-medium block">
                            ✍️ Gravação Laser ({p.text_max_length} car.)
                          </span>
                        )}
                        {p.enable_artwork_upload && (
                          <span className="bg-emerald-500/10 text-status-success border border-status-success/20 px-2 py-0.5 rounded font-medium block">
                            🎨 Envio de Logo / Vetor
                          </span>
                        )}
                        {!p.enable_text_customization && !p.enable_artwork_upload && (
                          <span className="text-content-secondary">Sem personalização</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-md text-status-error hover:bg-red-500/10 transition-colors"
                        title="Excluir Produto"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
