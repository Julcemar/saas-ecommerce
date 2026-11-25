import React from "react";
import Link from "next/link";
import { TenantInfo } from "@/lib/api";

export default function Footer({ tenant }: { tenant?: TenantInfo | null }) {
  const storeName = tenant?.name || "JESTEIN PERSONALIZADOS";

  return (
    <footer className="bg-white border-t-2 border-black mt-auto">
      {/* 4 Pilares de Confiança */}
      <div className="border-b-2 border-black bg-[#F4F7FA] py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-4 border-2 border-black rounded-lg bg-white shadow-[3px_3px_0px_#111111]">
            <div className="text-2xl mb-1">🤝</div>
            <h4 className="font-heading font-bold text-sm">Fortaleça Conexões</h4>
            <p className="text-xs text-gray-600 mt-1">Brindes corporativos de alto padrão que valorizam sua marca.</p>
          </div>
          <div className="p-4 border-2 border-black rounded-lg bg-white shadow-[3px_3px_0px_#111111]">
            <div className="text-2xl mb-1">⚡</div>
            <h4 className="font-heading font-bold text-sm">Desconto Progressivo</h4>
            <p className="text-xs text-gray-600 mt-1">Compre em maior volume e pague muito menos por unidade.</p>
          </div>
          <div className="p-4 border-2 border-black rounded-lg bg-white shadow-[3px_3px_0px_#111111]">
            <div className="text-2xl mb-1">🎨</div>
            <h4 className="font-heading font-bold text-sm">Arte Aprovada</h4>
            <p className="text-xs text-gray-600 mt-1">Validação digital antes da impressão física industrial.</p>
          </div>
          <div className="p-4 border-2 border-black rounded-lg bg-white shadow-[3px_3px_0px_#111111]">
            <div className="text-2xl mb-1">🚚</div>
            <h4 className="font-heading font-bold text-sm">Envio Rastreado</h4>
            <p className="text-xs text-gray-600 mt-1">Logística para todo o território nacional com seguro de carga.</p>
          </div>
        </div>
      </div>

      {/* Rodapé institucional */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="bg-black text-[#FFD100] inline-block px-3 py-1 font-heading text-lg font-bold border-2 border-black mb-3">
            {storeName}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Plataforma de comércio eletrônico especializada em brindes personalizados, gravação a laser e kits corporativos sob demanda.
          </p>
        </div>

        <div>
          <h4 className="font-heading text-sm font-bold uppercase mb-3">Formas de Pagamento</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge-pop bg-[#7AC943] text-black">⚡ Pix Instantâneo</span>
            <span className="badge-pop bg-white text-black">💳 Cartão de Crédito 12x</span>
            <span className="badge-pop bg-white text-black">📄 Boleto B2B Faturado</span>
          </div>
        </div>

        <div>
          <h4 className="font-heading text-sm font-bold uppercase mb-3">Ambiente SaaS</h4>
          <p className="text-xs text-gray-600 mb-2">
            Loja operando em infraestrutura multi-tenant com alta velocidade e isolamento seguro.
          </p>
          <div className="flex items-center gap-2">
            <Link href="/onboarding" className="text-xs font-bold text-primary hover:underline">
              → Crie sua Loja Virtual em Minutos
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] text-gray-400 text-xs text-center py-3 border-t border-black">
        © 2026 {storeName}. Todos os direitos reservados. Powered by Antigravity SaaS Core.
      </div>
    </footer>
  );
}
