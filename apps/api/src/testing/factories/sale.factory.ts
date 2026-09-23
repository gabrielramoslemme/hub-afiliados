import { IncentiveStatusEnum } from '@porto/contracts';
import { SaleEntity } from '@Domain/sales/sale.entity';

let sequence = 0;

export function buildSale(overrides: Partial<SaleEntity> = {}): SaleEntity {
  sequence += 1;
  return {
    id: sequence,
    publicId: `30000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    couponId: sequence,
    externalId: `7c4f7b20-709a-4bde-8646-${String(sequence).padStart(12, '0')}`,
    amountCents: 31099,
    item: 'PFAZ * VENTILADOR',
    incentiveStatus: IncentiveStatusEnum.PENDING,
    registeredAt: new Date('2026-09-11T12:17:08Z'),
    settledAt: null,
    createdAt: new Date('2026-09-11T12:17:09Z'),
    updatedAt: new Date('2026-09-11T12:17:09Z'),
    ...overrides,
  };
}
