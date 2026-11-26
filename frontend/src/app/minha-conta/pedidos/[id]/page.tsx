"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FiArrowLeft,
  FiExternalLink,
  FiFileText,
  FiImage,
  FiMapPin,
  FiMessageCircle,
  FiTruck,
} from "react-icons/fi";
import { useAccount } from "@/components/AccountShell";
import OrderProgressBar from "@/components/OrderProgressBar";
import { CustomerOrder, fetchCustomerApi } from "@/lib/api";
import { getThemeClasses } from "@/lib/themeTokens";
import { formatCurrencyBRL } from "@/lib/masks";

export default function PedidoDetalhePage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const { tenant, theme } = useAccount();
  const classes = getThemeClasses(theme);

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetchCustomerApi(`/storefront/me/orders/${orderId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Pedido não encontrado.");
        }
        return res.json();
      })
      .then((data) => setOrder(data))
      .catch((err: any) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return <div className={classes.card}>Carregando detalhes do pedido...</div>;
  }

  if (errorMsg || !order) {
    return (
      <div className={`${classes.card} space-y-4`}>
        <p className="text-xs text-rose-600 font-semibold">{errorMsg || "Pedido não encontrado."}</p>
        <Link href="/minha-conta/pedidos" className={classes.btnOutline}>
          <FiArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Meus Pedidos</span>
        </Link>
      </div>
    );
  }

  const whatsappRaw = (tenant?.settings_json?.whatsapp_phone || "5541997098905").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${whatsappRaw}?text=${encodeURIComponent(
    `Olá! Gostaria de falar sobre o meu pedido ${order.order_number}.`
  )}`;

  const addr = order.shipping_address_snapshot || {};
  const isPaid = (order.payment_status || "").toUpperCase() === "PAID";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/minha-conta/pedidos" className={classes.btnOutline}>
          <FiArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Meus Pedidos</span>
        </Link>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <FiMessageCircle className="w-4 h-4" />
          <span>Falar sobre este pedido no WhatsApp</span>
        </a>
      </div>

      {/* Resumo + Barra de Progresso */}
      <div className={`${classes.card} space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-heading text-lg font-bold">
              Pedido {order.order_number}
            </h2>
            <p className="text-xs opacity-70 mt-0.5">
              Realizado em {new Date(order.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={isPaid ? classes.badgeSuccess : classes.badgeWarning}>
              {isPaid ? "Pagamento Confirmado" : "Aguardando Pagamento"}
            </span>
          </div>
        </div>

        <OrderProgressBar
          status={order.status}
          productionStatus={order.production_status}
        />
      </div>

      {/* Produtos & Personalizações */}
      <div className={`${classes.card} space-y-4`}>
        <h3 className={classes.cardTitle}>Produtos e Personalização</h3>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {item.product_image_url ? (
                    <img
                      src={item.product_image_url}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <FiImage className="w-5 h-5 opacity-40" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-xs sm:text-sm">{item.name}</p>
                    {item.variant_name && (
                      <p className="text-[11px] opacity-70">{item.variant_name}</p>
                    )}
                    <p className="text-xs opacity-75 mt-1">
                      Qtd: <strong>{item.quantity}</strong> × {formatCurrencyBRL(item.unit_price)}
                    </p>
                  </div>
                </div>

                <div className="text-right font-bold text-sm">
                  {formatCurrencyBRL(item.subtotal)}
                </div>
              </div>

              {/* Detalhes de Personalização / Arte */}
              {(item.custom_text ||
                item.customization_notes ||
                (item.customization_answers && item.customization_answers.length > 0) ||
                item.artwork_url ||
                item.approved_art_url) && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-80">
                      <FiFileText className="w-3.5 h-3.5" />
                      Detalhes da Personalização
                    </span>
                    <span
                      className={
                        item.art_approved || item.artwork_status === "approved"
                          ? classes.badgeSuccess
                          : item.artwork_status === "rejected"
                          ? classes.badgeWarning
                          : classes.badge
                      }
                    >
                      {item.art_approved || item.artwork_status === "approved"
                        ? "Arte Aprovada"
                        : item.artwork_status === "rejected"
                        ? "Arte em Ajuste"
                        : "Arte em Análise"}
                    </span>
                  </div>

                  {item.custom_text && (
                    <p>
                      <span className="opacity-70">Texto personalizado:</span>{" "}
                      <strong>{item.custom_text}</strong>
                    </p>
                  )}

                  {item.customization_answers &&
                    item.customization_answers.map((ans, idx) => (
                      <p key={idx}>
                        <span className="opacity-70">{ans.label}:</span>{" "}
                        <strong>{ans.value}</strong>
                      </p>
                    ))}

                  {item.customization_notes && (
                    <p>
                      <span className="opacity-70">Observações:</span> {item.customization_notes}
                    </p>
                  )}

                  {(item.approved_art_url || item.artwork_url) && (
                    <div className="pt-1 flex flex-wrap gap-3">
                      {item.artwork_url && (
                        <a
                          href={item.artwork_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--color-primary)] font-semibold hover:underline"
                        >
                          <FiExternalLink className="w-3.5 h-3.5" />
                          <span>Ver arte enviada ({item.artwork_filename || "arquivo"})</span>
                        </a>
                      )}
                      {item.approved_art_url && (
                        <a
                          href={item.approved_art_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                        >
                          <FiExternalLink className="w-3.5 h-3.5" />
                          <span>Ver arte aprovada</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Entrega, Rastreio & Totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${classes.card} space-y-3`}>
          <h3 className={`${classes.cardTitle} flex items-center gap-2`}>
            <FiMapPin className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Endereço de Entrega & Envio</span>
          </h3>

          <div className="text-xs space-y-1 opacity-85">
            <p className="font-semibold">
              {addr.street || "-"}, {addr.number || "s/n"}
              {addr.complement ? ` - ${addr.complement}` : ""}
            </p>
            <p>
              {addr.neighborhood ? `${addr.neighborhood} • ` : ""}
              {addr.city || "-"} / {addr.state || "-"}
            </p>
            <p>CEP: {addr.postal_code || "-"}</p>
          </div>

          <div className={`pt-3 border-t ${classes.divider} text-xs space-y-1.5`}>
            <p className="flex items-center gap-1.5 font-semibold">
              <FiTruck className="w-4 h-4 text-[var(--color-primary)]" />
              <span>
                {order.shipping_service_name || "Entrega"} ({order.shipping_provider || "Padrão"})
              </span>
            </p>
            {order.shipping_tracking_code ? (
              <p className="bg-slate-100 px-3 py-2 rounded-lg font-mono text-xs">
                Código de Rastreio: <strong>{order.shipping_tracking_code}</strong>
              </p>
            ) : (
              <p className="opacity-65">Código de rastreio disponível após a postagem.</p>
            )}
          </div>
        </div>

        <div className={`${classes.card} space-y-3`}>
          <h3 className={classes.cardTitle}>Resumo Financeiro</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="opacity-70">Subtotal dos produtos</span>
              <span>{formatCurrencyBRL(order.items_subtotal)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Desconto</span>
                <span>- {formatCurrencyBRL(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="opacity-70">Frete</span>
              <span>
                {Number(order.shipping_amount) === 0
                  ? "Grátis"
                  : formatCurrencyBRL(order.shipping_amount)}
              </span>
            </div>
            <div className={`pt-2 border-t ${classes.divider} flex justify-between font-bold text-sm`}>
              <span>Total</span>
              <span className="text-[var(--color-primary)]">
                {formatCurrencyBRL(order.total_amount)}
              </span>
            </div>
            <p className="text-[11px] opacity-65 pt-1">
              Forma de pagamento: <strong className="uppercase">{order.payment_method}</strong>
              {order.installments > 1 ? ` (${order.installments}x)` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
