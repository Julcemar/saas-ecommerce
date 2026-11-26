export const PRODUCTION_STAGES = [
  { key: "NEW", label: "Entrada", fullLabel: "Entrada / Triagem", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700" },
  { key: "ART_APPROVAL", label: "Arte & Aprovação", fullLabel: "Arte & Aprovação", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
  { key: "IN_PRODUCTION", label: "Em Produção", fullLabel: "Em Produção", color: "bg-sky-500/10 text-[#084D6E] dark:text-sky-300 border-sky-300 dark:border-sky-700" },
  { key: "QUALITY_PACKING", label: "Acabamento", fullLabel: "Acabamento & Embalagem", color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700" },
  { key: "READY_TO_SHIP", label: "Pronto p/ Envio", fullLabel: "Pronto para Envio", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" },
  { key: "SHIPPED", label: "Enviado", fullLabel: "Enviado / Entregue", color: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700" },
] as const;

export const PAYMENT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PAID: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  paid: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  PENDING: { label: "Pendente", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  unpaid: { label: "Pendente", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  REFUNDED: { label: "Estornado", cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30" },
  CANCELLED: { label: "Cancelado", cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
};

export function getDeadlineBadge(dueDateStr?: string | null, productionStatus?: string) {
  if (productionStatus === "SHIPPED") {
    return { label: "Concluído", isCritical: false, cls: "bg-teal-500/10 text-teal-700 dark:text-teal-300" };
  }
  if (!dueDateStr) {
    return { label: "Sem prazo", isCritical: false, cls: "bg-bg-subtle text-content-secondary" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDateStr}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Atrasado (${Math.abs(diffDays)}d)`,
      isCritical: true,
      cls: "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30",
    };
  }
  if (diffDays === 0) {
    return {
      label: "Vence hoje",
      isCritical: true,
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
    };
  }
  return {
    label: `Entrega em ${diffDays}d`,
    isCritical: false,
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
}

export function isOrderArtReady(order: any): boolean {
  if (!order?.items || order.items.length === 0) return true;
  return order.items.every((it: any) => it.art_approved || it.artwork_status === "approved");
}
