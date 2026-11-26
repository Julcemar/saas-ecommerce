"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiUserPlus,
} from "react-icons/fi";
import StorefrontShell from "@/components/StorefrontShell";
import {
  fetchApi,
  fetchCustomerApi,
  setCustomerToken,
  TenantInfo,
} from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";
import { sanitizeRedirectPath } from "@/lib/masks";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTarget = sanitizeRedirectPath(redirectParam, "/minha-conta/pedidos");

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [theme, setTheme] = useState<StorefrontTheme>("modern_commerce");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fluxo "Esqueci minha senha"
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "reset">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchApi("/tenant/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((tData) => {
        if (tData) {
          setTenant(tData);
          setTheme(getActiveTheme(tData));
        }
      })
      .catch(() => {});
  }, []);

  const classes = getThemeClasses(theme);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchCustomerApi("/storefront/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "E-mail ou senha incorretos.");
      }
      setCustomerToken(data.access_token);
      router.push(redirectTarget);
    } catch (err: any) {
      setErrorMsg(err.message || "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setForgotMsg(null);
    try {
      const res = await fetchCustomerApi("/storefront/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao solicitar recuperação.");
      }
      setForgotMsg(data.message);
      if (data.dev_reset_token) {
        setResetToken(data.dev_reset_token);
      }
      setForgotStep("reset");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setForgotMsg(null);
    try {
      const res = await fetchCustomerApi("/storefront/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: resetToken.trim(),
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao redefinir senha.");
      }
      setForgotMode(false);
      setForgotStep("email");
      setEmail(forgotEmail);
      setPassword("");
      setForgotMsg(data.message || "Senha redefinida com sucesso!");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const registerHref = redirectParam
    ? `/conta/cadastro?redirect=${encodeURIComponent(redirectParam)}`
    : "/conta/cadastro";

  return (
    <StorefrontShell tenant={tenant} themeOverride={theme}>
      <div className="max-w-md mx-auto py-4 sm:py-8">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {forgotMode ? "Recuperar Senha" : "Acesse sua Conta"}
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            {forgotMode
              ? "Informe seu e-mail para redefinir o acesso à loja."
              : "Acompanhe seus pedidos, artes personalizadas e endereços."}
          </p>
        </div>

        <div className={classes.card}>
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {forgotMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <FiCheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{forgotMsg}</span>
            </div>
          )}

          {!forgotMode ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={classes.inputLabel}>E-mail</label>
                <div className="relative">
                  <FiMail className="w-4 h-4 opacity-45 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    className={`${classes.input} pl-10`}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`${classes.inputLabel} mb-0`}>Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setForgotEmail(email);
                      setErrorMsg(null);
                      setForgotMsg(null);
                    }}
                    className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <FiLock className="w-4 h-4 opacity-45 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className={`${classes.input} pl-10 pr-10`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 opacity-60 hover:opacity-100 cursor-pointer"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`${classes.btnPrimary} w-full justify-center py-3`}
              >
                <span>{loading ? "Entrando..." : "Entrar na Minha Conta"}</span>
                {!loading && <FiArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : forgotStep === "email" ? (
            <form onSubmit={handleForgotRequest} className="space-y-4">
              <div>
                <label className={classes.inputLabel}>E-mail cadastrado</label>
                <div className="relative">
                  <FiMail className="w-4 h-4 opacity-45 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    className={`${classes.input} pl-10`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`${classes.btnPrimary} w-full justify-center py-3`}
              >
                {loading ? "Enviando..." : "Enviar código de recuperação"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setErrorMsg(null);
                }}
                className={`${classes.btnOutline} w-full justify-center`}
              >
                Voltar para o login
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={classes.inputLabel}>Código de Recuperação</label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Cole o código recebido"
                  className={classes.input}
                />
              </div>

              <div>
                <label className={classes.inputLabel}>Nova Senha (mín. 6 caracteres)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className={classes.input}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`${classes.btnPrimary} w-full justify-center py-3`}
              >
                {loading ? "Salvando..." : "Redefinir Senha"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setForgotStep("email");
                  setErrorMsg(null);
                }}
                className={`${classes.btnOutline} w-full justify-center`}
              >
                Cancelar
              </button>
            </form>
          )}

          {/* Destaque para Criar Minha Conta */}
          <div className={`mt-6 pt-5 border-t ${classes.divider} text-center space-y-3`}>
            <p className="text-xs opacity-75">Ainda não tem cadastro nesta loja?</p>
            <Link
              href={registerHref}
              className={`${classes.btnSecondary} w-full justify-center py-2.5`}
            >
              <FiUserPlus className="w-4 h-4" />
              <span>Criar minha conta</span>
            </Link>
          </div>
        </div>
      </div>
    </StorefrontShell>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs">Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
