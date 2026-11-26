"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { PRODUCTION_STAGES } from "@/lib/orderHelpers";
import {
  FiArrowLeft,
  FiSave,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiMapPin,
  FiShoppingBag,
  FiAlertCircle,
  FiCheck,
  FiStar,
  FiX,
} from "react-icons/fi";

function maskPhone(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskDocument(val: string, personType: "PF" | "PJ") {
  const d = val.replace(/\D/g, "");
  if (personType === "PF") {
    const p = d.slice(0, 11);
    if (p.length <= 3) return p;
    if (p.length <= 6) return `${p.slice(0, 3)}.${p.slice(3)}`;
    if (p.length <= 9) return `${p.slice(0, 3)}.${p.slice(3, 6)}.${p.slice(6)}`;
    return `${p.slice(0, 3)}.${p.slice(3, 6)}.${p.slice(6, 9)}-${p.slice(9)}`;
  } else {
    const p = d.slice(0, 14);
    if (p.length <= 2) return p;
    if (p.length <= 5) return `${p.slice(0, 2)}.${p.slice(2)}`;
    if (p.length <= 8) return `${p.slice(0, 2)}.${p.slice(2, 5)}.${p.slice(5)}`;
    if (p.length <= 12) return `${p.slice(0, 2)}.${p.slice(2, 5)}.${p.slice(5, 8)}/${p.slice(8)}`;
    return `${p.slice(0, 2)}.${p.slice(2, 5)}.${p.slice(5, 8)}/${p.slice(8, 12)}-${p.slice(12)}`;
  }
}

interface CustomerFormProps {
  mode: "create" | "edit";
  customerId?: string;
}

export default function CustomerForm({ mode, customerId }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [customerData, setCustomerData] = useState<any | null>(null);

  // Coluna Direita (Dados Cadastrais)
  const [personType, setPersonType] = useState<"PF" | "PJ">("PF");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Endereços (Edição)
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState("Principal");
  const [addrCep, setAddrCep] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrNumber, setAddrNumber] = useState("");
  const [addrComplement, setAddrComplement] = useState("");
  const [addrNeighborhood, setAddrNeighborhood] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  const loadCustomer = async () => {
    if (!customerId) return;
    try {
      const res = await fetchApi(`/customers/${customerId}`);
      if (!res.ok) throw new Error("Cliente não encontrado nesta loja.");
      const c = await res.json();
      setCustomerData(c);
      setPersonType(c.person_type === "PJ" ? "PJ" : "PF");
      setFullName(c.full_name || "");
      setCompanyName(c.company_name || "");
      setTaxId(c.tax_id || "");
      setEmail(c.email || "");
      setPhone(c.phone || "");
      setNotes(c.notes || "");
      setTagsInput((c.tags || []).join(", "));
      setAddresses(c.addresses || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "edit" && customerId) loadCustomer();
  }, [mode, customerId]);

  const handleCepLookup = async (rawCep: string) => {
    setAddrCep(rawCep);
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            setAddrStreet(data.logradouro || "");
            setAddrNeighborhood(data.bairro || "");
            setAddrCity(data.localidade || "");
            setAddrState((data.uf || "").toUpperCase());
          }
        }
      } catch (_) {}
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const tagsList = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const payload: any = {
        person_type: personType,
        full_name: fullName.trim(),
        company_name: personType === "PJ" ? companyName.trim() || null : null,
        tax_id: taxId.trim() || null,
        email: email.trim() || null,
        phone: phone.trim(),
        notes: notes.trim() || null,
        tags: tagsList,
      };

      if (mode === "create" && addrStreet.trim() && addrCity.trim() && addrState.trim()) {
        payload.address = {
          label: addrLabel.trim() || "Principal",
          postal_code: addrCep.trim(),
          street: addrStreet.trim(),
          number: addrNumber.trim() || "s/n",
          complement: addrComplement.trim() || null,
          neighborhood: addrNeighborhood.trim(),
          city: addrCity.trim(),
          state: addrState.trim().toUpperCase(),
          is_default: true,
        };
      }

      const res = await fetchApi(
        mode === "edit" ? `/customers/${customerId}` : "/customers",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar cliente.");
      }

      const saved = await res.json();
      if (mode === "create") {
        router.push(`/admin/clientes/${saved.id}`);
      } else {
        setCustomerData(saved);
        setSuccessMsg("Dados do cliente salvos com sucesso!");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openAddrModal = (addr?: any) => {
    if (addr) {
      setEditingAddrId(addr.id);
      setAddrLabel(addr.label || "Principal");
      setAddrCep(addr.postal_code || "");
      setAddrStreet(addr.street || "");
      setAddrNumber(addr.number || "");
      setAddrComplement(addr.complement || "");
      setAddrNeighborhood(addr.neighborhood || "");
      setAddrCity(addr.city || "");
      setAddrState(addr.state || "");
      setAddrIsDefault(Boolean(addr.is_default));
    } else {
      setEditingAddrId(null);
      setAddrLabel("Entrega");
      setAddrCep("");
      setAddrStreet("");
      setAddrNumber("");
      setAddrComplement("");
      setAddrNeighborhood("");
      setAddrCity("");
      setAddrState("");
      setAddrIsDefault(addresses.length === 0);
    }
    setAddrModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    setSavingAddr(true);
    try {
      const url = editingAddrId
        ? `/customers/${customerId}/addresses/${editingAddrId}`
        : `/customers/${customerId}/addresses`;
      const res = await fetchApi(url, {
        method: editingAddrId ? "PUT" : "POST",
        body: JSON.stringify({
          label: addrLabel.trim() || "Entrega",
          postal_code: addrCep.trim(),
          street: addrStreet.trim(),
          number: addrNumber.trim() || "s/n",
          complement: addrComplement.trim() || null,
          neighborhood: addrNeighborhood.trim(),
          city: addrCity.trim(),
          state: addrState.trim().toUpperCase(),
          is_default: addrIsDefault,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar endereço.");
      }
      setAddrModalOpen(false);
      await loadCustomer();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingAddr(false);
    }
  };

  const handleSetDefaultAddr = async (addrId: string) => {
    if (!customerId) return;
    await fetchApi(`/customers/${customerId}/addresses/${addrId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_default: true }),
    });
    await loadCustomer();
  };

  const handleDeleteAddr = async (addrId: string) => {
    if (!customerId || !confirm("Excluir este endereço?")) return;
    await fetchApi(`/customers/${customerId}/addresses/${addrId}`, { method: "DELETE" });
    await loadCustomer();
  };

  if (loading) {
    return (
      <div className="surface-card p-10 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando ficha do cliente...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6 pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/clientes"
            className="p-2 rounded-lg border border-border-theme bg-bg-surface hover:bg-bg-subtle"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary">
              {mode === "edit" ? fullName || "Editar Cliente" : "Novo Cliente"}
            </h1>
            <p className="text-xs text-content-secondary">
              {mode === "edit"
                ? "Gerencie dados cadastrais, endereços, notas permanentes e histórico de pedidos."
                : "Cadastre cliente PF ou PJ isoladamente nesta loja."}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSaveCustomer}
          className="btn-brand text-xs py-2.5 px-5 flex items-center gap-1.5"
        >
          <FiSave className="w-4 h-4" />
          <span>{saving ? "Salvando..." : mode === "edit" ? "Salvar Alterações" : "Criar Cliente"}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-status-error/30 rounded-lg text-xs font-semibold text-status-error flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-status-success/30 rounded-lg text-xs font-semibold text-status-success flex items-center gap-2">
          <FiCheck className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveCustomer} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
        {/* COLUNA ESQUERDA (70% -> 8 cols): Métricas, Endereços, Histórico */}
        <div className="lg:col-span-8 space-y-6">
          {/* Métricas do Cliente (apenas edição) */}
          {mode === "edit" && customerData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="surface-card p-4 bg-bg-surface border border-border-theme rounded-xl">
                <span className="text-[11px] font-semibold text-content-secondary block mb-1">
                  Total Gasto (LTV)
                </span>
                <span className="font-heading text-xl font-bold text-content-primary">
                  R$ {Number(customerData.total_spent || 0).toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="surface-card p-4 bg-bg-surface border border-border-theme rounded-xl">
                <span className="text-[11px] font-semibold text-content-secondary block mb-1">
                  Pedidos Realizados
                </span>
                <span className="font-heading text-xl font-bold text-content-primary">
                  {customerData.orders_count || 0}
                </span>
              </div>
              <div className="surface-card p-4 bg-bg-surface border border-border-theme rounded-xl">
                <span className="text-[11px] font-semibold text-content-secondary block mb-1">
                  Última Compra
                </span>
                <span className="font-heading text-sm font-bold text-content-primary">
                  {customerData.last_order_at
                    ? new Date(customerData.last_order_at).toLocaleDateString("pt-BR")
                    : "Sem pedidos"}
                </span>
              </div>
            </div>
          )}

          {/* Endereços de Entrega */}
          <section className="surface-card p-6 bg-bg-surface border border-border-theme rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-sm font-bold text-content-primary flex items-center gap-1.5">
                  <FiMapPin className="w-4 h-4 text-brand-primary" />
                  <span>Endereços de Entrega</span>
                </h2>
                <p className="text-[11px] text-content-secondary">
                  Preenchimento automático via CEP (ViaCEP).
                </p>
              </div>
              {mode === "edit" && (
                <button
                  type="button"
                  onClick={() => openAddrModal()}
                  className="btn-outline text-[11px] py-1.5 px-3 flex items-center gap-1"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Adicionar Endereço</span>
                </button>
              )}
            </div>

            {mode === "create" ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block font-semibold mb-1">Rótulo</label>
                  <input
                    type="text"
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    placeholder="Casa / Escritório"
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">CEP (auto)</label>
                  <input
                    type="text"
                    value={addrCep}
                    onChange={(e) => handleCepLookup(e.target.value)}
                    placeholder="00000-000"
                    className="input-theme w-full"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Rua / Logradouro</label>
                  <input
                    type="text"
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Número</label>
                  <input
                    type="text"
                    value={addrNumber}
                    onChange={(e) => setAddrNumber(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Bairro</label>
                  <input
                    type="text"
                    value={addrNeighborhood}
                    onChange={(e) => setAddrNeighborhood(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Cidade</label>
                  <input
                    type="text"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value.toUpperCase())}
                    className="input-theme w-full"
                  />
                </div>
              </div>
            ) : addresses.length === 0 ? (
              <p className="text-content-secondary py-2">Nenhum endereço cadastrado ainda.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-xl border space-y-2 ${
                      addr.is_default
                        ? "border-[#084D6E] bg-[#084D6E]/5"
                        : "border-border-theme bg-bg-subtle/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-content-primary">{addr.label || "Endereço"}</span>
                        {addr.is_default && (
                          <span className="px-2 py-0.5 rounded-full bg-[#084D6E] text-white text-[9px] font-bold">
                            Principal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!addr.is_default && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddr(addr.id)}
                            title="Definir como principal"
                            className="p-1 text-content-secondary hover:text-brand-primary"
                          >
                            <FiStar className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openAddrModal(addr)}
                          title="Editar endereço"
                          className="p-1 text-content-secondary hover:text-brand-primary"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddr(addr.id)}
                          title="Excluir endereço"
                          className="p-1 text-content-secondary hover:text-status-error"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-content-secondary space-y-0.5">
                      <p className="text-content-primary">
                        {addr.street}, {addr.number}
                        {addr.complement ? ` - ${addr.complement}` : ""}
                      </p>
                      <p>
                        {addr.neighborhood} • {addr.city}/{addr.state}
                      </p>
                      <p>CEP: {addr.postal_code}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Histórico de Pedidos (apenas edição) */}
          {mode === "edit" && customerData && (
            <section className="surface-card p-6 bg-bg-surface border border-border-theme rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-sm font-bold text-content-primary flex items-center gap-1.5">
                  <FiShoppingBag className="w-4 h-4 text-brand-primary" />
                  <span>Histórico de Pedidos ({customerData.orders?.length || 0})</span>
                </h2>
                <Link
                  href={`/admin/pedidos/novo?customer_id=${customerData.id}`}
                  className="btn-brand text-[11px] py-1.5 px-3 flex items-center gap-1"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Criar Pedido para este Cliente</span>
                </Link>
              </div>

              {(customerData.orders || []).length === 0 ? (
                <p className="text-content-secondary">Este cliente ainda não realizou pedidos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-bg-subtle text-content-secondary border-b border-border-theme text-[10px] uppercase">
                        <th className="py-2.5 px-3 text-left">Pedido</th>
                        <th className="py-2.5 px-3 text-left">Data</th>
                        <th className="py-2.5 px-3 text-left">Etapa</th>
                        <th className="py-2.5 px-3 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-theme">
                      {(customerData.orders || []).map((o: any) => {
                        const stage = PRODUCTION_STAGES.find((s) => s.key === o.production_status);
                        return (
                          <tr key={o.id} className="hover:bg-bg-subtle/40">
                            <td className="py-2.5 px-3 font-bold">
                              <Link
                                href={`/admin/pedidos/${o.id}`}
                                className="text-brand-primary hover:underline"
                              >
                                {o.order_number}
                              </Link>
                            </td>
                            <td className="py-2.5 px-3 text-content-secondary">
                              {new Date(o.created_at).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-bg-subtle border border-border-theme text-[10px] font-semibold">
                                {stage?.fullLabel || o.production_status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              R$ {Number(o.total_amount).toFixed(2).replace(".", ",")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {/* COLUNA DIREITA (30% -> 4 cols): Dados Cadastrais & Anotações */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-4">
            <h2 className="font-heading text-sm font-bold text-content-primary">
              Dados Cadastrais
            </h2>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-bg-subtle border border-border-theme">
              <button
                type="button"
                onClick={() => setPersonType("PF")}
                className={`py-1.5 rounded-md font-semibold transition-colors ${
                  personType === "PF" ? "bg-[#084D6E] text-white" : "text-content-secondary"
                }`}
              >
                Pessoa Física
              </button>
              <button
                type="button"
                onClick={() => setPersonType("PJ")}
                className={`py-1.5 rounded-md font-semibold transition-colors ${
                  personType === "PJ" ? "bg-[#084D6E] text-white" : "text-content-secondary"
                }`}
              >
                Pessoa Jurídica
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                {personType === "PJ" ? "Nome Fantasia / Contato *" : "Nome Completo *"}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-theme w-full"
              />
            </div>

            {personType === "PJ" && (
              <div>
                <label className="block font-semibold mb-1">Razão Social</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input-theme w-full"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">
                {personType === "PJ" ? "CNPJ" : "CPF"}
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(maskDocument(e.target.value, personType))}
                placeholder={personType === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"}
                className="input-theme w-full font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-theme w-full"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">WhatsApp / Telefone *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(41) 99999-9999"
                className="input-theme w-full"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="VIP, Corporativo, Recorrente"
                className="input-theme w-full"
              />
            </div>
          </section>

          <section className="surface-card p-5 bg-bg-surface border border-border-theme rounded-xl space-y-3">
            <h2 className="font-heading text-sm font-bold text-content-primary">
              Anotações Permanentes
            </h2>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferências de fonte, logo padrão, horário de entrega..."
              className="input-theme w-full resize-y"
            />
          </section>
        </div>
      </form>

      {/* Modal de Endereço */}
      {addrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-bg-surface border border-border-theme rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-content-primary">
                {editingAddrId ? "Editar Endereço" : "Novo Endereço"}
              </h3>
              <button
                type="button"
                onClick={() => setAddrModalOpen(false)}
                className="p-1.5 rounded hover:bg-bg-subtle"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Rótulo</label>
                  <input
                    type="text"
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    placeholder="Casa, Escritório..."
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">CEP (busca automática)</label>
                  <input
                    type="text"
                    value={addrCep}
                    onChange={(e) => handleCepLookup(e.target.value)}
                    placeholder="00000-000"
                    className="input-theme w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Rua *</label>
                  <input
                    type="text"
                    required
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Número *</label>
                  <input
                    type="text"
                    required
                    value={addrNumber}
                    onChange={(e) => setAddrNumber(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Complemento</label>
                  <input
                    type="text"
                    value={addrComplement}
                    onChange={(e) => setAddrComplement(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Bairro</label>
                  <input
                    type="text"
                    value={addrNeighborhood}
                    onChange={(e) => setAddrNeighborhood(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Cidade *</label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">UF *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value.toUpperCase())}
                    className="input-theme w-full"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-[#084D6E]"
                />
                <span className="font-semibold">Definir como endereço principal</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddrModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAddr}
                  className="btn-brand text-xs py-2 px-4"
                >
                  {savingAddr ? "Salvando..." : "Salvar Endereço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
