"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiLayers, FiAlertCircle, FiArrowRight, FiLock, FiMail, FiCheck } from "react-icons/fi";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("julcemar@gmail.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (!res.ok) {
        let msg = "E-mail ou senha incorretos.";
        try {
          const err = await res.json();
          msg = err.detail || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      const data = await res.json();
      localStorage.setItem("saas_token", data.access_token);
      if (data.tenant_slug) {
        localStorage.setItem("active_tenant_slug", data.tenant_slug);
      }
      // Redireciona diretamente para o painel administrativo
      window.location.href = "/admin";
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setPresetUser = (presetEmail: string, presetSlug: string) => {
    setEmail(presetEmail);
    setPassword("123456");
    localStorage.setItem("active_tenant_slug", presetSlug);
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col justify-between items-center py-8 px-4 transition-colors duration-200">
      {/* Topo com Logo e Theme Toggle */}
      <header className="max-w-md w-full flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            <FiLayers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold text-content-primary block leading-tight">
              SaaS E-commerce
            </span>
            <span className="text-[10px] uppercase tracking-wider text-content-secondary font-medium block">
              Painel de Gestão
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Card de Login */}
      <main className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold text-content-primary">
            Acessar Gestão da Loja
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-1">
            Entre com suas credenciais de administrador.
          </p>
        </div>

        <div className="surface-card p-6 sm:p-8 bg-bg-surface border border-border-theme rounded-xl shadow-sm">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-status-error/30 rounded-lg flex items-start gap-2.5 text-xs font-medium text-status-error">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-content-primary mb-1.5">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <FiMail className="w-4 h-4 text-content-secondary absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seu-email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-theme w-full pl-9"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-content-primary mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <FiLock className="w-4 h-4 text-content-secondary absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-theme w-full pl-9"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-brand w-full py-2.5 text-sm font-semibold rounded-lg disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Acessar Painel</span>
                  <FiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Dicas de Acesso Rápido para Teste Local */}
          <div className="mt-5 pt-4 border-t border-border-theme">
            <span className="text-[10px] uppercase font-bold text-content-secondary block mb-2">
              Contas de Demonstração (Clique para Preencher):
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setPresetUser("julcemar@gmail.com", "julcemar")}
                className="p-2 rounded bg-bg-subtle hover:bg-brand-primary/10 border border-border-theme text-left transition-colors"
              >
                <div className="font-bold text-content-primary">Loja Julcemar</div>
                <div className="text-[10px] text-content-secondary">julcemar@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser("admin@jestein.com.br", "jestein")}
                className="p-2 rounded bg-bg-subtle hover:bg-brand-primary/10 border border-border-theme text-left transition-colors"
              >
                <div className="font-bold text-content-primary">Loja Jestein</div>
                <div className="text-[10px] text-content-secondary">admin@jestein.com.br</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-content-secondary">
          Ainda não tem uma loja virtual?{" "}
          <Link href="/onboarding" className="font-semibold text-brand-primary hover:underline">
            Crie sua conta agora
          </Link>
        </div>
      </main>

      <footer className="mt-8 text-center text-xs text-content-secondary">
        &copy; {new Date().getFullYear()} SaaS Multi-Tenant. Todos os direitos reservados.
      </footer>
    </div>
  );
}
