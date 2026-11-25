import React from "react";
import { WholesaleTier } from "@/lib/api";

interface WholesaleTableProps {
  basePrice: number;
  tiers: WholesaleTier[];
  selectedQuantity: number;
  onSelectTierQuantity?: (qty: number) => void;
}

export default function WholesaleTable({
  basePrice,
  tiers,
  selectedQuantity,
  onSelectTierQuantity,
}: WholesaleTableProps) {
  if (!tiers || tiers.length === 0) return null;

  // Ordena por quantidade mínima
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  return (
    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-heading text-xs font-bold text-neutral-900 flex items-center gap-1.5">
          <span>⚡ Compre Mais e Pague Menos</span>
          <span className="text-[10px] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-2 py-0.5 rounded-full font-semibold">
            Tabela de Atacado
          </span>
        </h4>
        <span className="text-[11px] text-neutral-500">Descontos progressivos automáticos</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {sorted.map((tier, idx) => {
          const nextTier = sorted[idx + 1];
          const label = nextTier
            ? `${tier.min_quantity} a ${nextTier.min_quantity - 1} un.`
            : `${tier.min_quantity}+ un.`;

          const unitPrice = Number(tier.unit_price);
          const discountPct = Math.round(((basePrice - unitPrice) / basePrice) * 100);

          // Verifica se a quantidade atual está nesta faixa
          const isActive =
            selectedQuantity >= tier.min_quantity &&
            (!nextTier || selectedQuantity < nextTier.min_quantity);

          return (
            <div
              key={idx}
              onClick={() => onSelectTierQuantity && onSelectTierQuantity(tier.min_quantity)}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                isActive
                  ? "bg-white border-2 border-[var(--color-primary)] shadow-xs"
                  : "bg-white border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="text-[11px] font-semibold text-neutral-500">{label}</div>
              <div className="font-bold text-sm text-neutral-900 mt-0.5">
                R$ {unitPrice.toFixed(2).replace(".", ",")}
              </div>
              {discountPct > 0 && (
                <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                  -{discountPct}% OFF
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
