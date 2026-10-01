import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  const NOW = Date.parse('2026-09-30T12:00:00.000Z');
  const MINUTE = 60_000;

  it('lets through up to the limit inside the window and refuses the next one', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: MINUTE });

    expect([1, 2, 3, 4].map(() => limiter.consume('203.0.113.7', NOW))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('counts each key on its own', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: MINUTE });

    expect(limiter.consume('203.0.113.7', NOW)).toBe(true);
    expect(limiter.consume('198.51.100.10', NOW)).toBe(true);
    expect(limiter.consume('203.0.113.7', NOW)).toBe(false);
  });

  it('starts counting again once the window is over', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: MINUTE });

    limiter.consume('203.0.113.7', NOW);

    expect(limiter.consume('203.0.113.7', NOW + MINUTE - 1)).toBe(false);
    expect(limiter.consume('203.0.113.7', NOW + MINUTE)).toBe(true);
  });
});
