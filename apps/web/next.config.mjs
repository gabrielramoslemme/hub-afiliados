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
    serverActions: {
      // O Server Action do cadastro recebe cinco campos curtos; 1MB é folga de
      // sobra e fecha a porta para corpo grande em rota pública.
      bodySizeLimit: '1mb',
      /**
       * Atrás de proxy (CloudFront, e a Imperva na frente dele) o Next compara
       * o header `Origin` com `X-Forwarded-Host` e aborta a ação quando
       * divergem — `Invalid Server Actions request`, HTTP 500. Sem esta lista,
       * as sete actions do app quebram: cadastro, os dois logins, definir
       * senha, aprovar/reprovar e os dois logouts. A tela carrega e nada
       * funciona, que é o pior formato de falha.
       *
       * Lido em runtime: o servidor do standalone avalia este arquivo ao subir,
       * então o host entra por env e não fica embutido na imagem.
       */
      allowedOrigins: [process.env.PUBLIC_DOMAIN_NAME].filter(Boolean),
    },
  },
};

export default nextConfig;
