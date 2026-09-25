import { changeOccupationSchema, OccupationEnum } from '@porto/contracts';

describe('changeOccupationSchema', () => {
  it('accepts an occupation of the list', () => {
    const result = changeOccupationSchema.safeParse({ occupation: OccupationEnum.CONTENT_CREATOR });

    expect(result.success && result.data.occupation).toBe(OccupationEnum.CONTENT_CREATOR);
  });

  it('rejects an empty choice', () => {
    const result = changeOccupationSchema.safeParse({ occupation: '' });

    expect(result.error?.issues[0]?.message).toBe('Escolha sua ocupação.');
  });
});
