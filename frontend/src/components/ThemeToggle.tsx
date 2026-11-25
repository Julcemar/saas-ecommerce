"use client";

import React, { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Recupera tema salvo ou detecta do sistema operacional
    const savedTheme = localStorage.getItem("saas_theme") as "light" | "dark" | null;
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("saas_theme", newTheme);
    const root = document.documentElement;
    root.setAttribute("data-theme", newTheme);
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
  };

  if (!mounted) {
    // Renderiza placeholder invisível com o mesmo tamanho para evitar layout shift durante hidratação
    return (
      <div className={`w-9 h-9 rounded-lg border border-transparent ${className}`} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={theme === "light" ? "Ativar Modo Escuro" : "Ativar Modo Claro"}
      title={theme === "light" ? "Alternar para Modo Escuro" : "Alternar para Modo Claro"}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border-theme bg-bg-surface hover:bg-bg-subtle text-content-primary shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary ${className}`}
    >
      {theme === "light" ? (
        <FiMoon className="w-4 h-4 text-content-secondary hover:text-brand-primary transition-colors" />
      ) : (
        <FiSun className="w-4 h-4 text-brand-secondary hover:text-amber-300 transition-colors" />
      )}
    </button>
  );
}
