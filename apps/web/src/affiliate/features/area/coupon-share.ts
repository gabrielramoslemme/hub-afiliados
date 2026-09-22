export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** O pedaço do `navigator` que compartilhar usa — injetado para o teste. */
export interface ShareDevice {
  share?: (data: { text: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export function couponShareMessage(code: string, discountPercent: number | null): string {
  const discount = discountPercent === null ? '' : ` e ganhe ${discountPercent}% de desconto`;

  return `Use o meu cupom ${code} na Porto Serviço${discount}.`;
}

/** Em HTTP simples o `clipboard` não existe: a falha volta como resultado, não estoura. */
export async function copyText(text: string, device: ShareDevice): Promise<ShareOutcome> {
  try {
    if (!device.clipboard) return 'failed';

    await device.clipboard.writeText(text);

    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * No celular abre a folha de compartilhamento do aparelho, que é onde estão o
 * WhatsApp e o Instagram. Onde ela não existe — quase todo navegador de mesa —,
 * ou quando ela falha, a mensagem vai para a área de transferência: o botão
 * sempre faz alguma coisa.
 */
export async function shareOrCopy(text: string, device: ShareDevice): Promise<ShareOutcome> {
  if (!device.share) return copyText(text, device);

  try {
    await device.share({ text });

    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';

    return copyText(text, device);
  }
}
