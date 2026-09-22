import { SaleRepository } from '@Domain/sales/sale.repository';

export const saleRepositoryMock = (): jest.Mocked<SaleRepository> => ({
  findByExternalId: jest.fn().mockResolvedValue(null),
  register: jest.fn().mockResolvedValue(null),
  settle: jest.fn().mockResolvedValue(null),
});
