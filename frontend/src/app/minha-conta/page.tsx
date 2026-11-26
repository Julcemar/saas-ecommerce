"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MinhaContaIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/minha-conta/pedidos");
  }, [router]);

  return (
    <div className="py-12 text-center text-xs opacity-60">
      Redirecionando para seus pedidos...
    </div>
  );
}
