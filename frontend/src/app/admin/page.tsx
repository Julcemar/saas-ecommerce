"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { PRODUCTION_STAGES, PAYMENT_STATUS_MAP } from "@/lib/orderHelpers";
import {
  FiDollarSign,
  FiShoppingBag,
  FiTrendingUp,
  FiLayers,
  FiPlus,
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiClock,
  FiImage,
} from "react-icons/fi";

type PeriodKey = "today" | "7d" | "30d" | "month";

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      try {
        const res = await fetchApi(`/admin/metrics?period=${period}`);
        if (res.ok) setMetrics(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [period]);

  const revenue = metrics?.approved_revenue || 0;
  const growth = metrics?.revenue_growth_pct || 0;
  const paidCount = metrics?.paid_orders_count || 0;
  const avgTicket = metrics?.average_ticket || 0;
  const inProduction = metrics?.in_production_now || 0;
  const alerts = metrics?.alerts || {};
  const series: any[] = metrics?.sales_series || [];
  const topProducts: any[] = metrics?.top_products || [];
  const recentOrders: any[] = metrics?.recent_orders || [];

  const hasAlerts =
    (alerts.pending_art_orders || 0) > 0 ||
    (alerts.critical_deadline_orders || 0) > 0 ||
    (alerts.low_stock_products || 0) > 0;

  const maxRev = Math.max(...series.map((d) => d.revenue || 0), 1);

  return (
    <div className="space-y-6">
      {/* Cabeçalho + Seletor de Período */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary">
            Dashboard Executivo
          </h1>
          <p className="text-xs text-content-secondary mt-0.5">
            Visão rápida de vendas, produção personalizada e pendências da loja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-bg-surface border border-border-theme p-1 text-xs">
            {[
              { id: "today" as PeriodKey, label: "Hoje" },
              { id: "7d" as PeriodKey, label: "7 dias" },
              { id: "30d" as PeriodKey, label: "30 dias" },
              { id: "month" as PeriodKey, label: "Este Mês" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  period === p.id
                    ? "bg-[#084D6E] text-white"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Link
            href="/admin/pedidos/novo"
            className="btn-brand text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5"
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span>Novo Pedido</span>
          </Link>
        </div>
      </div>

      {/* Barra de Big Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary">
              Faturamento Aprovado
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-status-success flex items-center justify-center">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-content-primary mt-2">
            R$ {revenue.toFixed(2).replace(".", ",")}
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 inline-block ${
              growth >= 0 ? "text-status-success" : "text-status-error"
            }`}
          >
            {growth >= 0 ? `+${growth}%` : `${growth}%`} vs período anterior
          </span>
        </div>

        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary">
              Pedidos Realizados (Pagos)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#084D6E]/10 text-[#084D6E] dark:text-sky-300 flex items-center justify-center">
              <FiShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-content-primary mt-2">
            {paidCount}
          </div>
          <span className="text-[11px] text-content-secondary block mt-1">
            No período selecionado
          </span>
        </div>

        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary">Ticket Médio</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-content-primary mt-2">
            R$ {avgTicket.toFixed(2).replace(".", ",")}
          </div>
          <span className="text-[11px] text-content-secondary block mt-1">
            Média por pedido pago
          </span>
        </div>

        <Link
          href="/admin/pedidos"
          className="surface-card p-5 border border-border-theme bg-bg-surface hover:border-[#084D6E] rounded-xl transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary">
              Em Produção Agora
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300 flex items-center justify-center">
              <FiLayers className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-content-primary mt-2">
            {inProduction}
          </div>
          <span className="text-[11px] font-semibold text-brand-primary flex items-center gap-1 mt-1 group-hover:underline">
            <span>Abrir Kanban de produção</span>
            <FiArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Central de Atenção / Pendências da Loja */}
      {hasAlerts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(alerts.pending_art_orders || 0) > 0 && (
            <Link
              href="/admin/pedidos"
              className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FiImage className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-content-primary">
                  {alerts.pending_art_orders} pedido(s) aguardando aprovação de arte
                </span>
              </div>
              <FiArrowRight className="w-4 h-4 text-amber-700 flex-shrink-0" />
            </Link>
          )}

          {(alerts.critical_deadline_orders || 0) > 0 && (
            <Link
              href="/admin/pedidos"
              className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/15 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FiClock className="w-5 h-5 text-status-error flex-shrink-0" />
                <span className="text-xs font-semibold text-content-primary">
                  {alerts.critical_deadline_orders} pedido(s) vencendo hoje ou atrasados
                </span>
              </div>
              <FiArrowRight className="w-4 h-4 text-status-error flex-shrink-0" />
            </Link>
          )}

          {(alerts.low_stock_products || 0) > 0 && (
            <Link
              href="/admin/produtos"
              className="p-4 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/15 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FiAlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-content-primary">
                  {alerts.low_stock_products} produto(s) com estoque baixo
                </span>
              </div>
              <FiArrowRight className="w-4 h-4 text-orange-700 flex-shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Gráfico Limpo de Evolução de Vendas (#084D6E) */}
      <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sm font-bold text-content-primary">
              Evolução de Vendas no Período
            </h2>
            <p className="text-[11px] text-content-secondary">
              Faturamento diário aprovado
            </p>
          </div>
          {loading && <span className="text-[11px] text-content-secondary">Atualizando...</span>}
        </div>

        <div className="h-44 flex items-end gap-1.5 pt-4">
          {series.map((d, idx) => {
            const pct = Math.max(4, Math.round(((d.revenue || 0) / maxRev) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                <div className="w-full flex flex-col justify-end h-32">
                  <div
                    title={`${d.label}: R$ ${Number(d.revenue || 0).toFixed(2)} (${d.orders} ped.)`}
                    style={{ height: `${pct}%` }}
                    className="w-full rounded-t bg-[#084D6E]/80 group-hover:bg-[#084D6E] dark:bg-[#2B9ED8]/80 dark:group-hover:bg-[#2B9ED8] transition-all"
                  />
                </div>
                {(series.length <= 10 || idx % Math.ceil(series.length / 8) === 0) && (
                  <span className="text-[9px] text-content-secondary truncate">{d.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking Enxuto: 5 Produtos Mais Vendidos & 5 Últimos Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-content-primary flex items-center gap-1.5">
              <FiBox className="w-4 h-4 text-brand-primary" />
              <span>Top 5 Produtos Mais Vendidos</span>
            </h2>
            <Link href="/admin/produtos" className="text-[11px] font-semibold text-brand-primary hover:underline">
              Ver catálogo
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-content-secondary py-4">Sem vendas registradas no período.</p>
          ) : (
            <div className="divide-y divide-border-theme text-xs">
              {topProducts.map((tp, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-semibold text-content-primary block truncate">
                      {i + 1}. {tp.name}
                    </span>
                    <span className="text-[10px] font-mono text-content-secondary">SKU: {tp.sku}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-content-primary block">{tp.qty_sold} un.</span>
                    <span className="text-[10px] text-content-secondary">
                      R$ {Number(tp.revenue).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-content-primary flex items-center gap-1.5">
              <FiShoppingBag className="w-4 h-4 text-brand-primary" />
              <span>5 Últimos Pedidos</span>
            </h2>
            <Link href="/admin/pedidos" className="text-[11px] font-semibold text-brand-primary hover:underline">
              Ver todos
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-content-secondary py-4">Nenhum pedido registrado ainda.</p>
          ) : (
            <div className="divide-y divide-border-theme text-xs">
              {recentOrders.map((ro) => {
                const st = PRODUCTION_STAGES.find((s) => s.key === ro.production_status);
                const pay = PAYMENT_STATUS_MAP[ro.payment_status] || PAYMENT_STATUS_MAP.PENDING;
                return (
                  <Link
                    key={ro.id}
                    href={`/admin/pedidos/${ro.id}`}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-bg-subtle/40 px-1 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-content-primary">{ro.order_number}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${pay.cls}`}>
                          {pay.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-content-secondary truncate block">
                        {ro.customer_name}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-content-primary block">
                        R$ {Number(ro.total_amount).toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-[10px] text-content-secondary">
                        {st?.label || ro.production_status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
