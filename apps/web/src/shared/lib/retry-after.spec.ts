import { ApiError } from '@/shared/http/api-error';
import { formatWait, retryAfterOf } from './retry-after';

describe('retryAfterOf', () => {
  it('reads the wait the api sent with a refused attempt', () => {
    expect(retryAfterOf(new ApiError(429, null, 'Muitas tentativas.', 840))).toBe(840);
  });

  // Recusado sem dizer quanto esperar: a tela ainda precisa travar o botão.
  it('assumes a minute when the refusal does not say how long', () => {
    expect(retryAfterOf(new ApiError(429, null, 'Muitas tentativas.'))).toBe(60);
  });

  it('has no wait for any other failure', () => {
    expect(retryAfterOf(new ApiError(400, null, 'Senha incorreta.', 840))).toBeNull();
    expect(retryAfterOf(new Error('ECONNREFUSED'))).toBeNull();
  });
});

describe('formatWait', () => {
  it.each([
    [899, '14:59'],
    [60, '1:00'],
    [9, '0:09'],
    [0, '0:00'],
  ])('shows %i seconds as %s', (seconds, shown) => {
    expect(formatWait(seconds)).toBe(shown);
  });
});
