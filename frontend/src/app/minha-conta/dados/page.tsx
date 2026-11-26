"use client";

import React, { useEffect, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiLock, FiSave, FiUser } from "react-icons/fi";
import { useAccount } from "@/components/AccountShell";
import { fetchCustomerApi } from "@/lib/api";
import { getThemeClasses } from "@/lib/themeTokens";
import { isValidCNPJ, isValidCPF, maskCNPJ, maskCPF, maskPhone } from "@/lib/masks";

export default function MeusDadosPage() {
  const { customer, theme, refreshCustomer } = useAccount();
  const classes = getThemeClasses(theme);

  const [personType, setPersonType] = useState<"PF" | "PJ">("PF");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [stateTaxId, setStateTaxId] = useState("");
  const [phone, setPhone] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    const pt = (customer.person_type || "PF").toUpperCase() === "PJ" ? "PJ" : "PF";
    setPersonType(pt);
    setFullName(customer.full_name || "");
    setCompanyName(customer.company_name || "");
    setTaxId(customer.tax_id || "");
    setStateTaxId(customer.state_tax_id || "");
    setPhone(customer.phone || "");
  }, [customer]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);

    if (taxId) {
      if (personType === "PF" && !isValidCPF(taxId)) {
        setProfileErr("CPF inválido.");
        return;
      }
      if (personType === "PJ" && !isValidCNPJ(taxId)) {
        setProfileErr("CNPJ inválido.");
        return;
      }
    }

    setSavingProfile(true);
    try {
      const res = await fetchCustomerApi("/storefront/me", {
        method: "PUT",
        body: JSON.stringify({
          person_type: personType,
          full_name: fullName.trim(),
          company_name: personType === "PJ" ? companyName.trim() : null,
          tax_id: taxId || null,
          state_tax_id: personType === "PJ" ? stateTaxId.trim() || null : null,
          phone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Erro ao atualizar dados.");
      await refreshCustomer();
      setProfileMsg("Dados cadastrais atualizados com sucesso!");
    } catch (err: any) {
      setProfileErr(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    setPwdErr(null);

    if (newPassword.length < 6) {
      setPwdErr("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErr("A confirmação da nova senha não confere.");
      return;
    }

    setSavingPwd(true);
    try {
      const res = await fetchCustomerApi("/storefront/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Erro ao alterar senha.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMsg("Senha alterada com sucesso!");
    } catch (err: any) {
      setPwdErr(err.message);
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dados Cadastrais */}
      <div className={classes.card}>
        <div className={classes.cardHeader}>
          <h2 className={`${classes.cardTitle} flex items-center gap-2`}>
            <FiUser className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Meus Dados Cadastrais</span>
          </h2>
          <p className={classes.cardSubtitle}>
            Mantenha seus dados atualizados para agilizar o checkout e faturamento.
          </p>
        </div>

        {profileErr && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileErr}</span>
          </div>
        )}
        {profileMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <FiCheckCircle className="w-4 h-4 shrink-0" />
            <span>{profileMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setPersonType("PF");
                setTaxId("");
              }}
              className={personType === "PF" ? classes.btnPrimary : classes.btnOutline}
            >
              Pessoa Física (CPF)
            </button>
            <button
              type="button"
              onClick={() => {
                setPersonType("PJ");
                setTaxId("");
              }}
              className={personType === "PJ" ? classes.btnPrimary : classes.btnOutline}
            >
              Pessoa Jurídica (CNPJ)
            </button>
          </div>

          {personType === "PJ" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={classes.inputLabel}>Razão Social *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={classes.input}
                />
              </div>
              <div>
                <label className={classes.inputLabel}>Inscrição Estadual</label>
                <input
                  type="text"
                  value={stateTaxId}
                  onChange={(e) => setStateTaxId(e.target.value)}
                  className={classes.input}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={classes.inputLabel}>
                {personType === "PJ" ? "Responsável *" : "Nome Completo *"}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={classes.input}
              />
            </div>

            <div>
              <label className={classes.inputLabel}>
                {personType === "PJ" ? "CNPJ *" : "CPF *"}
              </label>
              <input
                type="text"
                required
                value={taxId}
                onChange={(e) =>
                  setTaxId(personType === "PJ" ? maskCNPJ(e.target.value) : maskCPF(e.target.value))
                }
                className={classes.input}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={classes.inputLabel}>WhatsApp / Celular *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                className={classes.input}
              />
            </div>
            <div>
              <label className={classes.inputLabel}>E-mail</label>
              <input
                type="email"
                disabled
                value={customer?.email || ""}
                className={`${classes.input} opacity-65 cursor-not-allowed`}
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={savingProfile} className={classes.btnPrimary}>
              <FiSave className="w-4 h-4" />
              <span>{savingProfile ? "Salvando..." : "Salvar Alterações"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Alteração de Senha */}
      <div className={classes.card}>
        <div className={classes.cardHeader}>
          <h2 className={`${classes.cardTitle} flex items-center gap-2`}>
            <FiLock className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Alterar Senha</span>
          </h2>
        </div>

        {pwdErr && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            <span>{pwdErr}</span>
          </div>
        )}
        {pwdMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <FiCheckCircle className="w-4 h-4 shrink-0" />
            <span>{pwdMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className={classes.inputLabel}>Senha Atual *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={classes.input}
            />
          </div>

          <div>
            <label className={classes.inputLabel}>Nova Senha (mín. 6 caracteres) *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={classes.input}
            />
          </div>

          <div>
            <label className={classes.inputLabel}>Confirmar Nova Senha *</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={classes.input}
            />
          </div>

          <button type="submit" disabled={savingPwd} className={classes.btnSecondary}>
            <FiLock className="w-4 h-4" />
            <span>{savingPwd ? "Atualizando..." : "Atualizar Senha"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
