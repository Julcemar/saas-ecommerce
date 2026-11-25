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
    <div className="card-comic flex flex-col overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#111111] transition-all duration-150">
      {/* Imagem do Produto */}
      <div className="relative aspect-square bg-gray-100 border-b-2 border-black overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-200">
            📦
          </div>
        )}

        {/* Badge Pop-Art */}
        {product.badge_label && (
          <span className="absolute top-2 left-2 badge-pop bg-[#FFD100] text-black">
            🔥 {product.badge_label}
          </span>
        )}

        {/* Prazo de Produção */}
        {product.production_lead_time_days > 0 && (
          <span className="absolute bottom-2 right-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white">
            ⏱ +{product.production_lead_time_days}d úteis
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
            SKU: {product.sku}
          </span>
          <h3 className="font-heading text-sm font-bold line-clamp-2 mt-1 leading-snug">
            {product.name}
          </h3>
          {product.short_description && (
            <p className="text-xs text-gray-600 line-clamp-2 mt-1">
              {product.short_description}
            </p>
          )}
        </div>

        {/* Preços e Atacado */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-[11px] text-gray-500">
            Preço unitário base: <span className="line-through">R$ {Number(product.base_price).toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold text-[#D92027]">No Atacado:</span>
            <span className="font-heading text-lg font-black text-black">
              R$ {lowestPrice.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-[10px] text-gray-500">/un.</span>
          </div>

          <Link
            href={`/produto/${product.slug}`}
            className="btn-primary w-full mt-3 text-xs py-2"
          >
            Personalizar & Comprar
          </Link>
        </div>
      </div>
    </div>
  );
}
