"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { FiFolder, FiPlus, FiTrash2, FiAlertCircle } from "react-icons/fi";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      const res = await fetchApi("/categories");
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    const gen = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(gen);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await fetchApi("/categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug,
          description: description || null,
          display_order: categories.length + 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao criar categoria.");
      }

      setName("");
      setSlug("");
      setDescription("");
      await loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Deseja realmente remover a categoria "${catName}"?`)) return;

    try {
      const res = await fetchApi(`/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories(categories.filter((c) => c.id !== id));
      }
    } catch (e) {
      alert("Erro ao excluir categoria.");
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando categorias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
          <FiFolder className="w-5 h-5 text-brand-primary" />
          <span>Categorias do Catálogo</span>
        </h1>
        <p className="text-xs text-content-secondary mt-1">
          Organize seus produtos por segmentos (Canecas, Camisetas, Brindes Ecológicos, etc.)
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-status-error/30 rounded-lg text-xs font-semibold text-status-error flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulário de Criação Rápida */}
      <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl">
        <h3 className="font-heading text-sm font-bold text-content-primary mb-3.5 flex items-center gap-1.5">
          <FiPlus className="w-4 h-4 text-brand-primary" />
          <span>Nova Categoria</span>
        </h3>
        <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div>
            <label className="block font-semibold text-content-primary mb-1">Nome da Categoria *</label>
            <input
              type="text"
              required
              placeholder="Ex: Brindes Ecológicos"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="input-theme w-full"
            />
          </div>
          <div>
            <label className="block font-semibold text-content-primary mb-1">Slug URL *</label>
            <input
              type="text"
              required
              placeholder="brindes-ecologicos"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input-theme w-full font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-content-primary mb-1">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Itens sustentáveis"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-theme w-full"
            />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="btn-brand text-xs py-2 px-5 rounded-lg flex items-center gap-1.5"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>{creating ? "Adicionando..." : "Cadastrar Categoria"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Listagem */}
      <div className="surface-card border border-border-theme bg-bg-surface rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg-subtle text-content-secondary border-b border-border-theme uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4 text-left">Nome</th>
                <th className="py-3 px-4 text-left">Slug</th>
                <th className="py-3 px-4 text-left">Produtos Vinculados</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-theme">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-content-secondary">
                    Nenhuma categoria cadastrada ainda.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-subtle/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-content-primary">{c.name}</td>
                    <td className="py-3.5 px-4 font-mono text-content-secondary">/{c.slug}</td>
                    <td className="py-3.5 px-4">
                      <span className="badge-theme badge-brand text-[10px]">
                        {c.products_count || 0} produtos
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-md text-status-error hover:bg-red-500/10 transition-colors"
                        title="Excluir Categoria"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
