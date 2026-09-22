import { couponShareMessage, shareOrCopy } from './coupon-share';

describe('couponShareMessage', () => {
  it('tells the discount the code gives', () => {
    expect(couponShareMessage('MARINA10', 10)).toBe(
      'Use o meu cupom MARINA10 na Porto Serviço e ganhe 10% de desconto.',
    );
  });

  /* Sem o percentual, a frase não pode prometer um desconto que ninguém fixou. */
  it('promises no discount it does not know', () => {
    expect(couponShareMessage('MARINA10', null)).toBe('Use o meu cupom MARINA10 na Porto Serviço.');
  });
});

describe('shareOrCopy', () => {
  function clipboard() {
    return { writeText: jest.fn().mockResolvedValue(undefined) };
  }

  it('opens the share sheet of the device when there is one', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    const copy = clipboard();

    await expect(shareOrCopy('texto', { share, clipboard: copy })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'texto' });
    expect(copy.writeText).not.toHaveBeenCalled();
  });

  /* O navegador de mesa quase nunca tem `share`: o botão não pode morrer ali. */
  it('copies the message when the device cannot share', async () => {
    const copy = clipboard();

    await expect(shareOrCopy('texto', { clipboard: copy })).resolves.toBe('copied');
    expect(copy.writeText).toHaveBeenCalledWith('texto');
  });

  /* Fechar a folha de compartilhamento é desistir, não falhar. */
  it('treats a closed share sheet as a change of mind', async () => {
    const share = jest.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError'));

    await expect(shareOrCopy('texto', { share, clipboard: clipboard() })).resolves.toBe(
      'cancelled',
    );
  });

  it('falls back to copying when sharing breaks for another reason', async () => {
    const share = jest.fn().mockRejectedValue(new DOMException('negado', 'NotAllowedError'));
    const copy = clipboard();

    await expect(shareOrCopy('texto', { share, clipboard: copy })).resolves.toBe('copied');
  });

  /* Em HTTP simples o `clipboard` nem existe, e a chamada estouraria calada. */
  it('fails out loud when there is neither a share sheet nor a clipboard', async () => {
    await expect(shareOrCopy('texto', {})).resolves.toBe('failed');
  });
});
