"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  PRODUCTION_STAGES,
  PAYMENT_STATUS_MAP,
  getDeadlineBadge,
} from "@/lib/orderHelpers";
import {
  FiArrowLeft,
  FiPrinter,
  FiSave,
  FiDownload,
  FiUploadCloud,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiUser,
  FiMapPin,
  FiSend,
  FiAlertCircle,
  FiCheck,
  FiBox,
  FiZap,
} from "react-icons/fi";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = String(params?.id || "");

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Controles da coluna direita
  const [productionStatus, setProductionStatus] = useState("NEW");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [trackingCode, setTrackingCode] = useState("");
  const [shippingService, setShippingService] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Edição de itens (personalização e artes)
  const [itemEdits, setItemEdits] = useState<Record<string, any>>({});
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  // Nota rápida de histórico
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const loadOrder = async () => {
    try {
      const res = await fetchApi(`/orders/${orderId}`);
      if (!res.ok) throw new Error("Pedido não encontrado nesta loja.");
      const data = await res.json();
      setOrder(data);
      setProductionStatus(data.production_status || "NEW");
      setPaymentStatus(data.payment_status || "PENDING");
      setDueDate(data.due_date || "");
      setPriority(data.priority || "NORMAL");
      setTrackingCode(data.shipping_tracking_code || "");
      setShippingService(data.shipping_service_name || "");
      setInternalNotes(data.internal_notes || "");

      const edits: Record<string, any> = {};
      (data.items || []).forEach((it: any) => {
        edits[it.id] = {
          custom_text: it.custom_text || "",
          customization_notes: it.customization_notes || "",
          approved_art_url: it.approved_art_url || "",
          art_approved: Boolean(it.art_approved || it.artwork_status === "approved"),
        };
      });
      setItemEdits(edits);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSaveOperational = async (overridePatch?: Record<string, any>) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = overridePatch || {
        production_status: productionStatus,
        payment_status: paymentStatus,
        due_date: dueDate || null,
        priority,
        shipping_tracking_code: trackingCode.trim() || null,
        shipping_service_name: shippingService.trim() || null,
        internal_notes: internalNotes.trim() || null,
      };
      const res = await fetchApi(`/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao atualizar pedido.");
      }
      const updated = await res.json();
      setOrder(updated);
      showToast("Pedido atualizado com sucesso!");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async (itemId: string) => {
    const edit = itemEdits[itemId];
    if (!edit) return;
    try {
      const res = await fetchApi(`/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          custom_text: edit.custom_text,
          customization_notes: edit.customization_notes,
          approved_art_url: edit.approved_art_url || null,
          art_approved: edit.art_approved,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar personalização do item.");
      const updated = await res.json();
      setOrder(updated);
      showToast("Personalização / arte salva!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUploadApprovedArt = async (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingItemId(itemId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetchApi(`/uploads?folder=orders&order_id=${orderId}`, {
        method: "POST",
        body: fd,
      });
      if (!upRes.ok) throw new Error("Erro ao enviar arte final.");
      const upData = await upRes.json();

      setItemEdits((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], approved_art_url: upData.url },
      }));

      // Persiste imediatamente no item
      const res = await fetchApi(`/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ approved_art_url: upData.url }),
      });
      if (res.ok) setOrder(await res.json());
      showToast("Arte final anexada com sucesso!");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleAddHistoryNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetchApi(`/orders/${orderId}/history`, {
        method: "POST",
        body: JSON.stringify({ message: noteText.trim(), event_type: "NOTE" }),
      });
      if (res.ok) {
        setNoteText("");
        await loadOrder();
      }
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-10 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando ficha do pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme space-y-3">
        <p className="text-sm font-semibold text-status-error">{errorMsg || "Pedido não encontrado."}</p>
        <Link href="/admin/pedidos" className="btn-outline text-xs py-2 px-4 inline-block">
          Voltar para Pedidos
        </Link>
      </div>
    );
  }

  const deadline = getDeadlineBadge(order.due_date, order.production_status);
  const payBadge = PAYMENT_STATUS_MAP[order.payment_status] || PAYMENT_STATUS_MAP.PENDING;
  const addr = order.shipping_address_snapshot || {};

  return (
    <>
      {/* =====================================================================
          VISÃO NORMAL DE ADMINISTRAÇÃO (OCULTA NA IMPRESSÃO)
          ===================================================================== */}
      <div className="max-w-6xl space-y-6 pb-16 print:hidden">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/pedidos"
              className="p-2 rounded-lg border border-border-theme bg-bg-surface hover:bg-bg-subtle text-content-primary"
            >
              <FiArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary">
                  Pedido {order.order_number}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${payBadge.cls}`}>
                  {payBadge.label}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${deadline.cls}`}>
                  {deadline.label}
                </span>
                {priority === "URGENT" && (
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold flex items-center gap-1">
                    <FiZap className="w-3 h-3" />
                    URGENTE
                  </span>
                )}
              </div>
              <p className="text-xs text-content-secondary mt-0.5">
                Recebido em {new Date(order.created_at).toLocaleString("pt-BR")} • Total: R${" "}
                {Number(order.total_amount).toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <FiPrinter className="w-4 h-4" />
              <span>Imprimir Ordem de Produção</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveOperational()}
              className="btn-brand text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <FiSave className="w-4 h-4" />
              <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-status-error/30 rounded-lg text-xs font-semibold text-status-error flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-status-success/30 rounded-lg text-xs font-semibold text-status-success flex items-center gap-2">
            <FiCheck className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Grid 2 Colunas (70% / 30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA ESQUERDA (70% -> 8 cols): Produção, Itens, Artes e Timeline */}
          <div className="lg:col-span-8 space-y-6">
            {/* Cards de Itens Personalizados */}
            <div className="space-y-4">
              {(order.items || []).map((it: any) => {
                const edit = itemEdits[it.id] || {};
                return (
                  <section
                    key={it.id}
                    className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-lg bg-bg-subtle border border-border-theme overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {it.product_image_url ? (
                            <img
                              src={it.product_image_url}
                              alt={it.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FiBox className="w-5 h-5 text-content-secondary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-heading text-sm font-bold text-content-primary">
                            {it.quantity}x {it.name}
                          </h3>
                          <div className="text-[11px] text-content-secondary flex flex-wrap gap-2 mt-0.5">
                            <span className="font-mono">SKU: {it.sku}</span>
                            {it.variant_name && <span>• Variação: {it.variant_name}</span>}
                            <span>• R$ {Number(it.unit_price).toFixed(2).replace(".", ",")} / un.</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          edit.art_approved
                            ? "bg-emerald-500/10 text-status-success border-status-success/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {edit.art_approved ? <FiCheckCircle className="w-3 h-3" /> : <FiClock className="w-3 h-3" />}
                        <span>{edit.art_approved ? "Arte Aprovada" : "Arte Pendente"}</span>
                      </span>
                    </div>

                    {/* Bloco Destacado de Personalização (Editável) */}
                    <div className="p-4 rounded-xl bg-[#084D6E]/5 border border-[#084D6E]/20 space-y-3">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#084D6E] dark:text-sky-300 block">
                        Instruções de Personalização (Editável)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-content-primary mb-1">
                            Texto / Nome / Frase
                          </label>
                          <input
                            type="text"
                            value={edit.custom_text || ""}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], custom_text: e.target.value },
                              }))
                            }
                            placeholder="Sem texto personalizado"
                            className="input-theme w-full"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-content-primary mb-1">
                            Observações de Produção
                          </label>
                          <input
                            type="text"
                            value={edit.customization_notes || ""}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], customization_notes: e.target.value },
                              }))
                            }
                            placeholder="Cor da gravação, posição, embalagem..."
                            className="input-theme w-full"
                          />
                        </div>
                      </div>

                      {Array.isArray(it.customization_answers) && it.customization_answers.length > 0 && (
                        <div className="pt-2 border-t border-[#084D6E]/15 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-content-secondary block">
                            Respostas do Cliente na Vitrine:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {it.customization_answers.map((ans: any, aIdx: number) => (
                              <div
                                key={aIdx}
                                className="p-2 rounded bg-bg-surface border border-border-theme text-[11px]"
                              >
                                <span className="font-semibold text-content-secondary block">
                                  {ans.label}:
                                </span>
                                {ans.field_type === "FILE_UPLOAD" ? (
                                  <a
                                    href={ans.value}
                                    target="_blank"
                                    className="text-brand-primary underline font-semibold"
                                  >
                                    Abrir arquivo enviado
                                  </a>
                                ) : (
                                  <span className="font-semibold text-content-primary">{ans.value}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gestão de Arquivos de Arte */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="p-3 rounded-lg bg-bg-subtle/50 border border-border-theme space-y-2">
                        <span className="font-semibold text-content-primary block">
                          Arquivo Enviado pelo Cliente
                        </span>
                        {it.artwork_url ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] truncate text-content-secondary">
                              {it.artwork_filename || "arte-cliente"}
                            </span>
                            <a
                              href={it.artwork_url}
                              target="_blank"
                              download
                              className="btn-outline text-[11px] py-1 px-2.5 flex items-center gap-1"
                            >
                              <FiDownload className="w-3 h-3" />
                              <span>Baixar</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-content-secondary">
                            Nenhum arquivo enviado pelo cliente.
                          </span>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-bg-subtle/50 border border-border-theme space-y-2">
                        <span className="font-semibold text-content-primary block">
                          Arte Final / Mockup da Loja
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="btn-outline text-[11px] py-1 px-2.5 cursor-pointer inline-flex items-center gap-1">
                            <FiUploadCloud className="w-3.5 h-3.5" />
                            <span>
                              {uploadingItemId === it.id ? "Enviando..." : "Anexar Arte Final"}
                            </span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.svg"
                              className="hidden"
                              onChange={(e) => handleUploadApprovedArt(it.id, e)}
                            />
                          </label>
                          {edit.approved_art_url && (
                            <a
                              href={edit.approved_art_url}
                              target="_blank"
                              className="text-[11px] font-semibold text-brand-primary hover:underline"
                            >
                              Visualizar Arte
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-theme">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(edit.art_approved)}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [it.id]: { ...prev[it.id], art_approved: e.target.checked },
                            }))
                          }
                          className="w-4 h-4 accent-[#084D6E]"
                        />
                        <span className="font-semibold text-content-primary">
                          Arte Aprovada para Produção
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleSaveItem(it.id)}
                        className="btn-brand text-[11px] py-1.5 px-3"
                      >
                        Salvar Item
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Timeline de Histórico */}
            <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
              <h2 className="font-heading text-sm font-bold text-content-primary">
                Histórico de Produção & Notas Internas
              </h2>

              <form onSubmit={handleAddHistoryNote} className="flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Registrar anotação interna (ex: Cliente aprovou mockup pelo WhatsApp)..."
                  className="input-theme flex-1"
                />
                <button
                  type="submit"
                  disabled={addingNote}
                  className="btn-brand text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <FiSend className="w-3.5 h-3.5" />
                  <span>Registrar</span>
                </button>
              </form>

              <div className="space-y-3 pt-2">
                {(order.history || []).length === 0 ? (
                  <p className="text-content-secondary">Nenhum evento registrado ainda.</p>
                ) : (
                  (order.history || []).map((h: any) => (
                    <div
                      key={h.id}
                      className="flex items-start gap-3 pb-3 border-b border-border-theme/60 last:border-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#084D6E] mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-content-primary font-medium">{h.message}</p>
                        <span className="text-[10px] text-content-secondary">
                          {h.actor_name} • {new Date(h.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA (30% -> 4 cols): Controle, Prazo, Cliente e Logística */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            {/* Etapa & Pagamento */}
            <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
              <h2 className="font-heading text-sm font-bold text-content-primary">
                Controle de Produção
              </h2>

              <div>
                <label className="block font-semibold text-content-primary mb-1.5">
                  Etapa Atual
                </label>
                <select
                  value={productionStatus}
                  onChange={(e) => {
                    setProductionStatus(e.target.value);
                    handleSaveOperational({ production_status: e.target.value });
                  }}
                  className="input-theme w-full font-semibold"
                >
                  {PRODUCTION_STAGES.map((st) => (
                    <option key={st.key} value={st.key}>
                      {st.fullLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-content-primary mb-1.5">
                  Status de Pagamento
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => {
                    setPaymentStatus(e.target.value);
                    handleSaveOperational({ payment_status: e.target.value });
                  }}
                  className="input-theme w-full"
                >
                  <option value="PENDING">Aguardando Pagamento</option>
                  <option value="PAID">Pago</option>
                  <option value="REFUNDED">Estornado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border-theme">
                <div>
                  <label className="block font-semibold text-content-primary mb-1">
                    Data Limite de Produção
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>

                <label className="flex items-center justify-between p-3 rounded-lg bg-bg-subtle/60 border border-border-theme cursor-pointer">
                  <span className="font-semibold text-content-primary">Pedido Urgente</span>
                  <input
                    type="checkbox"
                    checked={priority === "URGENT"}
                    onChange={(e) => setPriority(e.target.checked ? "URGENT" : "NORMAL")}
                    className="w-4 h-4 accent-red-600"
                  />
                </label>
              </div>
            </section>

            {/* Cliente & Entrega / Rastreio */}
            <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4 text-xs">
              <h2 className="font-heading text-sm font-bold text-content-primary flex items-center gap-1.5">
                <FiUser className="w-4 h-4 text-brand-primary" />
                <span>Cliente e Entrega</span>
              </h2>

              <div className="space-y-1 text-[11px]">
                <p className="font-bold text-content-primary text-xs">
                  {order.customer_snapshot?.full_name || "Cliente"}
                </p>
                {order.customer_snapshot?.phone && (
                  <p className="text-content-secondary">WhatsApp: {order.customer_snapshot.phone}</p>
                )}
                {order.customer_snapshot?.email && (
                  <p className="text-content-secondary">{order.customer_snapshot.email}</p>
                )}
                {order.customer_snapshot?.tax_id && (
                  <p className="text-content-secondary">CPF/CNPJ: {order.customer_snapshot.tax_id}</p>
                )}
              </div>

              <div className="pt-2 border-t border-border-theme space-y-1 text-[11px] text-content-secondary">
                <span className="font-semibold text-content-primary flex items-center gap-1">
                  <FiMapPin className="w-3.5 h-3.5" />
                  Endereço de Envio
                </span>
                <p>
                  {addr.street || "—"}, {addr.number || "s/n"}
                  {addr.complement ? ` - ${addr.complement}` : ""}
                </p>
                <p>
                  {addr.neighborhood || ""} • {addr.city || ""}/{addr.state || ""}
                </p>
                <p>CEP: {addr.postal_code || "—"}</p>
              </div>

              <div className="pt-2 border-t border-border-theme space-y-3">
                <div>
                  <label className="block font-semibold text-content-primary mb-1">
                    Transportadora / Serviço
                  </label>
                  <input
                    type="text"
                    value={shippingService}
                    onChange={(e) => setShippingService(e.target.value)}
                    placeholder="Ex: SEDEX, Jadlog, Retirada"
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-content-primary mb-1">
                    Código de Rastreio
                  </label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Ex: BR123456789XX"
                    className="input-theme w-full font-mono"
                  />
                </div>
                <Link
                  href="/admin/integracoes"
                  className="btn-outline w-full text-[11px] py-2 flex items-center justify-center gap-1.5"
                >
                  <FiTruck className="w-3.5 h-3.5" />
                  <span>Gerar / Consultar Melhor Envio</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* =====================================================================
          FICHA LIMPA DE IMPRESSÃO (APENAS @media print, SEM PREÇOS)
          ===================================================================== */}
      <div className="hidden print:block p-6 bg-white text-black space-y-6">
        <div className="flex justify-between items-start border-b-2 border-black pb-4">
          <div>
            <h1 className="text-2xl font-bold">ORDEM DE PRODUÇÃO {order.order_number}</h1>
            <p className="text-sm">
              Cliente: <strong>{order.customer_snapshot?.full_name}</strong> | Tel:{" "}
              {order.customer_snapshot?.phone}
            </p>
          </div>
          <div className="text-right text-sm">
            <div>
              <strong>Prazo Limite:</strong> {order.due_date || "Não definido"}
            </div>
            <div>
              <strong>Prioridade:</strong> {priority === "URGENT" ? "URGENTE" : "Normal"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {(order.items || []).map((it: any) => {
            const edit = itemEdits[it.id] || {};
            const thumb = edit.approved_art_url || it.artwork_url || it.product_image_url;
            return (
              <div key={it.id} className="border border-black rounded p-4 flex gap-4 items-start">
                {thumb && (
                  <img src={thumb} alt={it.name} className="w-24 h-24 object-contain border border-gray-300" />
                )}
                <div className="flex-1 space-y-1 text-sm">
                  <div className="text-base font-bold">
                    {it.quantity}x {it.name} {it.variant_name ? `(${it.variant_name})` : ""}
                  </div>
                  <div className="text-xs text-gray-600">SKU: {it.sku}</div>
                  {edit.custom_text && (
                    <div className="mt-2 p-2 bg-gray-100 border border-gray-300">
                      <strong>Texto para Personalizar:</strong> {edit.custom_text}
                    </div>
                  )}
                  {edit.customization_notes && (
                    <div>
                      <strong>Observações:</strong> {edit.customization_notes}
                    </div>
                  )}
                  <div>
                    <strong>Status da Arte:</strong>{" "}
                    {edit.art_approved ? "APROVADA PARA PRODUÇÃO" : "AGUARDANDO APROVAÇÃO"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {internalNotes && (
          <div className="border-t border-black pt-3 text-sm">
            <strong>Observações Gerais:</strong> {internalNotes}
          </div>
        )}
      </div>
    </>
  );
}
