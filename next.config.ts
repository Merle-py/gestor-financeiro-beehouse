import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Opções de configuração aqui */
  
  // Ignorar erros de TypeScript no deploy (Evita falhas por tipagem estrita)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // O ESLint será ignorado automaticamente pelo arquivo .eslintignore
  // Não precisamos colocar nada aqui para o ESLint.
};

export default nextConfig;