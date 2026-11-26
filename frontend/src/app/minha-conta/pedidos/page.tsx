"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiPackage, FiShoppingBag } from "react-icons/fi";
import { useAccount } from "@/components/AccountShell";
import OrderProgressBar from "@/components/OrderProgressBar";
import { CustomerOrder, fetchCustomerApi } from "@/lib/api";
import { getThemeClasses } from "@/lib/themeTokens";
import { formatCurrencyBRL } from "@/lib/masks";

function getPaymentBadge(paymentStatus: string, classes: ReturnType<typeof getThemeClasses>) {
  const s = (paymentStatus || "").toUpperCase();
  if (s === "PAID") {
    return <span className={classes.badgeSuccess}>Pagamento Aprovado</span>;
  }
  if (s === "REFUNDED") {
    return <span className={classes.badge}>Reembolsado</span>;
  }
  if (s === "REFUSED" || s === "CANCELLED") {
    return <span className={classes.badgeWarning}>Pagamento Recusado</span>;
  }
  return <span className={classes.badgeWarning}>Aguardando Pagamento</span>;
}

export default function MeusPedidosPage() {
  const { theme } = useAccount();
  const classes = getThemeClasses(theme);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerApi("/storefront/me/orders")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={classes.card}>Carregando seus pedidos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">Meus Pedidos</h2>
        <span className={classes.badge}>{orders.length} pedido(s)</span>
      </div>

      {orders.length === 0 ? (
        <div className={`${classes.card} text-center py-12 space-y-4`}>
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center opacity-70">
            <FiShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm">Você ainda não realizou pedidos</h3>
            <p className="text-xs opacity-70 mt-1">
              Explore o catálogo da loja para personalizar seus produtos.
            </p>
          </div>
          <Link href="/#catalogo" className={classes.btnPrimary}>
            Explorar Catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const formattedDate = new Date(order.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            return (
              <div key={order.id} className={`${classes.card} space-y-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <FiPackage className="w-4 h-4 text-[var(--color-primary)]" />
                      <span className="font-heading font-bold text-sm">
                        Pedido {order.order_number}
                      </span>
                      {getPaymentBadge(order.payment_status, classes)}
                    </div>
                    <p className="text-[11px] opacity-65 mt-1">
                      Realizado em {formattedDate} • {order.items?.length || 0} item(ns)
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] opacity-65">Valor Total</p>
                    <p className="font-heading font-bold text-base text-[var(--color-primary)]">
                      {formatCurrencyBRL(order.total_amount)}
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <OrderProgressBar
                  status={order.status}
                  productionStatus={order.production_status}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="text-xs opacity-75">
                    {order.shipping_tracking_code ? (
                      <span>
                        Rastreio: <strong>{order.shipping_tracking_code}</strong>
                      </span>
                    ) : (
                      <span>
                        Prazo estimado de produção: {order.estimated_production_days || 0} dia(s)
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/minha-conta/pedidos/${order.id}`}
                    className={classes.btnOutline}
                  >
                    <span>Ver detalhes e artes</span>
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
