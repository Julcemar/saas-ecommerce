"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchApi, CategoryItem } from "@/lib/api";
import {
  FiFolder,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiArrowUp,
  FiArrowDown,
  FiUploadCloud,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiCornerDownRight,
} from "react-icons/fi";

function generateSlug(val: string) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drawer de Criação / Edição Completa
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSlugEdited, setFormSlugEdited] = useState(false);
  const [formParentId, setFormParentId] = useState<string>("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDescription, setFormSeoDescription] = useState("");
  const [showSeo, setShowSeo] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal de Exclusão com Realocação
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
  const [reallocateId, setReallocateId] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const loadCategories = async () => {
    try {
      const res = await fetchApi("/categories/admin");
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

  const rootCategories = useMemo(
    () =>
      categories
        .filter((c) => !c.parent_id)
        .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)),
    [categories]
  );

  const childrenByParent = useMemo(() => {
    const map: Record<string, CategoryItem[]> = {};
    categories
      .filter((c) => !!c.parent_id)
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))
      .forEach((c) => {
        const pid = String(c.parent_id);
        if (!map[pid]) map[pid] = [];
        map[pid].push(c);
      });
    return map;
  }, [categories]);

  const openCreateDrawer = (parentId: string = "") => {
    setEditingCat(null);
    setFormName("");
    setFormSlug("");
    setFormSlugEdited(false);
    setFormParentId(parentId);
    setFormDescription("");
    setFormImageUrl("");
    setFormIsActive(true);
    setFormSeoTitle("");
    setFormSeoDescription("");
    setShowSeo(false);
    setErrorMsg(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (cat: CategoryItem) => {
    setEditingCat(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormSlugEdited(true);
    setFormParentId(cat.parent_id || "");
    setFormDescription(cat.description || "");
    setFormImageUrl(cat.image_url || "");
    setFormIsActive(cat.is_active);
    setFormSeoTitle(cat.seo_title || "");
    setFormSeoDescription(cat.seo_description || "");
    setShowSeo(Boolean(cat.seo_title || cat.seo_description));
    setErrorMsg(null);
    setDrawerOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchApi("/uploads?folder=categories", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Falha ao enviar imagem.");
      }
      const data = await res.json();
      setFormImageUrl(data.url);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      name: formName.trim(),
      slug: formSlug.trim() || generateSlug(formName),
      parent_id: formParentId || null,
      description: formDescription.trim() || null,
      image_url: formImageUrl.trim() || null,
      is_active: formIsActive,
      seo_title: formSeoTitle.trim() || null,
      seo_description: formSeoDescription.trim() || null,
      ...(editingCat ? {} : { display_order: categories.length + 1 }),
    };

    try {
      const res = await fetchApi(
        editingCat ? `/categories/${editingCat.id}` : "/categories",
        {
          method: editingCat ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar categoria.");
      }

      setDrawerOpen(false);
      setSuccessMsg(editingCat ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (cat: CategoryItem) => {
    try {
      const res = await fetchApi(`/categories/${cat.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, is_active: !cat.is_active } : c))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveOrder = async (list: CategoryItem[], index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    const payload = reordered.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
      parent_id: item.parent_id || null,
    }));

    // Atualização otimista
    const orderMap = new Map(payload.map((p) => [p.id, p.display_order]));
    setCategories((prev) =>
      prev.map((c) => (orderMap.has(c.id) ? { ...c, display_order: orderMap.get(c.id)! } : c))
    );

    await fetchApi("/categories/reorder", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg(null);

    try {
      const query = reallocateId ? `?reallocate_to=${reallocateId}` : "";
      const res = await fetchApi(`/categories/${deleteTarget.id}${query}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Não foi possível excluir a categoria.");
      }

      setDeleteTarget(null);
      setReallocateId("");
      setSuccessMsg("Categoria removida com sucesso.");
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando árvore de categorias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
            <FiFolder className="w-5 h-5 text-brand-primary" />
            <span>Categorias e Subcategorias</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Organize a hierarquia da loja, ordem de exibição no menu, imagens e SEO.
          </p>
        </div>

        <button
          onClick={() => openCreateDrawer("")}
          className="btn-brand text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5"
        >
          <FiPlus className="w-4 h-4" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-status-success/30 rounded-lg text-xs font-semibold text-status-success flex items-center gap-2">
          <FiCheck className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !drawerOpen && (
        <div className="p-3.5 bg-red-500/10 border border-status-error/30 rounded-lg text-xs font-semibold text-status-error flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Árvore de Categorias */}
      <div className="surface-card border border-border-theme bg-bg-surface rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border-theme bg-bg-subtle/60 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-content-secondary">
          <span>Estrutura de Categorias ({categories.length})</span>
          <span>Ordem / Visibilidade / Ações</span>
        </div>

        {rootCategories.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-content-primary mb-1">Nenhuma categoria cadastrada</p>
            <p className="text-xs text-content-secondary mb-4">
              Crie sua primeira categoria para organizar o catálogo da vitrine.
            </p>
            <button onClick={() => openCreateDrawer("")} className="btn-brand text-xs py-2 px-4 rounded-lg">
              Criar Primeira Categoria
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-theme">
            {rootCategories.map((cat, idx) => {
              const subs = childrenByParent[cat.id] || [];
              return (
                <div key={cat.id} className="bg-bg-surface">
                  {/* Categoria Principal */}
                  <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-bg-subtle/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveOrder(rootCategories, idx, -1)}
                          className="p-0.5 text-content-secondary hover:text-brand-primary disabled:opacity-25"
                          title="Mover para cima"
                        >
                          <FiArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === rootCategories.length - 1}
                          onClick={() => handleMoveOrder(rootCategories, idx, 1)}
                          className="p-0.5 text-content-secondary hover:text-brand-primary disabled:opacity-25"
                          title="Mover para baixo"
                        >
                          <FiArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-10 h-10 rounded-lg bg-bg-subtle border border-border-theme overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiFolder className="w-4 h-4 text-content-secondary" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-content-primary truncate">{cat.name}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg-subtle border border-border-theme text-content-secondary">
                            {cat.products_count || 0} produto(s)
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-content-secondary">/{cat.slug}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(cat)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                          cat.is_active
                            ? "bg-emerald-500/10 text-status-success border-status-success/30"
                            : "bg-bg-subtle text-content-secondary border-border-theme"
                        }`}
                      >
                        {cat.is_active ? <FiEye className="w-3 h-3" /> : <FiEyeOff className="w-3 h-3" />}
                        <span>{cat.is_active ? "Ativa no menu" : "Oculta"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openCreateDrawer(cat.id)}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-border-theme text-brand-primary hover:bg-brand-primary/10 transition-colors flex items-center gap-1"
                      >
                        <FiPlus className="w-3 h-3" />
                        <span>Subcategoria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditDrawer(cat)}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-bg-subtle hover:bg-brand-primary hover:text-white text-content-primary border border-border-theme transition-colors flex items-center gap-1"
                      >
                        <FiEdit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(cat);
                          setReallocateId("");
                          setErrorMsg(null);
                        }}
                        className="p-1.5 rounded-lg text-content-secondary hover:text-status-error hover:bg-red-500/10 transition-colors"
                        title="Excluir categoria"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategorias Indentadas */}
                  {subs.length > 0 && (
                    <div className="bg-bg-subtle/25 border-t border-border-theme/70 divide-y divide-border-theme/50">
                      {subs.map((sub, sIdx) => (
                        <div
                          key={sub.id}
                          className="pl-12 pr-5 py-2.5 flex flex-wrap items-center justify-between gap-3 hover:bg-bg-subtle/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FiCornerDownRight className="w-4 h-4 text-content-secondary flex-shrink-0" />
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={sIdx === 0}
                                onClick={() => handleMoveOrder(subs, sIdx, -1)}
                                className="p-0.5 text-content-secondary hover:text-brand-primary disabled:opacity-25"
                              >
                                <FiArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={sIdx === subs.length - 1}
                                onClick={() => handleMoveOrder(subs, sIdx, 1)}
                                className="p-0.5 text-content-secondary hover:text-brand-primary disabled:opacity-25"
                              >
                                <FiArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="w-8 h-8 rounded bg-bg-surface border border-border-theme overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {sub.image_url ? (
                                <img src={sub.image_url} alt={sub.name} className="w-full h-full object-cover" />
                              ) : (
                                <FiFolder className="w-3.5 h-3.5 text-content-secondary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-content-primary">{sub.name}</span>
                                <span className="text-[10px] text-content-secondary">
                                  ({sub.products_count || 0} prod.)
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-content-secondary">/{sub.slug}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(sub)}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                sub.is_active
                                  ? "bg-emerald-500/10 text-status-success border-status-success/30"
                                  : "bg-bg-subtle text-content-secondary border-border-theme"
                              }`}
                            >
                              {sub.is_active ? "Ativa" : "Oculta"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditDrawer(sub)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-bg-surface hover:bg-brand-primary hover:text-white text-content-primary border border-border-theme transition-colors flex items-center gap-1"
                            >
                              <FiEdit2 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(sub);
                                setReallocateId("");
                                setErrorMsg(null);
                              }}
                              className="p-1.5 rounded-lg text-content-secondary hover:text-status-error hover:bg-red-500/10"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer Lateral de Criação / Edição Completa */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-bg-surface h-full overflow-y-auto shadow-2xl border-l border-border-theme flex flex-col">
            <div className="px-6 py-4 border-b border-border-theme flex items-center justify-between sticky top-0 bg-bg-surface z-10">
              <div>
                <h2 className="font-heading text-base font-bold text-content-primary">
                  {editingCat ? `Editar: ${editingCat.name}` : formParentId ? "Nova Subcategoria" : "Nova Categoria"}
                </h2>
                <p className="text-[11px] text-content-secondary">
                  Todos os campos são isolados exclusivamente para esta loja.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-content-secondary hover:bg-bg-subtle"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-5 flex-1 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-status-error/30 rounded-lg text-status-error font-semibold flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-content-primary mb-1.5">Nome *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormName(val);
                    if (!formSlugEdited) setFormSlug(generateSlug(val));
                  }}
                  placeholder="Ex: Canecas Térmicas"
                  className="input-theme w-full"
                />
              </div>

              <div>
                <label className="block font-semibold text-content-primary mb-1.5">Slug URL *</label>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => {
                    setFormSlug(e.target.value);
                    setFormSlugEdited(true);
                  }}
                  placeholder="canecas-termicas"
                  className="input-theme w-full font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-content-primary mb-1.5">
                  Categoria Pai (opcional — deixe vazio para categoria principal)
                </label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className="input-theme w-full"
                >
                  <option value="">— Categoria Principal (Raiz) —</option>
                  {rootCategories
                    .filter((c) => c.id !== editingCat?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-content-primary mb-1.5">Descrição</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição opcional da categoria..."
                  className="input-theme w-full resize-none"
                />
              </div>

              {/* Imagem da Categoria */}
              <div>
                <label className="block font-semibold text-content-primary mb-1.5">Imagem da Categoria</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-bg-subtle border border-border-theme overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {formImageUrl ? (
                      <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <FiFolder className="w-6 h-6 text-content-secondary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="btn-outline text-[11px] py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5">
                        <FiUploadCloud className="w-3.5 h-3.5" />
                        <span>{uploadingImg ? "Enviando..." : "Enviar Foto"}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      {formImageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormImageUrl("")}
                          className="text-[11px] text-status-error hover:underline font-medium"
                        >
                          Remover imagem
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="Ou cole a URL da imagem..."
                      className="input-theme w-full text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Visibilidade */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-bg-subtle/60 border border-border-theme">
                <div>
                  <span className="font-semibold text-content-primary block">Visível no menu da loja</span>
                  <span className="text-[11px] text-content-secondary">
                    Controla se esta categoria aparece nas vitrines e navegação.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#084D6E] cursor-pointer"
                />
              </div>

              {/* Bloco SEO Recolhível */}
              <div className="border border-border-theme rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSeo(!showSeo)}
                  className="w-full px-4 py-3 bg-bg-subtle/50 flex items-center justify-between font-semibold text-content-primary"
                >
                  <span>Otimização para Buscadores (SEO)</span>
                  {showSeo ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                </button>
                {showSeo && (
                  <div className="p-4 space-y-3 bg-bg-surface">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="font-semibold text-content-primary">Título SEO</label>
                        <span className="text-[10px] text-content-secondary">{formSeoTitle.length}/70</span>
                      </div>
                      <input
                        type="text"
                        maxLength={70}
                        value={formSeoTitle}
                        onChange={(e) => setFormSeoTitle(e.target.value)}
                        placeholder={formName || "Título da categoria no Google"}
                        className="input-theme w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="font-semibold text-content-primary">Meta Descrição</label>
                        <span className="text-[10px] text-content-secondary">{formSeoDescription.length}/160</span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={160}
                        value={formSeoDescription}
                        onChange={(e) => setFormSeoDescription(e.target.value)}
                        placeholder="Descrição resumida para resultados de busca..."
                        className="input-theme w-full resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border-theme flex justify-end gap-2">
                <button type="button" onClick={() => setDrawerOpen(false)} className="btn-outline text-xs py-2 px-4">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-brand text-xs py-2 px-5">
                  {saving ? "Salvando..." : editingCat ? "Salvar Alterações" : "Criar Categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão com Realocação */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-bg-surface border border-border-theme rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-heading text-base font-bold text-content-primary">
              Excluir "{deleteTarget.name}"?
            </h3>

            {(deleteTarget.products_count || 0) > 0 ? (
              <div className="space-y-3 text-xs">
                <p className="text-content-secondary">
                  Esta categoria possui <strong className="text-content-primary">{deleteTarget.products_count} produto(s)</strong> vinculados.
                  Escolha para qual categoria deseja realocá-los antes de excluir:
                </p>
                <select
                  value={reallocateId}
                  onChange={(e) => setReallocateId(e.target.value)}
                  className="input-theme w-full"
                >
                  <option value="">Selecione a categoria de destino...</option>
                  {categories
                    .filter((c) => c.id !== deleteTarget.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-content-secondary">
                Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
              </p>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-red-500/10 border border-status-error/30 rounded text-[11px] text-status-error font-medium">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-outline text-xs py-2 px-4"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting || ((deleteTarget.products_count || 0) > 0 && !reallocateId)}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
