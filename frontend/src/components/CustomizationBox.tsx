"use client";

import React, { useState } from "react";
import { ProductItem } from "@/lib/api";

interface CustomizationBoxProps {
  product: ProductItem;
  customText: string;
  onCustomTextChange: (text: string) => void;
  artworkUrl?: string;
  artworkFilename?: string;
  onArtworkUploaded: (url: string, filename: string) => void;
  onArtworkRemoved: () => void;
}

export default function CustomizationBox({
  product,
  customText,
  onCustomTextChange,
  artworkUrl,
  artworkFilename,
  onArtworkUploaded,
  onArtworkRemoved,
}: CustomizationBoxProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!product.enable_text_customization && !product.enable_artwork_upload) {
    return null;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Falha no envio do arquivo");
      }

      const data = await res.json();
      onArtworkUploaded(data.url, data.filename);
    } catch (err: any) {
      setUploadError(err.message || "Erro ao fazer upload da arte.");
    } finally {
      setUploading(false);
    }
  };

  const maxLen = product.text_max_length || 40;

  return (
    <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-4">
      <div className="flex items-center gap-2 border-b border-neutral-200/60 pb-3">
        <span className="text-xl">🎨</span>
        <div>
          <h4 className="font-heading text-xs font-bold uppercase tracking-tight text-neutral-900">
            Personalize seu Produto
          </h4>
          <span className="text-[11px] text-neutral-500">
            Grave seu nome, frase ou anexe a identidade da sua marca
          </span>
        </div>
      </div>

      {/* 1. Campo de Texto */}
      {product.enable_text_customization && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-neutral-800">
              {product.text_customization_label || "Nome ou Frase para Gravação:"}
            </label>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                customText.length >= maxLen
                  ? "bg-rose-100 text-rose-700"
                  : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {customText.length}/{maxLen} caracteres
            </span>
          </div>
          <input
            type="text"
            maxLength={maxLen}
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder="Ex: Pedro Silva / Diretoria Comercial"
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
          />
          <p className="text-[10px] text-neutral-500">
            Esta frase será impressa ou gravada a laser exatamente como digitada acima.
          </p>
        </div>
      )}

      {/* 2. Upload de Logotipo ou Arte */}
      {product.enable_artwork_upload && (
        <div className="pt-2 border-t border-neutral-200/60 space-y-2">
          <label className="block text-xs font-semibold text-neutral-800">
            Envie seu Logotipo ou Arte (Vetor ou Imagem):
          </label>

          {artworkUrl ? (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-lg">📄</span>
                <span className="text-xs font-semibold text-emerald-900 truncate max-w-[200px]">
                  {artworkFilename || "arte-anexada.png"}
                </span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                  ANEXADO
                </span>
              </div>
              <button
                type="button"
                onClick={onArtworkRemoved}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 transition-colors"
              >
                Remover
              </button>
            </div>
          ) : (
            <div>
              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-300 rounded-xl bg-white hover:border-[var(--color-primary)] hover:bg-neutral-50/50 cursor-pointer transition-all">
                <span className="text-2xl mb-1">⬆️</span>
                <span className="text-xs font-semibold text-neutral-800">
                  {uploading ? "Enviando arquivo..." : "Clique para escolher o arquivo"}
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">
                  Formatos aceitos: PNG, JPG, SVG, PDF (Máx. 10MB)
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {uploadError && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{uploadError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
