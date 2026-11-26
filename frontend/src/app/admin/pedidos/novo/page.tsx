"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi, ProductItem } from "@/lib/api";
import { PRODUCTION_STAGES } from "@/lib/orderHelpers";
import { FiArrowLeft, FiPlus, FiTrash2, FiSave, FiAlertCircle } from "react-icons/fi";

interface ManualItemDraft {
  product_id: string;
  name: string;
  sku: string;
  variant_name: string;
  product_image_url: string;
  unit_price: string;
  quantity: number;
  custom_text: string;
  customization_notes: string;
  art_approved: boolean;
}

export default function AdminNewManualOrderPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<ProductItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cliente
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");

  // Endereço
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Controle & Pagamento
  const [productionStatus, setProductionStatus] = useState("NEW");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [priority, setPriority] = useState("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [shippingAmount, setShippingAmount] = useState("0.00");
  const [discountAmount, setDiscountAmount] = useState("0.00");
  const [internalNotes, setInternalNotes] = useState("");

  const [items, setItems] = useState<ManualItemDraft[]>([
    {
      product_id: "",
      name: "",
      sku: "MANUAL",
      variant_name: "",
      product_image_url: "",
      unit_price: "39.90",
      quantity: 1,
      custom_text: "",
      customization_notes: "",
      art_approved: false,
    },
  ]);

  useEffect(() => {
    async function loadCatalog() {
      const res = await fetchApi("/products/admin");
      if (res.ok) setCatalog(await res.json());
    }
    loadCatalog();
  }, []);

  const handleSelectProduct = (idx: number, prodId: string) => {
    const found = catalog.find((p) => p.id === prodId);
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (!found) return { ...it, product_id: "" };
        return {
          ...it,
          product_id: found.id,
          name: found.name,
          sku: found.sku,
          product_image_url: found.image_url || "",
          unit_price: String(found.base_price),
        };
      })
    );
  };

  const subtotal = items.reduce(
    (acc, it) => acc + (parseFloat(it.unit_price) || 0) * (Number(it.quantity) || 0),
    0
  );
  const total = Math.max(
    0,
    subtotal - (parseFloat(discountAmount) || 0) + (parseFloat(shippingAmount) || 0)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetchApi("/orders/manual", {
        method: "POST",
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || null,
          customer_tax_id: customerTaxId.trim() || null,
          shipping_address: {
            street,
            number,
            neighborhood,
            city,
            state: stateUf,
            postal_code: postalCode,
          },
          items: items.map((it) => ({
            product_id: it.product_id || null,
            name: it.name.trim(),
            sku: it.sku.trim() || "MANUAL",
            variant_name: it.variant_name.trim() || null,
            product_image_url: it.product_image_url || null,
            unit_price: parseFloat(it.unit_price) || 0,
            quantity: Number(it.quantity) || 1,
            custom_text: it.custom_text.trim() || null,
            customization_notes: it.customization_notes.trim() || null,
            art_approved: it.art_approved,
          })),
          discount_amount: parseFloat(discountAmount) || 0,
          shipping_amount: parseFloat(shippingAmount) || 0,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          production_status: productionStatus,
          priority,
          due_date: dueDate || null,
          internal_notes: internalNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao criar pedido.");
      }

      const created = await res.json();
      router.push(`/admin/pedidos/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pedidos"
            className="p-2 rounded-lg border border-border-theme bg-bg-surface hover:bg-bg-subtle"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary">
              Novo Pedido Manual
            </h1>
            <p className="text-xs text-content-secondary">
              Cadastre pedidos recebidos via WhatsApp ou Instagram direto na fila de produção.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-status-error/30 rounded-lg text-xs font-semibold text-status-error flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
        <div className="lg:col-span-8 space-y-6">
          {/* Cliente & Endereço */}
          <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4">
            <h2 className="font-heading text-sm font-bold text-content-primary">
              Dados do Cliente e Entrega
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Nome Completo / Empresa *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">WhatsApp / Telefone *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(41) 99999-9999"
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">CPF / CNPJ</label>
                <input
                  type="text"
                  value={customerTaxId}
                  onChange={(e) => setCustomerTaxId(e.target.value)}
                  className="input-theme w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border-theme">
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Rua / Logradouro</label>
                <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className="input-theme w-full" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Número</label>
                <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="input-theme w-full" />
              </div>
              <div>
                <label className="block font-semibold mb-1">CEP</label>
                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="input-theme w-full" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Bairro</label>
                <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="input-theme w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Cidade</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input-theme w-full" />
              </div>
              <div>
                <label className="block font-semibold mb-1">UF</label>
                <input type="text" maxLength={2} value={stateUf} onChange={(e) => setStateUf(e.target.value.toUpperCase())} className="input-theme w-full" />
              </div>
            </div>
          </section>

          {/* Itens Personalizados */}
          <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold text-content-primary">
                Itens e Personalização
              </h2>
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    {
                      product_id: "",
                      name: "",
                      sku: "MANUAL",
                      variant_name: "",
                      product_image_url: "",
                      unit_price: "39.90",
                      quantity: 1,
                      custom_text: "",
                      customization_notes: "",
                      art_approved: false,
                    },
                  ])
                }
                className="btn-outline text-[11px] py-1.5 px-3 flex items-center gap-1"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Adicionar Item</span>
              </button>
            </div>

            <div className="space-y-4">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-bg-subtle/40 border border-border-theme space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="block font-semibold mb-1">Produto do Catálogo (opcional)</label>
                      <select
                        value={it.product_id}
                        onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        className="input-theme w-full"
                      >
                        <option value="">— Item personalizado avulso —</option>
                        {catalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (R$ {Number(p.base_price).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block font-semibold mb-1">Nome do Item *</label>
                      <input
                        type="text"
                        required
                        value={it.name}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row))
                          )
                        }
                        className="input-theme w-full"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block font-semibold mb-1">Qtd</label>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, quantity: Number(e.target.value) } : row
                            )
                          )
                        }
                        className="input-theme w-full"
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-1 items-end">
                      <div className="flex-1">
                        <label className="block font-semibold mb-1">Unit. (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, unit_price: e.target.value } : row
                              )
                            )
                          }
                          className="input-theme w-full"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-2 text-status-error"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Texto para Personalizar</label>
                      <input
                        type="text"
                        value={it.custom_text}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, custom_text: e.target.value } : row
                            )
                          )
                        }
                        placeholder="Nome, frase ou tema..."
                        className="input-theme w-full"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Observações da Arte</label>
                      <input
                        type="text"
                        value={it.customization_notes}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, customization_notes: e.target.value } : row
                            )
                          )
                        }
                        placeholder="Detalhes combinados no WhatsApp..."
                        className="input-theme w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Coluna Direita (Resumo & Produção) */}
        <div className="lg:col-span-4 space-y-6">
          <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4">
            <h2 className="font-heading text-sm font-bold text-content-primary">
              Produção & Pagamento
            </h2>

            <div>
              <label className="block font-semibold mb-1">Etapa Inicial</label>
              <select
                value={productionStatus}
                onChange={(e) => setProductionStatus(e.target.value)}
                className="input-theme w-full"
              >
                {PRODUCTION_STAGES.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.fullLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Pagamento</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="input-theme w-full"
                >
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Pago</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Meio</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-theme w-full"
                >
                  <option value="pix">Pix</option>
                  <option value="credit_card">Cartão</option>
                  <option value="manual">Dinheiro / Transf.</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Data Limite de Produção</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-theme w-full"
              />
            </div>

            <label className="flex items-center justify-between p-3 rounded-lg bg-bg-subtle/60 border border-border-theme cursor-pointer">
              <span className="font-semibold">Pedido Urgente</span>
              <input
                type="checkbox"
                checked={priority === "URGENT"}
                onChange={(e) => setPriority(e.target.checked ? "URGENT" : "NORMAL")}
                className="w-4 h-4 accent-red-600"
              />
            </label>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-theme">
              <div>
                <label className="block font-semibold mb-1">Frete (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(e.target.value)}
                  className="input-theme w-full"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="input-theme w-full"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border-theme flex justify-between items-center font-heading text-base font-bold">
              <span>Total</span>
              <span>R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-brand w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              <FiSave className="w-4 h-4" />
              <span>{submitting ? "Criando..." : "Criar Pedido na Produção"}</span>
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}
