/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@porto/contracts'],
  poweredByHeader: false,
  experimental: {
    // O Server Action do cadastro recebe cinco campos curtos; 1MB é folga de sobra
    // e fecha a porta para corpo grande em rota pública.
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default nextConfig;
