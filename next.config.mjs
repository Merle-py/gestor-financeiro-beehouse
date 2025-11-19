/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignora verificação de erros de estilo
    ignoreDuringBuilds: true,
  },
  // Se houver erro de typescript, ignora também
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;