"use client";

import React, { useState } from "react";
import { CustomizationFieldItem, fetchApi } from "@/lib/api";
import { FiUploadCloud, FiCheck, FiX } from "react-icons/fi";

interface Props {
  fields: CustomizationFieldItem[];
  values: Record<string, string>;
  onChange: (fieldKey: string, value: string) => void;
}

export default function DynamicCustomizationFields({ fields, values, onChange }: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  if (!fields || fields.length === 0) return null;

  const handleFileUpload = async (fieldKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(fieldKey);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchApi("/uploads?folder=custom_uploads", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao enviar arquivo.");
      }
      const data = await res.json();
      onChange(fieldKey, data.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <div className="p-5 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2.5">
        <span className="font-bold text-sm text-neutral-900">
          🎨 Personalize seu Produto
        </span>
        <span className="text-[11px] text-neutral-500">
          Campos configurados pela loja
        </span>
      </div>

      <div className="space-y-3.5">
        {fields.map((cf, idx) => {
          const key = cf.id || String(idx);
          const val = values[key] || "";
          const extra = Number(cf.additional_price || 0);

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-neutral-800">
                  {cf.label}
                  {cf.is_required && <span className="text-rose-600 ml-1">*</span>}
                </label>
                {extra > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    + R$ {extra.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>

              {cf.field_type === "TEXT" && (
                <div>
                  <input
                    type="text"
                    maxLength={cf.max_length || undefined}
                    value={val}
                    onChange={(e) => onChange(key, e.target.value)}
                    placeholder={cf.placeholder || "Digite aqui..."}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  {cf.max_length && (
                    <span className="text-[10px] text-neutral-400 block text-right mt-0.5">
                      {val.length}/{cf.max_length}
                    </span>
                  )}
                </div>
              )}

              {cf.field_type === "TEXTAREA" && (
                <div>
                  <textarea
                    rows={3}
                    maxLength={cf.max_length || undefined}
                    value={val}
                    onChange={(e) => onChange(key, e.target.value)}
                    placeholder={cf.placeholder || "Descreva os detalhes..."}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                  />
                  {cf.max_length && (
                    <span className="text-[10px] text-neutral-400 block text-right mt-0.5">
                      {val.length}/{cf.max_length}
                    </span>
                  )}
                </div>
              )}

              {cf.field_type === "SELECT" && (
                <select
                  value={val}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Selecione uma opção...</option>
                  {(cf.options || []).map((opt, oIdx) => (
                    <option key={oIdx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {cf.field_type === "COLOR_SWATCH" && (
                <div className="flex flex-wrap gap-2">
                  {(cf.options || []).map((opt, oIdx) => {
                    const selected = val === opt;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => onChange(key, selected ? "" : opt)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          selected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-xs"
                            : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {cf.field_type === "FILE_UPLOAD" && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold cursor-pointer inline-flex items-center gap-1.5">
                    <FiUploadCloud className="w-4 h-4 text-[var(--color-primary)]" />
                    <span>{uploadingKey === key ? "Enviando..." : val ? "Trocar Arquivo" : "Enviar Arquivo / Logo"}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.svg,.ai,.cdr"
                      className="hidden"
                      onChange={(e) => handleFileUpload(key, e)}
                    />
                  </label>

                  {val && (
                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <FiCheck className="w-3.5 h-3.5" />
                      <a href={val} target="_blank" className="underline font-medium">
                        Arquivo anexado
                      </a>
                      <button
                        type="button"
                        onClick={() => onChange(key, "")}
                        className="text-rose-600 ml-1"
                        title="Remover"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
