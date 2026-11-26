"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiAlertCircle,
  FiArrowRight,
  FiBriefcase,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import StorefrontShell from "@/components/StorefrontShell";
import {
  fetchApi,
  fetchCustomerApi,
  setCustomerToken,
  TenantInfo,
} from "@/lib/api";
import { getActiveTheme, getThemeClasses, StorefrontTheme } from "@/lib/themeTokens";
import {
  isValidCNPJ,
  isValidCPF,
  maskCNPJ,
  maskCPF,
  maskPhone,
  sanitizeRedirectPath,
} from "@/lib/masks";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTarget = sanitizeRedirectPath(redirectParam, "/minha-conta/pedidos");

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [theme, setTheme] = useState<StorefrontTheme>("modern_commerce");

  const [personType, setPersonType] = useState<"PF" | "PJ">("PF");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [stateTaxId, setStateTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handlePersonTypeChange = (type: "PF" | "PJ") => {
    setPersonType(type);
    setTaxId("");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (personType === "PF" && !isValidCPF(taxId)) {
      setErrorMsg("CPF inválido. Verifique os dígitos informados.");
      return;
    }
    if (personType === "PJ") {
      if (!companyName.trim()) {
        setErrorMsg("Informe a Razão Social da empresa.");
        return;
      }
      if (!isValidCNPJ(taxId)) {
        setErrorMsg("CNPJ inválido. Verifique os dígitos informados.");
        return;
      }
    }
    if (password.length < 6) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchCustomerApi("/storefront/auth/register", {
        method: "POST",
        body: JSON.stringify({
          person_type: personType,
          full_name: fullName.trim(),
          company_name: personType === "PJ" ? companyName.trim() : null,
          tax_id: taxId,
          state_tax_id: personType === "PJ" && stateTaxId.trim() ? stateTaxId.trim() : null,
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Não foi possível concluir o cadastro.");
      }

      setCustomerToken(data.access_token);
      router.push(redirectTarget);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const loginHref = redirectParam
    ? `/conta/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/conta/login";

  return (
    <StorefrontShell tenant={tenant} themeOverride={theme}>
      <div className="max-w-lg mx-auto py-4 sm:py-8">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Criar Minha Conta
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Cadastre-se como Pessoa Física ou Empresa (CNPJ) para agilizar seus pedidos.
          </p>
        </div>

        <div className={classes.card}>
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seletor PF / PJ */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => handlePersonTypeChange("PF")}
              className={personType === "PF" ? classes.radioCardActive : classes.radioCard}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <FiUser className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Pessoa Física</span>
              </div>
              <p className="text-[11px] opacity-70 mt-0.5 text-left">Cadastro com CPF</p>
            </button>

            <button
              type="button"
              onClick={() => handlePersonTypeChange("PJ")}
              className={personType === "PJ" ? classes.radioCardActive : classes.radioCard}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <FiBriefcase className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Pessoa Jurídica</span>
              </div>
              <p className="text-[11px] opacity-70 mt-0.5 text-left">Cadastro com CNPJ</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {personType === "PJ" && (
              <>
                <div>
                  <label className={classes.inputLabel}>Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Empresa Exemplo Ltda"
                    className={classes.input}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={classes.inputLabel}>CNPJ *</label>
                    <input
                      type="text"
                      required
                      value={taxId}
                      onChange={(e) => setTaxId(maskCNPJ(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      className={classes.input}
                    />
                  </div>
                  <div>
                    <label className={classes.inputLabel}>Inscrição Estadual (opcional)</label>
                    <input
                      type="text"
                      value={stateTaxId}
                      onChange={(e) => setStateTaxId(e.target.value)}
                      placeholder="Isento ou número"
                      className={classes.input}
                    />
                  </div>
                </div>
              </>
            )}

            <div className={personType === "PF" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}>
              <div>
                <label className={classes.inputLabel}>
                  {personType === "PJ" ? "Nome do Responsável *" : "Nome Completo *"}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={personType === "PJ" ? "Nome de quem realiza o pedido" : "Seu nome completo"}
                  className={classes.input}
                />
              </div>

              {personType === "PF" && (
                <div>
                  <label className={classes.inputLabel}>CPF *</label>
                  <input
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => setTaxId(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className={classes.input}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={classes.inputLabel}>WhatsApp / Celular *</label>
                <div className="relative">
                  <FiPhone className="w-4 h-4 opacity-45 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className={`${classes.input} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className={classes.inputLabel}>E-mail *</label>
                <div className="relative">
                  <FiMail className="w-4 h-4 opacity-45 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com.br"
                    className={`${classes.input} pl-10`}
                    autoComplete="email"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={classes.inputLabel}>Senha de Acesso (mín. 6 caracteres) *</label>
              <div className="relative">
                <FiLock className="w-4 h-4 opacity-45 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha segura"
                  className={`${classes.input} pl-10 pr-10`}
                  autoComplete="new-password"
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
              <span>{loading ? "Criando conta..." : "Concluir Cadastro"}</span>
              {!loading && <FiArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className={`mt-6 pt-5 border-t ${classes.divider} text-center`}>
            <p className="text-xs opacity-75">
              Já possui uma conta?{" "}
              <Link href={loginHref} className="font-bold text-[var(--color-primary)] hover:underline">
                Entrar agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </StorefrontShell>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs">Carregando...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
