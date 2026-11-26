"use client";

import React, { useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiEdit2,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { useAccount } from "@/components/AccountShell";
import { CustomerAddressItem, fetchCustomerApi } from "@/lib/api";
import { getThemeClasses } from "@/lib/themeTokens";
import { maskCEP, onlyDigits } from "@/lib/masks";

interface AddressFormState {
  label: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
}

const EMPTY_FORM: AddressFormState = {
  label: "Casa",
  postal_code: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "SP",
  is_default: false,
};

export default function MeusEnderecosPage() {
  const { theme, refreshCustomer } = useAccount();
  const classes = getThemeClasses(theme);

  const [addresses, setAddresses] = useState<CustomerAddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAddresses = async () => {
    try {
      const res = await fetchCustomerApi("/storefront/me/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleCepBlur = async () => {
    const clean = onlyDigits(form.postal_code);
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
      // ignora erro de rede do ViaCEP
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, is_default: addresses.length === 0 });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (addr: CustomerAddressItem) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label || "Principal",
      postal_code: addr.postal_code,
      street: addr.street,
      number: addr.number,
      complement: addr.complement || "",
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      is_default: addr.is_default,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const endpoint = editingId
        ? `/storefront/me/addresses/${editingId}`
        : "/storefront/me/addresses";
      const method = editingId ? "PUT" : "POST";
      const res = await fetchCustomerApi(endpoint, {
        method,
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Erro ao salvar endereço.");

      setModalOpen(false);
      await loadAddresses();
      await refreshCustomer();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    await fetchCustomerApi(`/storefront/me/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify({ is_default: true }),
    });
    await loadAddresses();
    await refreshCustomer();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este endereço?")) return;
    await fetchCustomerApi(`/storefront/me/addresses/${id}`, {
      method: "DELETE",
    });
    await loadAddresses();
    await refreshCustomer();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold">Meus Endereços</h2>
          <p className="text-xs opacity-70">
            Endereços salvos para agilizar a entrega dos seus pedidos.
          </p>
        </div>

        <button type="button" onClick={openCreateModal} className={classes.btnPrimary}>
          <FiPlus className="w-4 h-4" />
          <span>Novo Endereço</span>
        </button>
      </div>

      {loading ? (
        <div className={classes.card}>Carregando endereços...</div>
      ) : addresses.length === 0 ? (
        <div className={`${classes.card} text-center py-10 space-y-3`}>
          <FiMapPin className="w-8 h-8 mx-auto opacity-45" />
          <p className="text-xs opacity-75">Nenhum endereço cadastrado ainda.</p>
          <button type="button" onClick={openCreateModal} className={classes.btnSecondary}>
            Adicionar primeiro endereço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className={`${classes.card} flex flex-col justify-between gap-4`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading font-bold text-sm">
                    {addr.label || "Endereço"}
                  </span>
                  {addr.is_default && (
                    <span className={classes.badgeSuccess}>
                      <FiCheck className="w-3 h-3" />
                      Principal
                    </span>
                  )}
                </div>
                <p className="text-xs">
                  {addr.street}, {addr.number}
                  {addr.complement ? ` - ${addr.complement}` : ""}
                </p>
                <p className="text-xs opacity-75">
                  {addr.neighborhood} • {addr.city} / {addr.state}
                </p>
                <p className="text-[11px] opacity-65">CEP: {addr.postal_code}</p>
              </div>

              <div className={`pt-3 border-t ${classes.divider} flex flex-wrap items-center justify-between gap-2`}>
                {!addr.is_default ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                  >
                    Definir como principal
                  </button>
                ) : (
                  <span className="text-[11px] opacity-50">Endereço padrão de entrega</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(addr)}
                    className={classes.btnOutline}
                  >
                    <FiEdit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className={classes.btnDanger}
                    title="Excluir endereço"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo / Editar Endereço */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`${classes.card} w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className={classes.cardTitle}>
                {editingId ? "Editar Endereço" : "Novo Endereço"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={classes.inputLabel}>Identificação (ex: Casa, Empresa)</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className={classes.input}
                  />
                </div>
                <div>
                  <label className={classes.inputLabel}>CEP *</label>
                  <input
                    type="text"
                    required
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: maskCEP(e.target.value) })}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    className={classes.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={classes.inputLabel}>Rua / Logradouro *</label>
                  <input
                    type="text"
                    required
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    className={classes.input}
                  />
                </div>
                <div>
                  <label className={classes.inputLabel}>Número *</label>
                  <input
                    type="text"
                    required
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className={classes.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={classes.inputLabel}>Complemento</label>
                  <input
                    type="text"
                    value={form.complement}
                    onChange={(e) => setForm({ ...form, complement: e.target.value })}
                    placeholder="Apto, Sala, Bloco"
                    className={classes.input}
                  />
                </div>
                <div>
                  <label className={classes.inputLabel}>Bairro *</label>
                  <input
                    type="text"
                    required
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    className={classes.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={classes.inputLabel}>Cidade *</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={classes.input}
                  />
                </div>
                <div>
                  <label className={classes.inputLabel}>UF *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                    className={classes.input}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                />
                <span>Definir como endereço principal</span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={classes.btnOutline}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={classes.btnPrimary}>
                  {saving ? "Salvando..." : "Salvar Endereço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
