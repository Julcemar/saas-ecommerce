"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import {
  FiUsers,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiShoppingBag,
  FiMessageCircle,
  FiMapPin,
} from "react-icons/fi";

type CustomerFilterTab = "ALL" | "NEW_30D" | "RECURRING" | "PF" | "PJ";

function onlyDigits(val: string) {
  return (val || "").replace(/\D/g, "");
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CustomerFilterTab>("ALL");
  const [search, setSearch] = useState("");

  const loadCustomers = async () => {
    try {
      const res = await fetchApi("/customers");
      if (res.ok) setCustomers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const kpis = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const new30d = customers.filter(
      (c) => now - new Date(c.created_at).getTime() <= thirtyDaysMs
    );
    const recurring = customers.filter((c) => (c.orders_count || 0) >= 2);
    const totalLtv = customers.reduce((acc, c) => acc + Number(c.total_spent || 0), 0);
    const avgTicket = customers.length > 0 ? totalLtv / customers.length : 0;

    return {
      total: customers.length,
      new30d: new30d.length,
      recurring: recurring.length,
      avgTicket,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return customers.filter((c) => {
      if (activeTab === "NEW_30D" && now - new Date(c.created_at).getTime() > thirtyDaysMs) {
        return false;
      }
      if (activeTab === "RECURRING" && (c.orders_count || 0) < 2) return false;
      if (activeTab === "PF" && c.person_type !== "PF") return false;
      if (activeTab === "PJ" && c.person_type !== "PJ") return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match =
          (c.full_name || "").toLowerCase().includes(q) ||
          (c.company_name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.tax_id || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [customers, activeTab, search]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Deseja excluir o cliente "${name}"? Os pedidos já realizados permanecerão preservados no histórico da loja.`
      )
    ) {
      return;
    }
    try {
      const res = await fetchApi(`/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      alert("Erro ao excluir cliente.");
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-10 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando base de clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
            <FiUsers className="w-5 h-5 text-brand-primary" />
            <span>Gestão de Clientes</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Base de clientes PF e PJ isolada da sua loja, endereços de entrega, notas e histórico.
          </p>
        </div>

        <Link
          href="/admin/clientes/novo"
          className="btn-brand text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5"
        >
          <FiPlus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </Link>
      </div>

      {/* 1. Barra de Big Numbers (KPIs Clicáveis) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === "ALL"
              ? "border-[#084D6E] bg-[#084D6E]/10 ring-2 ring-[#084D6E]/20"
              : "border-border-theme bg-bg-surface hover:border-brand-primary/50"
          }`}
        >
          <span className="text-[11px] font-semibold text-content-secondary block mb-1">
            Total de Clientes
          </span>
          <span className="font-heading text-2xl font-bold text-content-primary">
            {kpis.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "NEW_30D" ? "ALL" : "NEW_30D")}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === "NEW_30D"
              ? "border-[#084D6E] bg-[#084D6E]/10 ring-2 ring-[#084D6E]/20"
              : "border-border-theme bg-bg-surface hover:border-brand-primary/50"
          }`}
        >
          <span className="text-[11px] font-semibold text-content-secondary block mb-1">
            Novos (Últimos 30 dias)
          </span>
          <span className="font-heading text-2xl font-bold text-content-primary">
            {kpis.new30d}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "RECURRING" ? "ALL" : "RECURRING")}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === "RECURRING"
              ? "border-[#084D6E] bg-[#084D6E]/10 ring-2 ring-[#084D6E]/20"
              : "border-border-theme bg-bg-surface hover:border-brand-primary/50"
          }`}
        >
          <span className="text-[11px] font-semibold text-content-secondary block mb-1">
            Recorrentes (2+ pedidos)
          </span>
          <span className="font-heading text-2xl font-bold text-content-primary">
            {kpis.recurring}
          </span>
        </button>

        <div className="p-4 rounded-xl border border-border-theme bg-bg-surface">
          <span className="text-[11px] font-semibold text-content-secondary block mb-1">
            Ticket Médio por Cliente
          </span>
          <span className="font-heading text-2xl font-bold text-content-primary">
            R$ {kpis.avgTicket.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      {/* 2. Abas + Busca Instantânea */}
      <div className="surface-card p-3.5 border border-border-theme bg-bg-surface rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "ALL" as CustomerFilterTab, label: "Todos" },
            { id: "RECURRING" as CustomerFilterTab, label: "Recorrentes" },
            { id: "PF" as CustomerFilterTab, label: "Pessoa Física" },
            { id: "PJ" as CustomerFilterTab, label: "Pessoa Jurídica" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-[#084D6E] text-white"
                  : "bg-bg-subtle text-content-secondary hover:text-content-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <FiSearch className="w-4 h-4 text-content-secondary absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, e-mail, CPF/CNPJ ou telefone..."
            className="input-theme w-full pl-9 text-xs"
          />
        </div>
      </div>

      {/* 3. Tabela Enxuta de Clientes */}
      <div className="surface-card border border-border-theme bg-bg-surface rounded-xl overflow-hidden shadow-sm">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-bg-subtle text-content-secondary flex items-center justify-center mx-auto mb-3">
              <FiUsers className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-content-primary mb-1">
              Nenhum cliente encontrado
            </p>
            <p className="text-xs text-content-secondary mb-4">
              Cadastre clientes manualmente ou aguarde os primeiros pedidos na vitrine.
            </p>
            <Link href="/admin/clientes/novo" className="btn-brand text-xs py-2 px-4 rounded-lg inline-flex items-center gap-1.5">
              <FiPlus className="w-3.5 h-3.5" />
              <span>Cadastrar Cliente</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-bg-subtle text-content-secondary border-b border-border-theme uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4 text-left">Cliente</th>
                  <th className="py-3 px-4 text-left">Contato</th>
                  <th className="py-3 px-4 text-left">Cidade / UF</th>
                  <th className="py-3 px-4 text-left">Pedidos</th>
                  <th className="py-3 px-4 text-left">Total Gasto (LTV)</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {filteredCustomers.map((c) => {
                  const phoneDigits = onlyDigits(c.phone);
                  const waLink = phoneDigits
                    ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}`
                    : null;

                  return (
                    <tr key={c.id} className="hover:bg-bg-subtle/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/clientes/${c.id}`}
                            className="font-semibold text-content-primary hover:text-brand-primary"
                          >
                            {c.full_name}
                          </Link>
                          {c.person_type === "PJ" && (
                            <span className="px-1.5 py-0.5 rounded bg-[#084D6E]/15 text-[#084D6E] dark:text-sky-300 text-[9px] font-bold">
                              PJ
                            </span>
                          )}
                        </div>
                        {c.tax_id && (
                          <span className="text-[10px] font-mono text-content-secondary block mt-0.5">
                            {c.tax_id}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-content-primary">{c.email || "—"}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-content-secondary mt-0.5">
                          <span>{c.phone || "—"}</span>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir no WhatsApp"
                              className="text-emerald-600 hover:text-emerald-700 inline-flex items-center"
                            >
                              <FiMessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-content-secondary">
                        {c.default_city ? (
                          <span className="inline-flex items-center gap-1">
                            <FiMapPin className="w-3 h-3" />
                            <span>
                              {c.default_city}/{c.default_state}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-content-primary">
                        {c.orders_count || 0}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-content-primary">
                        R$ {Number(c.total_spent || 0).toFixed(2).replace(".", ",")}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/clientes/${c.id}`}
                            className="px-3 py-1.5 rounded-lg bg-bg-subtle hover:bg-[#084D6E] hover:text-white text-content-primary border border-border-theme font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <FiEdit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </Link>
                          <Link
                            href={`/admin/pedidos/novo?customer_id=${c.id}`}
                            title="Novo pedido para este cliente"
                            className="p-1.5 rounded-lg border border-border-theme text-content-secondary hover:text-brand-primary hover:bg-bg-subtle"
                          >
                            <FiShoppingBag className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id, c.full_name)}
                            title="Excluir cliente"
                            className="p-1.5 rounded-lg text-content-secondary hover:text-status-error hover:bg-red-500/10"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
