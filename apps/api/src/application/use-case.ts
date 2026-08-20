/**
 * A forma única de um caso de uso: um `execute`, uma entrada, uma saída.
 * Nenhum código trata use case genericamente — o contrato existe para o
 * compilador recusar o próximo que nascer com `handle` ou `run`.
 *
 * Use case sem entrada declara `UseCase<void, T>` e implementa `execute()` sem
 * parâmetro: TypeScript aceita o método mais curto e deixa omitir o argumento.
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
