"use client";

import React, { useEffect, useState } from "react";
import { fetchApi, TenantInfo } from "@/lib/api";
import {
  FiGlobe,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiSave,
  FiInfo,
  FiAlertCircle,
} from "react-icons/fi";

export default function AdminCustomDomainPage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  useEffect(() => {
    async function loadTenant() {
      try {
        const res = await fetchApi("/tenant/me");
        if (res.ok) {
          const data = await res.json();
          setTenant(data);
          if (data.custom_domain) {
            setCustomDomain(data.custom_domain);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadTenant();
  }, []);

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDomain.trim()) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetchApi("/tenant/custom-domain", {
        method: "POST",
        body: JSON.stringify({ custom_domain: customDomain.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar domínio.");
      }

      const data = await res.json();
      setFeedback({
        type: "info",
        msg: "Domínio salvo com sucesso! Configure os registros de DNS abaixo e clique em 'Verificar DNS'.",
      });

      if (tenant) {
        setTenant({ ...tenant, custom_domain: data.custom_domain, domain_verified: false });
      }
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDns = async () => {
    setVerifying(true);
    setFeedback(null);

    try {
      const res = await fetchApi("/tenant/verify-dns", {
        method: "POST",
      });

      const data = await res.json();

      if (data.domain_verified) {
        setFeedback({
          type: "success",
          msg: "✓ CNAME validado com sucesso! O Caddy emitirá o certificado SSL automaticamente no primeiro acesso.",
        });
        if (tenant) {
          setTenant({ ...tenant, domain_verified: true });
        }
      } else {
        setFeedback({
          type: "error",
          msg: `Falha na verificação: ${data.message}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        msg: err.message || "Erro de conexão ao verificar DNS.",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando dados do domínio...</p>
      </div>
    );
  }

  const dnsTarget = "cname.seusistema.com.br";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
          <FiGlobe className="w-5 h-5 text-brand-primary" />
          <span>Domínio Próprio & Certificado SSL</span>
        </h1>
        <p className="text-xs text-content-secondary mt-1">
          Conecte o domínio próprio da sua marca (ex: <strong className="text-content-primary">loja.suaempresa.com.br</strong>) com emissão automática de SSL On-Demand via Caddy.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs font-semibold flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border border-status-success/30 text-status-success"
              : feedback.type === "error"
              ? "bg-red-500/10 border border-status-error/30 text-status-error"
              : "bg-sky-500/10 border border-brand-accent/30 text-brand-accent"
          }`}
        >
          {feedback.type === "success" ? (
            <FiCheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : feedback.type === "error" ? (
            <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <FiInfo className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Status do Domínio */}
      <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-theme pb-5">
          <div>
            <span className="text-[11px] uppercase font-bold text-content-secondary block">
              Status da Conexão
            </span>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="font-heading text-lg font-bold text-content-primary font-mono">
                {tenant?.custom_domain || "Nenhum domínio configurado"}
              </span>
              {tenant?.domain_verified ? (
                <span className="badge-theme badge-success text-[10px] flex items-center gap-1">
                  <FiCheckCircle className="w-3.5 h-3.5" />
                  <span>DOMÍNIO VERIFICADO & SSL ATIVO</span>
                </span>
              ) : (
                <span className="badge-theme badge-warning text-[10px] flex items-center gap-1">
                  <FiClock className="w-3.5 h-3.5" />
                  <span>AGUARDANDO VERIFICAÇÃO DNS</span>
                </span>
              )}
            </div>
          </div>

          {tenant?.custom_domain && (
            <button
              type="button"
              onClick={handleVerifyDns}
              disabled={verifying}
              className="btn-brand text-xs py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <FiSearch className="w-4 h-4" />
              <span>{verifying ? "Consultando DNS..." : "Verificar DNS Agora"}</span>
            </button>
          )}
        </div>

        {/* Formulário para Inserir ou Alterar Domínio */}
        <form onSubmit={handleSaveDomain} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-content-primary mb-1.5">
              Informe o seu Domínio ou Subdomínio Próprio:
            </label>
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                required
                placeholder="Ex: loja.minhamarca.com.br"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="input-theme flex-1 text-sm font-mono"
              />
              <button
                type="submit"
                disabled={saving}
                className="btn-brand text-xs py-2 px-5 whitespace-nowrap rounded-lg flex items-center justify-center gap-1.5"
              >
                <FiSave className="w-3.5 h-3.5" />
                <span>{saving ? "Salvando..." : "Salvar Domínio"}</span>
              </button>
            </div>
            <p className="text-[11px] text-content-secondary mt-1.5">
              Recomendamos usar um subdomínio como <strong className="text-content-primary">loja.seudominio.com.br</strong> para apontamento CNAME direto.
            </p>
          </div>
        </form>
      </div>

      {/* Instruções de DNS */}
      <div className="surface-card p-6 border border-border-theme bg-bg-surface rounded-xl space-y-4">
        <h3 className="font-heading text-sm font-bold text-content-primary flex items-center gap-2">
          <span>📋 Instruções de Apontamento DNS (Zona DNS do seu Provedor)</span>
        </h3>

        <p className="text-xs text-content-secondary leading-relaxed">
          Acesse o painel onde você comprou o domínio (Registro.br, Cloudflare, GoDaddy, Hostinger, etc.) e adicione a seguinte entrada de CNAME:
        </p>

        <div className="overflow-x-auto rounded-lg border border-border-theme">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg-subtle text-content-primary border-b border-border-theme">
                <th className="p-3 text-left font-semibold">Tipo</th>
                <th className="p-3 text-left font-semibold">Nome / Host</th>
                <th className="p-3 text-left font-semibold">Destino (Target)</th>
                <th className="p-3 text-left font-semibold">TTL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-theme font-mono">
              <tr className="bg-bg-surface hover:bg-bg-subtle/40 transition-colors">
                <td className="p-3 font-bold text-status-warning">CNAME</td>
                <td className="p-3 text-content-primary font-bold">
                  {tenant?.custom_domain ? tenant.custom_domain.split(".")[0] : "loja"}
                </td>
                <td className="p-3 text-brand-primary font-bold">
                  {dnsTarget}
                </td>
                <td className="p-3 text-content-secondary font-sans">Automático / 3600</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3.5 bg-bg-subtle/70 border border-border-theme rounded-lg text-xs space-y-1.5 text-content-secondary">
          <p className="font-semibold text-content-primary">
            🔒 Como funciona o On-Demand TLS do Caddy:
          </p>
          <p className="text-[11px] leading-relaxed">
            Quando um visitante acessa seu domínio pela primeira vez, o servidor web Caddy consulta internamente nosso endpoint{" "}
            <code className="text-brand-primary bg-bg-surface px-1 py-0.5 rounded font-mono">/api/internal/verify-domain</code>. Se o DNS estiver verificado, o Caddy emite um certificado SSL Let's Encrypt / ZeroSSL automático em tempo real sem nenhuma complexidade.
          </p>
        </div>
      </div>
    </div>
  );
}
