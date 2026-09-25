import { buildAuditDiff } from './audit-diff.util';

describe('buildAuditDiff', () => {
  it('records the fields whose value changed, with the value before and after', () => {
    expect(
      buildAuditDiff(
        { pixKeyType: 'EMAIL', pixKey: 'marina@email.com' },
        { pixKeyType: 'PHONE', pixKey: '11987654321' },
      ),
    ).toEqual({
      pixKeyType: { from: 'EMAIL', to: 'PHONE' },
      pixKey: { from: 'marina@email.com', to: '11987654321' },
    });
  });

  it('leaves out a field that kept its value', () => {
    expect(
      buildAuditDiff(
        { pixKeyType: 'PHONE', pixKey: '11987654321' },
        { pixKeyType: 'PHONE', pixKey: '11912345678' },
      ),
    ).toEqual({ pixKey: { from: '11987654321', to: '11912345678' } });
  });

  it('is empty when nothing changed', () => {
    expect(buildAuditDiff({ email: 'marina@email.com' }, { email: 'marina@email.com' })).toEqual(
      {},
    );
  });

  it('compares only the fields of the change, not the whole record read before', () => {
    expect(
      buildAuditDiff({ email: 'marina@email.com', name: 'Marina' }, { email: 'nova@email.com' }),
    ).toEqual({ email: { from: 'marina@email.com', to: 'nova@email.com' } });
  });

  it('records a value that appeared or was cleared as null on the missing side', () => {
    expect(buildAuditDiff({ handle: null }, { handle: 'marina' })).toEqual({
      handle: { from: null, to: 'marina' },
    });
    expect(buildAuditDiff({ handle: 'marina' }, { handle: null })).toEqual({
      handle: { from: 'marina', to: null },
    });
  });

  it('compares dates by instant and records them as ISO strings', () => {
    const before = new Date('2026-09-01T12:00:00.000Z');

    expect(buildAuditDiff({ at: before }, { at: new Date(before.getTime()) })).toEqual({});
    expect(buildAuditDiff({ at: before }, { at: new Date('2026-09-02T12:00:00.000Z') })).toEqual({
      at: { from: '2026-09-01T12:00:00.000Z', to: '2026-09-02T12:00:00.000Z' },
    });
  });
});
