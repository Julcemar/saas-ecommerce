import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SaaS Multi-Tenant de E-commerce & Personalizados",
  description: "Plataforma de alta conversão para produtos personalizados e brindes corporativos com atacado progressivo.",
};

const themeScript = `
  (function() {
    try {
      var savedTheme = localStorage.getItem('saas_theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', activeTheme);
      if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-bg-main text-content-primary antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
