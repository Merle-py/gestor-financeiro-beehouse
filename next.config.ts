/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignora erros de lint durante o build para não travar o deploy
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;