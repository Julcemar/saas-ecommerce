import React from "react";
import Link from "next/link";
import { ProductItem } from "@/lib/api";

interface ProductCardProps {
  product: ProductItem;
}

export default function ProductCard({ product }: ProductCardProps) {
  // Preço mínimo das faixas de atacado se houver
  const lowestPrice = product.wholesale_tiers?.length > 0
    ? Math.min(...product.wholesale_tiers.map((t) => Number(t.unit_price)))
    : Number(product.base_price);

  return (
    <div className="storefront-card-interactive rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden group">
      {/* Imagem do Produto */}
      <div className="relative aspect-square bg-slate-50/70 border-b border-slate-100 overflow-hidden p-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-100 rounded-xl">
            📦
          </div>
        )}

        {/* Badge de Destaque usando --brand-secondary */}
        {product.badge_label && (
          <span
            style={{
              backgroundColor: "var(--brand-secondary)",
              color: "var(--brand-text-on-secondary)",
            }}
            className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs"
          >
            {product.badge_label}
          </span>
        )}

        {/* Prazo de Produção */}
        {product.production_lead_time_days > 0 && (
          <span className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
            +{product.production_lead_time_days}d úteis
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            SKU: {product.sku}
          </span>
          <h3 className="font-heading text-sm font-bold text-slate-900 group-hover:text-[var(--brand-primary)] line-clamp-2 mt-1 leading-snug transition-colors">
            {product.name}
          </h3>
          {product.short_description && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
              {product.short_description}
            </p>
          )}
        </div>

        {/* Preços e Atacado */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500">
            Preço unitário base: <span className="line-through">R$ {Number(product.base_price).toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold text-[var(--brand-primary)]">No Atacado:</span>
            <span className="font-heading text-lg font-black text-slate-900">
              R$ {lowestPrice.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-[10px] text-slate-500">/un.</span>
          </div>

          <Link
            href={`/produto/${product.slug}`}
            className="storefront-cta-btn w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center"
          >
            Personalizar & Comprar
          </Link>
        </div>
      </div>
    </div>
  );
}
