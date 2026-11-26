"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StorefrontShell from "@/components/StorefrontShell";
import { CartItem, TenantInfo, fetchApi } from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";
import {
  FiCheckCircle,
  FiLock,
  FiTruck,
  FiCreditCard,
  FiUser,
  FiMapPin,
  FiArrowRight,
  FiArrowLeft,
  FiShield,
  FiAlertCircle,
  FiZap,
} from "react-icons/fi";

interface ShippingOption {
  carrier: string;
  service_code: string;
  service_name: string;
  company_name: string;
  price: number;
  delivery_days: number;
}

interface PaymentGatewayOption {
  provider: string;
  title: string;
  type: string;
  max_installments: number;
  badge: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<StorefrontTheme>("modern_commerce");

  // Provedores de Pagamento Ativos da Loja
  const [availableGateways, setAvailableGateways] = useState<PaymentGatewayOption[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("pix");

  // Dados do Cliente
  const [personType, setPersonType] = useState<"PF" | "PJ">("PF");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");

  // Opções de Frete Dinâmico
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Parcelamento
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        const [tenantRes, gatewaysRes] = await Promise.all([
          fetchApi("/tenant/me"),
          fetchApi("/payment/active-gateways"),
        ]);

        if (tenantRes.ok) {
          const tData = await tenantRes.json();
          setTenant(tData);
          setTheme(getActiveTheme(tData));
        }

        if (gatewaysRes.ok) {
          const gData = await gatewaysRes.json();
          const gList = gData.gateways || [];
          setAvailableGateways(gList);
          if (gList.length > 0) {
            setSelectedGateway(gList[0].provider);
          }
        }

        const raw = localStorage.getItem("saas_cart");
        if (raw) {
          const items = JSON.parse(raw);
          if (items.length === 0) {
            router.push("/carrinho");
          } else {
            setCartItems(items);
          }
        } else {
          router.push("/carrinho");
        }
      } catch (e) {
        console.error("Erro ao inicializar checkout:", e);
      }
    }
    loadData();
  }, [router]);

  const classes = getThemeClasses(theme);

  // Busca CEP e consulta os provedores de frete ativos
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        // 1. Busca Logradouro via ViaCEP
        const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const viaCepData = await viaCepRes.json();
        if (!viaCepData.erro) {
          setStreet(viaCepData.logradouro || "");
          setNeighborhood(viaCepData.bairro || "");
          setCity(viaCepData.localidade || "");
          setState(viaCepData.uf || "SP");
        }

        // 2. Consulta Provedores de Frete
        setLoadingShipping(true);
        const shippingPayload = {
          dest_zip: cleanCep,
          items: cartItems.map((ci) => ({
            id: ci.product.id,
            name: ci.product.name,
            quantity: ci.quantity,
            unit_price: Number(ci.unit_price),
            weight_grams: ci.product.weight_grams || 350,
            length_cm: ci.product.length_cm || 16,
            width_cm: ci.product.width_cm || 12,
            height_cm: ci.product.height_cm || 10,
          })),
        };

        const shipRes = await fetchApi("/shipping/calculate", {
          method: "POST",
          body: JSON.stringify(shippingPayload),
        });

        if (shipRes.ok) {
          const shipData = await shipRes.json();
          const options = shipData.options || [];
          setShippingOptions(options);
          if (options.length > 0) {
            setSelectedShipping(options[0]);
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar CEP ou frete:", err);
      } finally {
        setLoadingShipping(false);
      }
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const freeShippingThreshold = tenant?.settings_json?.free_shipping_min_amount || 299;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingCost = isFreeShipping ? 0 : selectedShipping ? Number(selectedShipping.price) : 25.0;
  const total = subtotal + shippingCost;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || !taxId || !email || !phone) {
      setErrorMsg("Por favor, preencha todos os dados obrigatórios de identificação.");
      return;
    }
    if (!cep || !street || !number || !city) {
      setErrorMsg("Por favor, preencha o endereço completo de entrega.");
      return;
    }

    setSubmitting(true);

    const payload = {
      items: cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        custom_text: item.custom_text || null,
        customization_answers: item.customization_answers || [],
        artwork_url: item.artwork_url || null,
      })),
      customer: {
        full_name: fullName,
        company_name: personType === "PJ" ? companyName : null,
        tax_id: taxId,
        email,
        phone,
      },
      shipping_address: {
        postal_code: cep,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        country: "BR",
      },
      payment_method:
        selectedGateway === "infinitepay" || selectedGateway === "mercadopago"
          ? "credit_card"
          : "pix",
      installments: installments,
      shipping_amount: shippingCost,
      shipping_provider: selectedShipping ? selectedShipping.carrier : "melhorenvio",
      shipping_service_name: selectedShipping ? selectedShipping.service_name : "SEDEX Nacional",
    };

    try {
      const res = await fetchApi("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao processar pedido.");
      }

      const orderData = await res.json();

      // Limpa carrinho
      localStorage.removeItem("saas_cart");
      window.dispatchEvent(new Event("cart-updated"));

      // Se for gateway ativo com checkout externo
      if (selectedGateway === "infinitepay" || selectedGateway === "mercadopago") {
        try {
          const sessionRes = await fetchApi(
            `/payment/create-session/${orderData.id}?provider_name=${selectedGateway}`,
            { method: "POST" }
          );

          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData.checkout_url) {
              window.location.href = sessionData.checkout_url;
              return;
            }
          }
        } catch (sessErr) {
          console.warn("Redirecionando para obrigado padrão:", sessErr);
        }
      }

      // Redireciona para tela de confirmação com Pix e resumo
      router.push(`/pedido/${orderData.id}/obrigado`);
    } catch (err: any) {
      setErrorMsg(err.message || "Falha na geração do pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StorefrontShell tenant={tenant} themeOverride={theme} pageTitle="Checkout Seguro">
      <div className="space-y-6">
        {/* Cabeçalho do Checkout */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200/60 pb-4">
          <div>
            <Link
              href="/carrinho"
              className="text-xs text-neutral-500 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1"
            >
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Carrinho</span>
            </Link>
            <h1 className={`${classes.cardTitle} text-xl sm:text-2xl mt-1 flex items-center gap-2`}>
              <FiLock className="w-5 h-5 text-emerald-600" />
              <span>Checkout Seguro & Transparente</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <FiShield className="w-4 h-4 text-emerald-600" />
            <span>Dados 100% Criptografados</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna 1: Dados do Cliente, Endereço e Pagamento (7 colunas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Bloco 1: Identificação */}
            <div className={classes.card}>
              <div className={classes.cardHeader}>
                <h3 className={`${classes.cardTitle} flex items-center gap-2`}>
                  <FiUser className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>1. Identificação do Comprador</span>
                </h3>
                <p className={classes.cardSubtitle}>
                  Seus dados são necessários para a emissão da nota fiscal e contato sobre o pedido.
                </p>
              </div>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="person_type"
                    checked={personType === "PF"}
                    onChange={() => setPersonType("PF")}
                    className="text-[var(--color-primary)]"
                  />
                  <span>Pessoa Física (CPF)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="person_type"
                    checked={personType === "PJ"}
                    onChange={() => setPersonType("PJ")}
                    className="text-[var(--color-primary)]"
                  />
                  <span>Pessoa Jurídica (CNPJ - B2B)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={classes.inputLabel}>
                    {personType === "PF" ? "Nome Completo *" : "Nome do Responsável *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={classes.input}
                  />
                </div>

                {personType === "PJ" && (
                  <div>
                    <label className={classes.inputLabel}>Razão Social / Nome da Empresa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Minha Empresa LTDA"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={classes.input}
                    />
                  </div>
                )}

                <div>
                  <label className={classes.inputLabel}>
                    {personType === "PF" ? "CPF *" : "CNPJ *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={personType === "PF" ? "000.000.000-00" : "00.000.000/0001-00"}
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className={classes.input}
                  />
                </div>

                <div>
                  <label className={classes.inputLabel}>E-mail de Confirmação *</label>
                  <input
                    type="email"
                    required
                    placeholder="seuemail@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={classes.input}
                  />
                </div>

                <div>
                  <label className={classes.inputLabel}>WhatsApp / Celular *</label>
                  <input
                    type="tel"
                    required
                    placeholder="(00) 90000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={classes.input}
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Endereço de Entrega */}
            <div className={classes.card}>
              <div className={classes.cardHeader}>
                <h3 className={`${classes.cardTitle} flex items-center gap-2`}>
                  <FiMapPin className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>2. Endereço de Entrega</span>
                </h3>
                <p className={classes.cardSubtitle}>
                  Informe o CEP para cálculo do frete e preenchimento automático do endereço.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={classes.inputLabel}>CEP *</label>
                  <input
                    type="text"
                    required
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                    className={classes.input}
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <span className="text-[11px] text-neutral-500 pb-2">
                    {loadingShipping ? "Buscando tarifas e logradouro..." : "Digite o CEP e saia do campo para buscar"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="sm:col-span-2">
                  <label className={classes.inputLabel}>Logradouro / Rua *</label>
                  <input
                    type="text"
                    required
                    placeholder="Rua, Avenida, etc."
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className={classes.input}
                  />
                </div>

                <div>
                  <label className={classes.inputLabel}>Número *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 123"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className={classes.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={classes.inputLabel}>Complemento</label>
                  <input
                    type="text"
                    placeholder="Sala, Apto, Bloco..."
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className={classes.input}
                  />
                </div>

                <div>
                  <label className={classes.inputLabel}>Bairro *</label>
                  <input
                    type="text"
                    required
                    placeholder="Bairro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className={classes.input}
                  />
                </div>

                <div>
                  <label className={classes.inputLabel}>Cidade / UF *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={classes.input}
                    />
                    <input
                      type="text"
                      required
                      placeholder="UF"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      maxLength={2}
                      className="w-14 bg-white border border-neutral-300 rounded-xl px-2 py-2 text-xs text-center font-bold uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Opções de Frete Disponíveis */}
              {shippingOptions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                  <label className={classes.inputLabel}>Modalidade de Envio Selecionada:</label>
                  <div className="space-y-2">
                    {shippingOptions.map((opt, sIdx) => {
                      const isSelected = selectedShipping?.service_code === opt.service_code;
                      return (
                        <div
                          key={sIdx}
                          onClick={() => setSelectedShipping(opt)}
                          className={isSelected ? classes.radioCardActive : classes.radioCard}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="checkout_shipping"
                                checked={isSelected}
                                onChange={() => setSelectedShipping(opt)}
                                className="text-[var(--color-primary)]"
                              />
                              <div>
                                <span className="font-semibold text-xs text-neutral-900 block">
                                  {opt.service_name} • {opt.carrier}
                                </span>
                                <span className="text-[11px] text-neutral-500">
                                  Prazo estimado: até {opt.delivery_days} dias úteis
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-xs text-neutral-900">
                              {isFreeShipping ? "Grátis" : `R$ ${Number(opt.price).toFixed(2).replace(".", ",")}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bloco 3: Pagamento Seguro */}
            <div className={classes.card}>
              <div className={classes.cardHeader}>
                <h3 className={`${classes.cardTitle} flex items-center gap-2`}>
                  <FiCreditCard className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>3. Forma de Pagamento</span>
                </h3>
                <p className={classes.cardSubtitle}>
                  Selecione como prefere efetuar o pagamento. Todas as transações são seguras.
                </p>
              </div>

              <div className="space-y-3">
                {/* Opção Pix Padrão */}
                <div
                  onClick={() => setSelectedGateway("pix")}
                  className={selectedGateway === "pix" ? classes.radioCardActive : classes.radioCard}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_gateway"
                        checked={selectedGateway === "pix"}
                        onChange={() => setSelectedGateway("pix")}
                        className="text-[var(--color-primary)]"
                      />
                      <div>
                        <span className="font-semibold text-xs text-neutral-900 block">
                          ⚡ Pix Instantâneo (Aprovação Imediata)
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          Gera QR Code e chave copia-e-cola direto na tela.
                        </span>
                      </div>
                    </div>
                    <span className={classes.badgeSuccess}>Desconto / Rápido</span>
                  </div>
                </div>

                {/* Gateways Adicionais Dinâmicos (Mercado Pago / InfinitePay) */}
                {availableGateways.map((gw) => {
                  const isSelected = selectedGateway === gw.provider;
                  return (
                    <div
                      key={gw.provider}
                      onClick={() => setSelectedGateway(gw.provider)}
                      className={isSelected ? classes.radioCardActive : classes.radioCard}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_gateway"
                            checked={isSelected}
                            onChange={() => setSelectedGateway(gw.provider)}
                            className="text-[var(--color-primary)]"
                          />
                          <div>
                            <span className="font-semibold text-xs text-neutral-900 block">
                              💳 {gw.title}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              Cartão de Crédito em até {gw.max_installments}x
                            </span>
                          </div>
                        </div>
                        <span className={classes.badge}>{gw.badge}</span>
                      </div>

                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-3">
                          <label className="text-[11px] font-semibold text-neutral-700">
                            Parcelas:
                          </label>
                          <select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1 text-xs text-neutral-900 focus:outline-none"
                          >
                            {Array.from({ length: gw.max_installments || 12 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                {n}x de R$ {(total / n).toFixed(2).replace(".", ",")}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Coluna 2: Resumo do Pedido (5 colunas) */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`${classes.card} p-6 space-y-4`}>
              <h3 className={`${classes.cardTitle} border-b border-neutral-100 pb-3`}>
                Itens do Pedido ({cartItems.reduce((acc, ci) => acc + ci.quantity, 0)})
              </h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cartItems.map((ci, idx) => (
                  <div key={idx} className="flex gap-3 text-xs items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                        <img
                          src={ci.product.image_url || "/uploads/jestein/garrafa-inox-500ml.jpg"}
                          alt={ci.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">{ci.product.name}</p>
                        <p className="text-[11px] text-neutral-500">
                          {ci.quantity}x R$ {ci.unit_price.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-neutral-900 shrink-0">
                      R$ {(ci.unit_price * ci.quantity).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Valores */}
              <div className="border-t border-neutral-100 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900">
                    R$ {subtotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>Frete</span>
                  <span className="font-semibold text-neutral-900">
                    {isFreeShipping ? (
                      <span className={classes.badgeSuccess}>Grátis</span>
                    ) : (
                      `R$ ${shippingCost.toFixed(2).replace(".", ",")}`
                    )}
                  </span>
                </div>

                <div className="border-t border-neutral-200/80 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-neutral-900">Total</span>
                  <span className="text-xl font-black text-[var(--color-primary)]">
                    R$ {total.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              {/* Botão de Finalização */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full ${classes.btnPrimary} py-3.5 text-sm`}
              >
                {submitting ? (
                  <span>Processando Pedido com Segurança...</span>
                ) : (
                  <>
                    <span>Concluir Pedido com Segurança</span>
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-[11px] text-neutral-400 text-center space-y-1">
                <p>🔒 Conexão segura protegida por SSL e TLS 1.3</p>
                <p>Os detalhes do pedido serão enviados ao seu e-mail.</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </StorefrontShell>
  );
}
