"use client";

import React from "react";
import { FiCheck } from "react-icons/fi";

interface OrderProgressBarProps {
  status: string;
  productionStatus: string;
}

const STEPS = [
  { key: "received", label: "Pedido Recebido" },
  { key: "artwork", label: "Arte em Aprovação" },
  { key: "production", label: "Em Produção" },
  { key: "shipped", label: "Enviado" },
  { key: "delivered", label: "Entregue" },
];

export function resolveOrderStepIndex(status: string, productionStatus: string): number {
  const s = (status || "").toLowerCase();
  const p = (productionStatus || "").toUpperCase();

  if (s === "delivered") return 4;
  if (s === "shipped" || p === "SHIPPED") return 3;
  if (p === "IN_PRODUCTION" || p === "QUALITY_PACKING" || p === "READY_TO_SHIP" || s === "in_production" || s === "ready_for_dispatch") {
    return 2;
  }
  if (p === "ART_APPROVAL" || s === "artwork_review" || s === "artwork_rejected") {
    return 1;
  }
  return 0;
}

export default function OrderProgressBar({ status, productionStatus }: OrderProgressBarProps) {
  const s = (status || "").toLowerCase();
  if (s === "cancelled" || s === "refunded") {
    return (
      <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
        {s === "refunded" ? "Pedido Reembolsado" : "Pedido Cancelado"}
      </div>
    );
  }

  const activeIndex = resolveOrderStepIndex(status, productionStatus);
  const progressPct = Math.round((activeIndex / (STEPS.length - 1)) * 100);

  return (
    <div className="w-full py-2">
      <div className="relative flex items-center justify-between">
        {/* Linha de fundo */}
        <div className="absolute left-0 right-0 top-3.5 h-1 bg-slate-200 rounded-full z-0" />
        {/* Linha de progresso */}
        <div
          className="absolute left-0 top-3.5 h-1 bg-[var(--color-primary)] rounded-full z-0 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />

        {STEPS.map((step, idx) => {
          const completed = idx <= activeIndex;
          const isCurrent = idx === activeIndex;
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center text-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                  completed
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "bg-white border-slate-300 text-slate-400"
                } ${isCurrent ? "ring-4 ring-[var(--color-primary)]/20" : ""}`}
              >
                {completed ? <FiCheck className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-[10px] sm:text-[11px] leading-tight max-w-[78px] ${
                  completed ? "font-bold opacity-100" : "font-medium opacity-55"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
