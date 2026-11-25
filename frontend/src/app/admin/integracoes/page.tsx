"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  FiCpu,
  FiCreditCard,
  FiTruck,
  FiLock,
  FiSettings,
  FiCheckCircle,
  FiAlertCircle,
  FiLink,
  FiX,
  FiActivity,
} from "react-icons/fi";

interface IntegrationModule {
  provider: string;
  category: string;
  title: string;
  description: string;
  badge_color: string;
  is_active: boolean;
  has_credentials: boolean;
  credentials_masked: Record<string, any>;
  config_json: Record<string, any>;
  updated_at?: string;
}

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Modal de edição de credenciais
  const [editingModule, setEditingModule] = useState<IntegrationModule | null>(null);
  const [editCreds, setEditCreds] = useState<Record<string, string>>({});
  const [editConfig, setEditConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const loadIntegrations = async () => {
    try {
      const res = await fetchApi("/integrations");
      if (res.ok) {
        setIntegrations(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleToggle = async (provider: string, currentStatus: boolean) => {
    try {
      const res = await fetchApi(`/integrations/${provider}/toggle`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (res.ok) {
        setIntegrations(
          integrations.map((it) =>
            it.provider === provider ? { ...it, is_active: !currentStatus } : it
          )
        );
        setFeedback({
          type: "success",
          msg: `Módulo ${provider.toUpperCase()} ${!currentStatus ? "ativado" : "desativado"} com sucesso!`,
        });
      }
    } catch (e) {
      setFeedback({ type: "error", msg: "Erro ao alternar status do módulo." });
    }
  };

  const handleOpenEdit = (mod: IntegrationModule) => {
    setEditingModule(mod);
    setEditCreds({ ...mod.credentials_masked });
    setEditConfig({ ...mod.config_json });
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetchApi(`/integrations/${editingModule.provider}`, {
        method: "POST",
        body: JSON.stringify({
          credentials: editCreds,
          config_json: editConfig,
          is_active: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao salvar credenciais.");
      }

      setFeedback({
        type: "success",
        msg: `Credenciais do módulo ${editingModule.title} salvas e criptografadas com segurança!`,
      });
      setEditingModule(null);
      await loadIntegrations();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (provider: string) => {
    setTesting(provider);
    setFeedback(null);

    try {
      const res = await fetchApi(`/integrations/${provider}/test`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({ type: "success", msg: `✓ ${data.message}` });
      } else {
        setFeedback({ type: "error", msg: `⚠️ ${data.message}` });
      }
    } catch (e: any) {
      setFeedback({ type: "error", msg: "Falha na comunicação de teste." });
    } finally {
      setTesting(null);
    }
  };

  const handleConnectMelhorEnvio = async () => {
    try {
      const res = await fetchApi("/integrations/melhorenvio/auth-url");
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.auth_url;
      }
    } catch (e) {
      alert("Erro ao iniciar fluxo OAuth do Melhor Envio.");
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-8 text-center border border-border-theme">
        <div className="animate-spin text-2xl mb-2 text-brand-primary">⚡</div>
        <p className="text-xs text-content-secondary">Carregando módulos de integração...</p>
      </div>
    );
  }

  const paymentModules = integrations.filter((i) => i.category === "payment");
  const shippingModules = integrations.filter((i) => i.category === "shipping");

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
          <FiCpu className="w-5 h-5 text-brand-primary" />
          <span>Módulos Plugáveis & Integrações</span>
        </h1>
        <p className="text-xs text-content-secondary mt-1">
          Ative, configure e teste individualmente gateways de pagamento e transportadoras com armazenamento criptografado (Fernet).
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
          ) : (
            <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* SEÇÃO 1: GATEWAYS DE PAGAMENTO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-theme pb-2.5">
          <FiCreditCard className="w-4 h-4 text-brand-primary" />
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-content-primary">
            Gateways de Pagamento (Checkout & Pix)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {paymentModules.map((mod) => (
            <div
              key={mod.provider}
              className={`surface-card p-6 border rounded-xl flex flex-col justify-between transition-all duration-200 ${
                mod.is_active
                  ? "border-brand-primary/40 bg-bg-surface shadow-sm"
                  : "border-border-theme bg-bg-subtle/30 opacity-80"
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <span className="badge-theme badge-brand text-[10px] mb-1">
                      {mod.provider === "infinitepay" ? "⚡ RECOMENDADO" : "GATEWAY HOMOLOGADO"}
                    </span>
                    <h3 className="font-heading text-base font-bold text-content-primary mt-1">
                      {mod.title}
                    </h3>
                  </div>

                  {/* Toggle Ativar/Desativar */}
                  <button
                    type="button"
                    onClick={() => handleToggle(mod.provider, mod.is_active)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      mod.is_active
                        ? "bg-emerald-500/10 text-status-success border-status-success/30"
                        : "bg-bg-subtle text-content-secondary border-border-theme"
                    }`}
                  >
                    {mod.is_active ? "ATIVO" : "INATIVO"}
                  </button>
                </div>

                <p className="text-xs text-content-secondary leading-relaxed mb-4">
                  {mod.description}
                </p>

                {/* Status de Credenciais */}
                <div className="bg-bg-subtle/70 p-3 rounded-lg border border-border-theme mb-4 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-content-secondary font-medium">Status das Chaves:</span>
                    {mod.has_credentials ? (
                      <span className="text-status-success font-semibold flex items-center gap-1">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        <span>Criptografadas</span>
                      </span>
                    ) : (
                      <span className="text-status-error font-semibold flex items-center gap-1">
                        <FiAlertCircle className="w-3.5 h-3.5" />
                        <span>Não Configurado</span>
                      </span>
                    )}
                  </div>
                  {mod.provider === "infinitepay" && mod.credentials_masked.handle && (
                    <div className="text-[11px] text-content-secondary">
                      InfiniteTag ativa: <strong className="text-content-primary">@{mod.credentials_masked.handle}</strong>
                    </div>
                  )}
                  {mod.provider === "mercadopago" && mod.credentials_masked.access_token && (
                    <div className="text-[11px] text-content-secondary font-mono">
                      Token: {mod.credentials_masked.access_token}
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-3 border-t border-border-theme">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(mod)}
                  className="btn-brand-outline flex-1 text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <FiSettings className="w-3.5 h-3.5" />
                  <span>Configurar</span>
                </button>
                <button
                  type="button"
                  disabled={!mod.has_credentials || testing === mod.provider}
                  onClick={() => handleTestConnection(mod.provider)}
                  className="btn-brand text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
                >
                  <FiActivity className="w-3.5 h-3.5" />
                  <span>{testing === mod.provider ? "Testando..." : "Testar Conexão"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 2: TRANSPORTADORAS & FRETE */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 border-b border-border-theme pb-2.5">
          <FiTruck className="w-4 h-4 text-brand-primary" />
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-content-primary">
            Módulos de Frete & Logística
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {shippingModules.map((mod) => (
            <div
              key={mod.provider}
              className={`surface-card p-6 border rounded-xl flex flex-col justify-between transition-all duration-200 ${
                mod.is_active
                  ? "border-brand-primary/40 bg-bg-surface shadow-sm"
                  : "border-border-theme bg-bg-subtle/30 opacity-80"
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <span className="badge-theme badge-brand text-[10px] mb-1">
                      {mod.provider === "melhorenvio" ? "HUB MULTI-TRANSPORTADORA" : "CONTRATO PRÓPRIO"}
                    </span>
                    <h3 className="font-heading text-base font-bold text-content-primary mt-1">
                      {mod.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle(mod.provider, mod.is_active)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      mod.is_active
                        ? "bg-emerald-500/10 text-status-success border-status-success/30"
                        : "bg-bg-subtle text-content-secondary border-border-theme"
                    }`}
                  >
                    {mod.is_active ? "ATIVO" : "INATIVO"}
                  </button>
                </div>

                <p className="text-xs text-content-secondary leading-relaxed mb-4">
                  {mod.description}
                </p>

                <div className="bg-bg-subtle/70 p-3 rounded-lg border border-border-theme mb-4 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-content-secondary font-medium">Conexão:</span>
                    {mod.has_credentials ? (
                      <span className="text-status-success font-semibold flex items-center gap-1">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        <span>Token Ativo</span>
                      </span>
                    ) : (
                      <span className="text-content-secondary font-medium">Pendente de conexão</span>
                    )}
                  </div>
                  <div className="text-[11px] text-content-secondary">
                    CEP de Origem: <strong className="text-content-primary font-mono">{mod.config_json.origin_postal_code || "01310-100"}</strong>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-2 pt-3 border-t border-border-theme">
                {mod.provider === "melhorenvio" && (
                  <button
                    type="button"
                    onClick={handleConnectMelhorEnvio}
                    className="btn-brand w-full text-xs py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <FiLink className="w-3.5 h-3.5" />
                    <span>Conectar com Melhor Envio (OAuth2)</span>
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(mod)}
                    className="btn-brand-outline flex-1 text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <FiSettings className="w-3.5 h-3.5" />
                    <span>Configurar</span>
                  </button>
                  <button
                    type="button"
                    disabled={!mod.has_credentials || testing === mod.provider}
                    onClick={() => handleTestConnection(mod.provider)}
                    className="btn-brand text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <FiActivity className="w-3.5 h-3.5" />
                    <span>{testing === mod.provider ? "Testando..." : "Testar Conexão"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE CREDENCIAIS & CONFIGURAÇÃO */}
      {editingModule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="surface-card max-w-lg w-full bg-bg-surface border border-border-theme p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border-theme pb-3.5 mb-4">
              <div>
                <span className="badge-theme badge-brand text-[9px] flex items-center gap-1">
                  <FiLock className="w-3 h-3" />
                  <span>CRIPTOGRAFIA SIMÉTRICA FERNET</span>
                </span>
                <h3 className="font-heading text-base font-bold text-content-primary mt-1">
                  Configurar {editingModule.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingModule(null)}
                className="text-content-secondary hover:text-content-primary p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
              {/* Campos específicos da InfinitePay */}
              {editingModule.provider === "infinitepay" && (
                <>
                  <div>
                    <label className="block font-semibold text-content-primary mb-1">
                      InfiniteTag (Handle sem $) *
                    </label>
                    <div className="flex items-center">
                      <span className="bg-bg-subtle border border-r-0 border-border-theme px-3 py-2 font-bold text-content-secondary rounded-l-lg">
                        $
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="sualoja"
                        value={editCreds.handle || ""}
                        onChange={(e) => setEditCreds({ ...editCreds, handle: e.target.value.replace("$", "") })}
                        className="input-theme flex-1 rounded-l-none font-semibold"
                      />
                    </div>
                    <p className="text-[11px] text-content-secondary mt-1">
                      Sua tag da conta InfinitePay onde os pagamentos cairão instantaneamente.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-content-primary mb-1">API Key (Opcional, inchk_...)</label>
                    <input
                      type="text"
                      placeholder="inchk_••••••••"
                      value={editCreds.api_key || ""}
                      onChange={(e) => setEditCreds({ ...editCreds, api_key: e.target.value })}
                      className="input-theme w-full font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-content-primary mb-1">Parcelamento Máximo no Checkout</label>
                    <select
                      value={editConfig.assured_installments || 12}
                      onChange={(e) => setEditConfig({ ...editConfig, assured_installments: parseInt(e.target.value) })}
                      className="input-theme w-full font-semibold"
                    >
                      <option value={1}>1x (Somente à vista)</option>
                      <option value={3}>Até 3x</option>
                      <option value={6}>Até 6x</option>
                      <option value={10}>Até 10x</option>
                      <option value={12}>Até 12x (Parcelamento Garantido)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Campos específicos do Mercado Pago */}
              {editingModule.provider === "mercadopago" && (
                <>
                  <div>
                    <label className="block font-semibold text-content-primary mb-1">Access Token (Produção) *</label>
                    <input
                      type="text"
                      required
                      placeholder="APP_USR-••••••••"
                      value={editCreds.access_token || ""}
                      onChange={(e) => setEditCreds({ ...editCreds, access_token: e.target.value })}
                      className="input-theme w-full font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-content-primary mb-1">Public Key (Chave Pública)</label>
                    <input
                      type="text"
                      placeholder="APP_USR-••••••••"
                      value={editCreds.public_key || ""}
                      onChange={(e) => setEditCreds({ ...editCreds, public_key: e.target.value })}
                      className="input-theme w-full font-mono"
                    />
                  </div>
                </>
              )}

              {/* Campos específicos do Melhor Envio */}
              {editingModule.provider === "melhorenvio" && (
                <>
                  <div>
                    <label className="block font-semibold text-content-primary mb-1">CEP de Origem dos Envios *</label>
                    <input
                      type="text"
                      required
                      placeholder="00000-000"
                      value={editConfig.origin_postal_code || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, origin_postal_code: e.target.value })}
                      className="input-theme w-full font-semibold font-mono"
                    />
                    <p className="text-[11px] text-content-secondary mt-1">
                      CEP do seu galpão de onde as encomendas serão coletadas/despachadas.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-content-primary mb-1">Token de Acesso Manual (Opcional)</label>
                    <input
                      type="text"
                      placeholder="eyJ0eXAiOiJKV1QiLC..."
                      value={editCreds.access_token || ""}
                      onChange={(e) => setEditCreds({ ...editCreds, access_token: e.target.value })}
                      className="input-theme w-full font-mono"
                    />
                  </div>
                </>
              )}

              {/* Campos específicos dos Correios Contrato */}
              {editingModule.provider === "correios" && (
                <>
                  <div>
                    <label className="block font-semibold text-content-primary mb-1">Usuário do Contrato (Correios Fácil) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 9912345678"
                      value={editCreds.usuario || ""}
                      onChange={(e) => setEditCreds({ ...editCreds, usuario: e.target.value })}
                      className="input-theme w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-content-primary mb-1">Código de Acesso às APIs *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={editCreds.codigo_acesso_apis || ""}
                      onChange={(e) => setEditCreds({ ...editCreds, codigo_acesso_apis: e.target.value })}
                      className="input-theme w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-content-primary mb-1">Número do Cartão de Postagem *</label>
                    <input
                      type="text"
                      required
                      placeholder="0071234567"
                      value={editCreds.cartao_postagem || ""}
                      onChange={(e) => setEditCreds({ ...editCreds, cartao_postagem: e.target.value })}
                      className="input-theme w-full font-mono"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-border-theme flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="btn-brand-outline text-xs py-2 px-4 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-brand text-xs py-2 px-6 rounded-lg font-semibold"
                >
                  {saving ? "Criptografando..." : "Salvar Configurações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
