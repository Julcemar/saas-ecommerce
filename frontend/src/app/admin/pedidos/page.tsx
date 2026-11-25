"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  FiShoppingCart,
  FiDownload,
  FiUser,
  FiMapPin,
  FiClock,
  FiFilter,
} from "react-icons/fi";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const loadOrders = async (statusFilter?: string) => {
    try {
      const url = statusFilter ? `/orders?status_filter=${statusFilter}` : "/orders";
      const res = await fetchApi(url);
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
    loadOrders(selectedStatus);
  }, [selectedStatus]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetchApi(`/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders(orders.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (e) {
      alert("Erro ao atualizar status do pedido.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <span className="badge-theme badge-warning">Aguardando Pgto</span>;
      case "payment_confirmed":
        return <span className="badge-theme badge-success">Pago / Confirmado</span>;
      case "artwork_review":
        return <span className="badge-theme badge-brand">Revisão de Arte</span>;
      case "in_production":
        return <span className="badge-theme badge-warning">Em Produção</span>;
      case "ready_for_dispatch":
        return <span className="badge-theme badge-brand">Pronto p/ Envio</span>;
      case "shipped":
        return <span className="badge-theme badge-brand">Enviado</span>;
      case "delivered":
        return <span className="badge-theme badge-success">Entregue</span>;
      case "cancelled":
        return <span className="badge-theme badge-error">Cancelado</span>;
      default:
        return <span className="badge-theme bg-bg-subtle text-content-secondary">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
            <FiShoppingCart className="w-5 h-5 text-brand-primary" />
            <span>Fila de Produção & Pedidos</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Acompanhe pedidos, baixe artes anexadas pelos clientes e atualize status industriais.
          </p>
        </div>

        {/* Filtro por Status */}
        <div className="flex items-center gap-2 text-xs">
          <FiFilter className="w-3.5 h-3.5 text-content-secondary" />
          <span className="font-semibold text-content-secondary">Filtrar:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-theme font-medium text-xs py-1.5"
          >
            <option value="">Todos os Status</option>
            <option value="pending_payment">Aguardando Pagamento</option>
            <option value="payment_confirmed">Pago / Confirmado</option>
            <option value="artwork_review">Revisão de Arte</option>
            <option value="in_production">Em Produção</option>
            <option value="ready_for_dispatch">Pronto p/ Envio</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregue</option>
          </select>
        </div>
      </div>

      <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-bg-subtle text-content-secondary flex items-center justify-center mx-auto mb-3">
              <FiShoppingCart className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-content-secondary">Nenhum pedido encontrado neste filtro.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-5 border border-border-theme rounded-xl bg-bg-subtle/40 space-y-4 shadow-sm"
              >
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-border-theme pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-heading font-bold text-sm text-content-primary">
                      {o.order_number}
                    </span>
                    <span className="text-xs text-content-secondary flex items-center gap-1">
                      <FiClock className="w-3.5 h-3.5" />
                      <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(o.status)}

                    {/* Alteração rápida de status */}
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="input-theme text-xs py-1 px-2 font-medium cursor-pointer"
                    >
                      <option value="pending_payment">Pendente Pagamento</option>
                      <option value="payment_confirmed">Pagamento Confirmado</option>
                      <option value="artwork_review">Revisão de Arte</option>
                      <option value="in_production">Em Produção</option>
                      <option value="ready_for_dispatch">Pronto p/ Envio</option>
                      <option value="shipped">Enviado</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Dados do Cliente e Endereço */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <FiUser className="w-4 h-4 text-content-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-content-primary block mb-0.5">
                        {o.customer_snapshot?.full_name} ({o.customer_snapshot?.tax_id})
                      </span>
                      <div className="text-content-secondary">
                        {o.customer_snapshot?.email} • {o.customer_snapshot?.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <FiMapPin className="w-4 h-4 text-content-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-content-primary block mb-0.5">Endereço de Entrega</span>
                      <div className="text-content-secondary">
                        {o.shipping_address_snapshot?.street}, {o.shipping_address_snapshot?.number}{" "}
                        {o.shipping_address_snapshot?.complement && `(${o.shipping_address_snapshot?.complement})`},{" "}
                        {o.shipping_address_snapshot?.neighborhood} - {o.shipping_address_snapshot?.city}/
                        {o.shipping_address_snapshot?.state} (CEP: {o.shipping_address_snapshot?.postal_code})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itens do Pedido & Artes Anexadas */}
                <div className="pt-2 border-t border-border-theme">
                  <span className="font-semibold text-xs text-content-secondary block mb-2">
                    Itens e Gravações Industriais:
                  </span>
                  <div className="space-y-2 text-xs">
                    {o.items?.map((it: any) => (
                      <div
                        key={it.id}
                        className="p-3 bg-bg-surface border border-border-theme rounded-lg flex flex-wrap justify-between items-center gap-2"
                      >
                        <div>
                          <span className="font-semibold text-content-primary">{it.quantity}x</span>{" "}
                          <span className="text-content-primary">{it.name}</span>{" "}
                          <span className="text-content-secondary font-mono">({it.sku})</span>
                          {it.custom_text && (
                            <div className="text-[11px] bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded inline-block ml-2">
                              ✍️ Gravação: <strong>"{it.custom_text}"</strong>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {it.artwork_url ? (
                            <a
                              href={it.artwork_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-brand text-[10px] py-1 px-2.5 rounded flex items-center gap-1.5"
                            >
                              <FiDownload className="w-3 h-3" />
                              <span>Baixar Arte ({it.artwork_filename || "arquivo"})</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-content-secondary">Sem arte</span>
                          )}

                          <span className="font-bold text-content-primary">
                            R$ {Number(it.subtotal).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totais */}
                <div className="flex justify-between items-center pt-3 border-t border-border-theme text-xs font-semibold">
                  <div className="text-content-secondary">
                    Pagamento: <span className="uppercase text-content-primary">{o.payment_method}</span> ({o.payment_status})
                  </div>
                  <div className="font-heading text-sm font-bold text-brand-primary">
                    Total: R$ {Number(o.total_amount).toFixed(2).replace(".", ",")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
