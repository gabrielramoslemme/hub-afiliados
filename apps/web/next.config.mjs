/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@porto/contracts'],
  poweredByHeader: false,
  // Servidor mínimo, com só o que a aplicação usa. Sem isto a imagem carregaria
  // o `node_modules` inteiro do monorepo. Compatível com o middleware de
  // `/admin` — `standalone` é servidor completo, ao contrário de `export`.
  output: 'standalone',
  // O rastreamento precisa enxergar a raiz do monorepo: `@porto/contracts` é
  // symlink de workspace, e o padrão (a pasta do app) deixaria o pacote de fora.
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  experimental: {
    // O Server Action do cadastro recebe cinco campos curtos; 1MB é folga de sobra
    // e fecha a porta para corpo grande em rota pública.
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default nextConfig;
