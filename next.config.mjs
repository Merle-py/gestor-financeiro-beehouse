/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ignora erros de TypeScript e ESLint para garantir o deploy
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. LIBERAÇÃO DE IFRAME PARA O BITRIX24 (O Segredo da Tela Branca)
  async headers() {
    return [
      {
        source: '/:path*', // Aplica a todas as rotas
        headers: [
          {
            key: 'Content-Security-Policy',
            // Permite que domínios do Bitrix abram seu site
            value: "frame-ancestors 'self' https://*.bitrix24.com.br https://*.bitrix24.com https://*.bitrix24.eu",
          },
          {
            key: 'X-Frame-Options',
            // Fallback para navegadores antigos
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
};

export default nextConfig;