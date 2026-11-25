"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import StorefrontShell from "@/components/StorefrontShell";
import { TenantInfo, fetchApi } from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";
import {
  FiCheckCircle,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiArrowRight,
  FiTruck,
  FiClock,
  FiMessageSquare,
  FiShoppingBag,
} from "react-icons/fi";

export default function OrderThankYouPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<StorefrontTheme>("modern_commerce");

  useEffect(() => {
    async function loadOrder() {
      try {
        const [tenantRes, orderRes] = await Promise.all([
          fetchApi("/tenant/me"),
          fetchApi(`/orders/${orderId}`),
        ]);

        if (tenantRes.ok) {
          const tData = await tenantRes.json();
          setTenant(tData);
          setTheme(getActiveTheme(tData));
        }

        if (orderRes.ok) {
          setOrder(await orderRes.json());
        }
      } catch (e) {
        console.error("Erro ao carregar confirmação do pedido:", e);
      } finally {
        setLoading(false);
      }
    }
    if (orderId) loadOrder();
  }, [orderId]);

  const classes = getThemeClasses(theme);

  const copyPixCode = () => {
    if (order?.pix_copy_paste_code) {
      navigator.clipboard.writeText(order.pix_copy_paste_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="p-6 text-center">
          <div className="animate-spin text-3xl mb-2 text-brand-primary">⚡</div>
          <p className="font-semibold text-xs text-content-primary">Carregando confirmação do pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <StorefrontShell tenant={tenant} themeOverride={theme} pageTitle="Pedido não encontrado">
        <div className={`${classes.card} text-center py-16 px-6 max-w-md mx-auto`}>
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl mx-auto mb-4">
            ⚠️
          </div>
          <h2 className={`${classes.cardTitle} text-lg mb-2 text-rose-600`}>Pedido não encontrado</h2>
          <p className="text-xs text-neutral-500 mb-6">
            Não localizamos os dados deste pedido. Caso tenha dúvidas, entre em contato com nosso atendimento.
          </p>
          <Link href="/" className={classes.btnPrimary}>
            Voltar ao Início
          </Link>
        </div>
      </StorefrontShell>
    );
  }

  const whatsapp = tenant?.settings_json?.whatsapp_phone || "41997098905";
  const whatsappMsg = encodeURIComponent(
    `Olá! Acabei de gerar o pedido #${order.order_number || order.id?.substring(0, 8)} no valor de R$ ${Number(
      order.total_amount
    ).toFixed(2).replace(".", ",")} e gostaria de acompanhar o envio.`
  );

  return (
    <StorefrontShell tenant={tenant} themeOverride={theme} pageTitle="Pedido Confirmado">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Banner de Sucesso */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-1">
            <FiCheckCircle className="w-8 h-8" />
          </div>
          <span className={classes.badgeSuccess}>
            Pedido Gerado com Sucesso!
          </span>
          <h1 className={`${classes.cardTitle} text-2xl sm:text-3xl`}>
            Obrigado pela sua compra!
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Pedido <strong>#{order.order_number || order.id?.substring(0, 8)}</strong>
          </p>
        </div>

        {/* Bloco de Pagamento Pix (se aplicável) */}
        {order.payment_method === "pix" && order.pix_copy_paste_code && (
          <div className={`${classes.card} p-6 border-2 border-emerald-500/30`}>
            <div className={classes.cardHeader}>
              <h3 className={`${classes.cardTitle} flex items-center gap-2 text-emerald-700`}>
                <span>⚡ Pagamento via Pix Instantâneo</span>
              </h3>
              <p className={classes.cardSubtitle}>
                Escaneie o QR Code no seu aplicativo do banco ou use a chave Copia e Cola abaixo.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center my-4">
              {order.pix_qr_code_base64 && (
                <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-xs">
                  <img
                    src={order.pix_qr_code_base64}
                    alt="QR Code Pix"
                    className="w-44 h-44 object-contain"
                  />
                </div>
              )}

              <div className="flex-1 w-full space-y-3">
                <div>
                  <label className={classes.inputLabel}>Chave Pix Copia e Cola:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={order.pix_copy_paste_code}
                      className={`${classes.input} bg-neutral-50 font-mono text-[11px]`}
                    />
                    <button
                      type="button"
                      onClick={copyPixCode}
                      className={classes.btnPrimary}
                    >
                      {copied ? (
                        <>
                          <FiCheck className="w-4 h-4" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <FiCopy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-500 space-y-1">
                  <p>⏳ O QR Code expira em 30 minutos.</p>
                  <p>✓ Assim que o pagamento for concluído, a produção será iniciada automaticamente.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detalhes do Pedido e Endereço */}
        <div className={`${classes.card} p-6 space-y-4`}>
          <h3 className={`${classes.cardTitle} border-b border-neutral-100 pb-3`}>
            Resumo do Pedido
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-neutral-500 block mb-1">Destinatário:</span>
              <p className="font-semibold text-neutral-900">{order.customer?.full_name}</p>
              <p className="text-neutral-600">{order.customer?.email}</p>
              <p className="text-neutral-600">{order.customer?.phone}</p>
            </div>

            <div>
              <span className="text-neutral-500 block mb-1">Endereço de Entrega:</span>
              <p className="font-semibold text-neutral-900">
                {order.shipping_address?.street}, {order.shipping_address?.number}
                {order.shipping_address?.complement ? ` - ${order.shipping_address?.complement}` : ""}
              </p>
              <p className="text-neutral-600">
                {order.shipping_address?.neighborhood} - {order.shipping_address?.city}/{order.shipping_address?.state}
              </p>
              <p className="text-neutral-600">CEP: {order.shipping_address?.postal_code}</p>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Forma de Pagamento:</span>
              <span className="font-semibold text-neutral-900 uppercase">
                {order.payment_method === "credit_card" ? "Cartão de Crédito" : "Pix"}
              </span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Frete:</span>
              <span className="font-semibold text-neutral-900">
                {Number(order.shipping_amount) === 0 ? "Grátis" : `R$ ${Number(order.shipping_amount).toFixed(2).replace(".", ",")}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-neutral-900 pt-2 border-t border-neutral-100">
              <span>Valor Total:</span>
              <span className="text-lg text-[var(--color-primary)]">
                R$ {Number(order.total_amount).toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>

        {/* Ações Finais */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <a
            href={`https://wa.me/${whatsapp}?text=${whatsappMsg}`}
            target="_blank"
            rel="noreferrer"
            className={`${classes.btnPrimary} py-3 px-6`}
          >
            <FiMessageSquare className="w-4 h-4" />
            <span>Acompanhar pelo WhatsApp</span>
          </a>

          <Link href="/#catalogo" className={`${classes.btnSecondary} py-3 px-6`}>
            <FiShoppingBag className="w-4 h-4" />
            <span>Voltar ao Catálogo</span>
          </Link>
        </div>
      </div>
    </StorefrontShell>
  );
}
