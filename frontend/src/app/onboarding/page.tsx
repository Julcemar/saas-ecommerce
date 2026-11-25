"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiAlertCircle, FiLayers, FiArrowRight } from "react-icons/fi";
import ThemeToggle from "@/components/ThemeToggle";

export default function OnboardingPage() {
  const router = useRouter();

  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugMessage, setSlugMessage] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");

  // Cores iniciais para a vitrine do novo lojista
  const [primaryColor, setPrimaryColor] = useState("#084D6E");
  const [secondaryColor, setSecondaryColor] = useState("#00B4D8");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-gera slug limpo a partir do nome da loja
  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generatedSlug);
  };

  // Validação em tempo real do slug com debounce
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      setSlugMessage("");
      return;
    }

    const timer = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const res = await fetch(`/api/onboarding/check-slug?slug=${encodeURIComponent(slug)}`);
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          setSlugAvailable(data.available);
          setSlugMessage(data.message);
        }
      } catch (e) {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugAvailable === false) {
      setErrorMessage("Por favor, escolha um subdomínio disponível.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName,
          slug,
          owner_name: ownerName,
          owner_email: ownerEmail,
          owner_password: ownerPassword,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          whatsapp_phone: whatsappPhone,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        let msg = "Erro ao criar loja.";
        if (contentType.includes("application/json")) {
          try {
            const err = await res.json();
            msg = err.detail || msg;
          } catch (_) {}
        } else {
          try {
            const raw = await res.text();
            if (raw.toLowerCase().includes("internal server error")) {
              msg = "Erro interno no servidor ao registrar loja. Por favor, tente novamente.";
            } else {
              msg = raw.slice(0, 150) || msg;
            }
          } catch (_) {}
        }
        throw new Error(msg);
      }

      if (!contentType.includes("application/json")) {
        throw new Error("Resposta inesperada do servidor. Tente novamente.");
      }

      const data = await res.json();
      localStorage.setItem("saas_token", data.access_token);
      localStorage.setItem("active_tenant_slug", data.tenant_slug);

      // Redireciona para o painel admin
      router.push("/admin");
    } catch (err: any) {
      setErrorMessage(err.message || "Falha na criação da conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main py-8 sm:py-12 px-4 flex flex-col justify-between items-center transition-colors duration-200">
      {/* Topo / Navbar de Onboarding com Theme Toggle */}
      <header className="max-w-xl w-full flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            <FiLayers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold text-content-primary block leading-tight">
              SaaS E-commerce
            </span>
            <span className="text-[10px] uppercase tracking-wider text-content-secondary font-medium block">
              Multi-Tenant Cloud
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/admin/login"
            className="text-xs font-semibold text-content-secondary hover:text-brand-primary transition-colors hidden sm:inline-block"
          >
            Já tem conta? Entrar
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-3">
            <span>✨</span>
            <span>Crie sua Loja Virtual em Poucos Segundos</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
            Comece a Vender Online Hoje
          </h1>
          <p className="text-sm text-content-secondary mt-1.5 max-w-md mx-auto">
            E-commerce completo com catálogo, atacado progressivo, personalização de produtos e pagamentos integrados.
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="surface-card p-6 sm:p-8 border border-border-theme bg-bg-surface rounded-xl shadow-sm">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-status-error/30 rounded-lg flex items-start gap-2.5 text-xs font-medium text-status-error">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Seção 1: Dados da Loja */}
            <div>
              <label className="block text-xs font-semibold text-content-primary mb-1.5">
                Nome da Loja <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Minha Loja Criativa"
                value={storeName}
                onChange={(e) => handleStoreNameChange(e.target.value)}
                className="input-theme w-full"
              />
            </div>

            {/* Subdomínio com Validação em Tempo Real */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-content-primary">
                  Subdomínio Desejado <span className="text-status-error">*</span>
                </label>
                {slugChecking && (
                  <span className="text-[11px] text-content-secondary animate-pulse">
                    Verificando disponibilidade...
                  </span>
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  required
                  placeholder="minhaloja"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="input-theme flex-1 rounded-r-none border-r-0"
                />
                <span className="bg-bg-subtle border border-border-theme px-3 py-2 text-xs font-semibold text-content-secondary rounded-r-lg select-none">
                  .seusistema.com.br
                </span>
              </div>

              {slugMessage && (
                <div
                  className={`mt-1.5 text-xs font-medium flex items-center gap-1.5 ${
                    slugAvailable ? "text-status-success" : "text-status-error"
                  }`}
                >
                  {slugAvailable ? (
                    <FiCheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>{slugMessage}</span>
                </div>
              )}
            </div>

            {/* Seção 2: Identidade Visual da Loja */}
            <div className="pt-4 border-t border-border-theme">
              <div className="mb-2.5">
                <label className="block text-xs font-semibold text-content-primary">
                  Identidade Visual da Loja
                </label>
                <p className="text-[11px] text-content-secondary">
                  Defina as cores padrão da sua vitrine. Você poderá trocar o tema e as cores a qualquer momento no painel.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3 rounded-lg border border-border-theme bg-bg-subtle/50">
                  <span className="text-[11px] text-content-secondary font-medium block mb-1.5">
                    Cor Primária (Topo e Destaques)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded border border-border-theme cursor-pointer bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="input-theme flex-1 text-xs uppercase font-mono py-1.5"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border-theme bg-bg-subtle/50">
                  <span className="text-[11px] text-content-secondary font-medium block mb-1.5">
                    Cor Secundária (Botões de Ação)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-9 h-9 rounded border border-border-theme cursor-pointer bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="input-theme flex-1 text-xs uppercase font-mono py-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 3: Dados de Acesso */}
            <div className="pt-4 border-t border-border-theme space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-content-primary mb-1.5">
                  Seu Nome Completo <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="input-theme w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    E-mail de Login <span className="text-status-error">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="carlos@exemplo.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Senha de Acesso <span className="text-status-error">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 dígitos"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="input-theme w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-content-primary mb-1.5">
                  WhatsApp Comercial (p/ Notificações de Venda)
                </label>
                <input
                  type="text"
                  placeholder="5511999999999"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="input-theme w-full"
                />
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || slugAvailable === false}
                className="btn-brand w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-lg disabled:opacity-50"
              >
                {loading ? (
                  <span>Criando Sua Loja...</span>
                ) : (
                  <>
                    <span>Criar Minha Loja Agora</span>
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Rodapé do Form */}
        <div className="text-center mt-6 text-xs text-content-secondary">
          Já possui uma loja cadastrada?{" "}
          <Link href="/admin/login" className="font-semibold text-brand-primary hover:underline">
            Acessar o Painel de Gestão
          </Link>
        </div>
      </main>

      {/* Footer simples */}
      <footer className="mt-8 text-center text-xs text-content-secondary">
        &copy; {new Date().getFullYear()} SaaS Multi-Tenant. Todos os direitos reservados.
      </footer>
    </div>
  );
}
