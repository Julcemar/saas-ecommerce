"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import {
  FiDollarSign,
  FiShoppingBag,
  FiTrendingUp,
  FiBox,
  FiPlus,
  FiGlobe,
  FiArrowRight,
  FiLayers,
} from "react-icons/fi";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetchApi("/admin/metrics");
        if (res.ok) {
          setMetrics(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando métricas de vendas...</p>
      </div>
    );
  }

  const gmv = metrics?.gmv || 0;
  const totalOrders = metrics?.total_orders || 0;
  const avgTicket = metrics?.average_ticket || 0;
  const totalProducts = metrics?.total_products || 0;
  const statusCounts = metrics?.orders_by_status || {};

  return (
    <div className="space-y-6">
      {/* Título & Ações Rápidas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary">
            Visão Geral do E-commerce
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Métricas de faturamento, vendas e fluxo de produção dos pedidos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/produtos/novo" className="btn-brand text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5">
            <FiPlus className="w-3.5 h-3.5" />
            <span>Novo Produto</span>
          </Link>
          <Link href="/admin/dominio" className="btn-brand-outline text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5">
            <FiGlobe className="w-3.5 h-3.5" />
            <span>Domínio Próprio</span>
          </Link>
        </div>
      </div>

      {/* Grid de Métricas Principais (GMV, Pedidos, Ticket Médio, Produtos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary">
              Volume Faturado (GMV)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-status-success flex items-center justify-center">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-content-primary mt-2">
            R$ {gmv.toFixed(2).replace(".", ",")}
          </div>
          <span className="text-[11px] text-status-success font-medium flex items-center gap-1 mt-1">
            <span>✓</span> Pedidos faturados
          </span>
        </div>

        {/* Total Pedidos */}
        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary">
              Total de Pedidos
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <FiShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-content-primary mt-2">
            {totalOrders}
          </div>
          <span className="text-[11px] text-content-secondary block mt-1">
            Pedidos registrados
          </span>
        </div>

        {/* Ticket Médio */}
        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary">
              Ticket Médio
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-status-warning flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-content-primary mt-2">
            R$ {avgTicket.toFixed(2).replace(".", ",")}
          </div>
          <span className="text-[11px] text-content-secondary block mt-1">
            Média por venda
          </span>
        </div>

        {/* Catálogo Ativo */}
        <div className="surface-card p-5 border border-border-theme bg-bg-surface rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary">
              Catálogo Ativo
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-brand-accent flex items-center justify-center">
              <FiBox className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-content-primary mt-2">
            {totalProducts}
          </div>
          <span className="text-[11px] text-content-secondary block mt-1">
            Produtos cadastrados
          </span>
        </div>
      </div>

      {/* Fila de Produção & Pedidos por Status */}
      <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-border-theme pb-4">
          <div className="flex items-center gap-2">
            <FiLayers className="w-4 h-4 text-brand-primary" />
            <h3 className="font-heading text-sm font-bold text-content-primary">
              Fluxo e Fila de Produção dos Pedidos
            </h3>
          </div>
          <Link
            href="/admin/pedidos"
            className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"
          >
            <span>Ver Todos os Pedidos</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3.5 bg-bg-subtle/70 border border-border-theme rounded-lg">
            <span className="text-[11px] text-content-secondary block font-medium">Pendente Pgto</span>
            <div className="font-heading text-xl font-bold text-content-primary mt-1">
              {statusCounts.pending_payment || 0}
            </div>
          </div>

          <div className="p-3.5 bg-bg-subtle/70 border border-border-theme rounded-lg">
            <span className="text-[11px] text-content-secondary block font-medium">Confirmado</span>
            <div className="font-heading text-xl font-bold text-status-success mt-1">
              {statusCounts.payment_confirmed || 0}
            </div>
          </div>

          <div className="p-3.5 bg-bg-subtle/70 border border-border-theme rounded-lg">
            <span className="text-[11px] text-content-secondary block font-medium">Revisão de Arte</span>
            <div className="font-heading text-xl font-bold text-status-info mt-1">
              {statusCounts.artwork_review || 0}
            </div>
          </div>

          <div className="p-3.5 bg-bg-subtle/70 border border-border-theme rounded-lg">
            <span className="text-[11px] text-content-secondary block font-medium">Em Produção</span>
            <div className="font-heading text-xl font-bold text-status-warning mt-1">
              {statusCounts.in_production || 0}
            </div>
          </div>

          <div className="p-3.5 bg-bg-subtle/70 border border-border-theme rounded-lg">
            <span className="text-[11px] text-content-secondary block font-medium">Pronto p/ Envio</span>
            <div className="font-heading text-xl font-bold text-brand-primary mt-1">
              {statusCounts.ready_for_dispatch || 0}
            </div>
          </div>

          <div className="p-3.5 bg-bg-subtle/70 border border-border-theme rounded-lg">
            <span className="text-[11px] text-content-secondary block font-medium">Entregue</span>
            <div className="font-heading text-xl font-bold text-status-success mt-1">
              {statusCounts.delivered || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
