"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  PRODUCTION_STAGES,
  PAYMENT_STATUS_MAP,
  getDeadlineBadge,
  isOrderArtReady,
} from "@/lib/orderHelpers";
import {
  FiShoppingCart,
  FiPlus,
  FiSearch,
  FiColumns,
  FiList,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiEdit2,
  FiZap,
} from "react-icons/fi";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const res = await fetchApi("/orders");
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // KPIs por etapa (Big Numbers)
  const kpis = useMemo(() => {
    const sumVal = (list: any[]) =>
      list.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);

    const byStage = (key: string) => orders.filter((o) => (o.production_status || "NEW") === key);
    const critical = orders.filter((o) => getDeadlineBadge(o.due_date, o.production_status).isCritical);

    return [
      { key: "NEW", label: "Novos / Entrada", list: byStage("NEW"), total: sumVal(byStage("NEW")) },
      { key: "ART_APPROVAL", label: "Arte & Aprovação", list: byStage("ART_APPROVAL"), total: sumVal(byStage("ART_APPROVAL")) },
      { key: "IN_PRODUCTION", label: "Em Produção", list: byStage("IN_PRODUCTION"), total: sumVal(byStage("IN_PRODUCTION")) },
      { key: "READY_TO_SHIP", label: "Prontos p/ Envio", list: byStage("READY_TO_SHIP"), total: sumVal(byStage("READY_TO_SHIP")) },
      { key: "CRITICAL", label: "Prazo Crítico", list: critical, total: sumVal(critical), isAlert: critical.length > 0 },
    ];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const pStage = o.production_status || "NEW";
      if (stageFilter === "CRITICAL") {
        if (!getDeadlineBadge(o.due_date, pStage).isCritical) return false;
      } else if (stageFilter !== "ALL" && pStage !== stageFilter) {
        return false;
      }

      if (paymentFilter !== "ALL") {
        const ps = (o.payment_status || "PENDING").toUpperCase();
        if (paymentFilter === "PAID" && ps !== "PAID") return false;
        if (paymentFilter === "PENDING" && ps === "PAID") return false;
      }

      if (urgencyFilter === "URGENT" && o.priority !== "URGENT") return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const cust = String(o.customer_snapshot?.full_name || "").toLowerCase();
        const itemMatch = (o.items || []).some((it: any) =>
          String(it.name || "").toLowerCase().includes(q)
        );
        if (!String(o.order_number || "").toLowerCase().includes(q) && !cust.includes(q) && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [orders, stageFilter, paymentFilter, urgencyFilter, search]);

  const handleStageMove = async (orderId: string, newStage: string) => {
    const existing = orders.find((o) => o.id === orderId);
    if (!existing || existing.production_status === newStage) return;

    // Atualização otimista
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, production_status: newStage } : o))
    );

    try {
      const res = await fetchApi(`/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ production_status: newStage }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (e) {
      loadOrders();
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-10 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando linha de produção...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
            <FiShoppingCart className="w-5 h-5 text-brand-primary" />
            <span>Pedidos e Linha de Produção</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Gerencie pedidos personalizados do recebimento à expedição com rastreio e controle de artes.
          </p>
        </div>

        <Link
          href="/admin/pedidos/novo"
          className="btn-brand text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5"
        >
          <FiPlus className="w-4 h-4" />
          <span>Novo Pedido</span>
        </Link>
      </div>

      {/* 1. Barra de Big Numbers (KPIs Clicáveis) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi) => {
          const isActive = stageFilter === kpi.key;
          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => setStageFilter(isActive ? "ALL" : kpi.key)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? "border-[#084D6E] bg-[#084D6E]/10 ring-2 ring-[#084D6E]/20"
                  : kpi.isAlert
                  ? "border-red-500/40 bg-red-500/5 hover:border-red-500/60"
                  : "border-border-theme bg-bg-surface hover:border-brand-primary/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-content-secondary">{kpi.label}</span>
                {kpi.isAlert && <FiAlertTriangle className="w-3.5 h-3.5 text-status-error" />}
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading text-2xl font-bold text-content-primary">
                  {kpi.list.length}
                </span>
                <span className="text-[11px] font-medium text-content-secondary">
                  R$ {kpi.total.toFixed(0)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Barra de Toggle Kanban/Lista + Filtros */}
      <div className="surface-card p-3.5 border border-border-theme bg-bg-surface rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Kanban / Lista */}
          <div className="inline-flex rounded-lg bg-bg-subtle p-1 border border-border-theme text-xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "kanban"
                  ? "bg-[#084D6E] text-white shadow-xs"
                  : "text-content-secondary hover:text-content-primary"
              }`}
            >
              <FiColumns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-[#084D6E] text-white shadow-xs"
                  : "text-content-secondary hover:text-content-primary"
              }`}
            >
              <FiList className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="input-theme py-1.5 text-xs"
          >
            <option value="ALL">Pagamento: Todos</option>
            <option value="PAID">Somente Pagos</option>
            <option value="PENDING">Aguardando Pgto</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="input-theme py-1.5 text-xs"
          >
            <option value="ALL">Prioridade: Todas</option>
            <option value="URGENT">Somente Urgentes</option>
          </select>

          {stageFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setStageFilter("ALL")}
              className="text-[11px] font-semibold text-brand-primary hover:underline px-2"
            >
              Limpar filtro ({stageFilter})
            </button>
          )}
        </div>

        <div className="relative w-full lg:w-72">
          <FiSearch className="w-4 h-4 text-content-secondary absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar #pedido, cliente ou produto..."
            className="input-theme w-full pl-9 text-xs"
          />
        </div>
      </div>

      {/* 3A. Visão Kanban (Drag-and-Drop) */}
      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PRODUCTION_STAGES.map((stage) => {
            const colOrders = filteredOrders.filter(
              (o) => (o.production_status || "NEW") === stage.key
            );
            return (
              <div
                key={stage.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedOrderId) {
                    handleStageMove(draggedOrderId, stage.key);
                    setDraggedOrderId(null);
                  }
                }}
                className="w-72 flex-shrink-0 flex flex-col rounded-xl bg-bg-subtle/60 border border-border-theme"
              >
                <div className="px-3.5 py-3 border-b border-border-theme flex items-center justify-between">
                  <span className="font-heading text-xs font-bold text-content-primary">
                    {stage.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-bg-surface border border-border-theme text-[10px] font-bold text-content-secondary">
                    {colOrders.length}
                  </span>
                </div>

                <div className="p-2.5 space-y-2.5 min-h-[340px]">
                  {colOrders.map((o) => {
                    const payInfo =
                      PAYMENT_STATUS_MAP[o.payment_status] || PAYMENT_STATUS_MAP.PENDING;
                    const deadline = getDeadlineBadge(o.due_date, o.production_status);
                    const artOk = isOrderArtReady(o);
                    const itemsSummary = (o.items || [])
                      .map((it: any) => `${it.quantity}x ${it.name}`)
                      .join(" + ");

                    return (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={() => setDraggedOrderId(o.id)}
                        onClick={() => router.push(`/admin/pedidos/${o.id}`)}
                        className="p-3.5 rounded-lg bg-bg-surface border border-border-theme hover:border-[#084D6E] shadow-xs cursor-pointer transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading text-xs font-bold text-content-primary">
                            {o.order_number}
                          </span>
                          <div className="flex items-center gap-1">
                            {o.priority === "URGENT" && (
                              <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold flex items-center gap-0.5">
                                <FiZap className="w-2.5 h-2.5" />
                                URGENTE
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${payInfo.cls}`}>
                              {payInfo.label}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-content-primary truncate">
                            {o.customer_snapshot?.full_name || "Cliente"}
                          </p>
                          <p className="text-[11px] text-content-secondary line-clamp-2 mt-0.5">
                            {itemsSummary || "Sem itens"}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-theme/70 text-[10px]">
                          <span
                            className={`font-semibold flex items-center gap-1 ${
                              artOk ? "text-status-success" : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {artOk ? <FiCheckCircle className="w-3 h-3" /> : <FiClock className="w-3 h-3" />}
                            <span>{artOk ? "Arte OK" : "Arte Pendente"}</span>
                          </span>

                          <span className={`px-2 py-0.5 rounded font-semibold ${deadline.cls}`}>
                            {deadline.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 3B. Visão Lista (Tabela) */
        <div className="surface-card border border-border-theme bg-bg-surface rounded-xl overflow-hidden shadow-sm">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-xs text-content-secondary">
              Nenhum pedido encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-bg-subtle text-content-secondary border-b border-border-theme uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-4 text-left">Pedido</th>
                    <th className="py-3 px-4 text-left">Cliente</th>
                    <th className="py-3 px-4 text-left">Itens Personalizados</th>
                    <th className="py-3 px-4 text-left">Pagamento</th>
                    <th className="py-3 px-4 text-left">Etapa de Produção</th>
                    <th className="py-3 px-4 text-left">Prazo</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-theme">
                  {filteredOrders.map((o) => {
                    const payInfo =
                      PAYMENT_STATUS_MAP[o.payment_status] || PAYMENT_STATUS_MAP.PENDING;
                    const deadline = getDeadlineBadge(o.due_date, o.production_status);
                    return (
                      <tr key={o.id} className="hover:bg-bg-subtle/40 transition-colors">
                        <td className="py-3.5 px-4 font-heading font-bold text-content-primary">
                          <div>{o.order_number}</div>
                          <div className="text-[10px] font-normal text-content-secondary">
                            R$ {Number(o.total_amount).toFixed(2).replace(".", ",")}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-content-primary">
                            {o.customer_snapshot?.full_name || "Cliente"}
                          </div>
                          <div className="text-[10px] text-content-secondary">
                            {o.customer_snapshot?.phone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          {(o.items || []).map((it: any, idx: number) => (
                            <div key={idx} className="truncate text-content-primary">
                              <span className="font-semibold">{it.quantity}x</span> {it.name}
                              {it.custom_text && (
                                <span className="text-content-secondary"> — "{it.custom_text}"</span>
                              )}
                            </div>
                          ))}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${payInfo.cls}`}>
                            {payInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={o.production_status || "NEW"}
                            onChange={(e) => handleStageMove(o.id, e.target.value)}
                            className="input-theme py-1 px-2 text-[11px]"
                          >
                            {PRODUCTION_STAGES.map((st) => (
                              <option key={st.key} value={st.key}>
                                {st.fullLabel}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${deadline.cls}`}>
                            {deadline.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/admin/pedidos/${o.id}`}
                            className="px-3 py-1.5 rounded-lg bg-bg-subtle hover:bg-[#084D6E] hover:text-white text-content-primary border border-border-theme font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <FiEdit2 className="w-3 h-3" />
                            <span>Abrir</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
