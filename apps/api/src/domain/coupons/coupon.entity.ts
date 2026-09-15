import { CouponStatusEnum } from '@porto/contracts';

/**
 * O cupom do afiliado. É criado e gerenciado aqui, e esta linha é a fonte da
 * verdade dele; a Porto Serviços só o registra, para ele valer no checkout.
 */
export interface CouponEntity {
  id: number;
  publicId: string;
  affiliateId: number;
  code: string;
  /** Inteiro de 1 a 25, o teto que o INT-01 impõe. */
  discountPercent: number;
  status: CouponStatusEnum;
  createdAt: Date;
  updatedAt: Date;
}
