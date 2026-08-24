import 'server-only';

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Copie apps/web/.env.example para .env.local.`,
    );
  }

  return value;
}

/**
 * Leitura preguiçosa de propósito: avaliar no topo do módulo quebraria o
 * `next build`, que importa a árvore inteira sem as variáveis de runtime.
 */
export const env = {
  get apiBaseUrl(): string {
    return required('API_BASE_URL');
  },

  get isMockingApi(): boolean {
    return process.env.API_MOCKING === 'enabled';
  },
};
