/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignora erros de build (já tínhamos isso)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // --- LIBERAÇÃO PARA O BITRIX24 (IFRAME) ---
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Permite que o Bitrix coloque seu site dentro dele
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.bitrix24.com.br https://*.bitrix24.com https://*.bitrix24.eu",
          },
          // Fallback para navegadores mais antigos
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
};

export default nextConfig;