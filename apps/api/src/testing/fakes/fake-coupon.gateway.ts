import { Logger } from '@nestjs/common';
import {
  ChangeCouponInput,
  CouponAvailability,
  CouponGateway,
  IssueCouponInput,
} from '@Domain/coupons/coupon-gateway';
import { CouponCodeUnavailableError, CouponNotFoundError } from '@Domain/coupons/coupons.errors';

const TAKEN = 'Este código já está em uso.';

/**
 * O emissor do e2e: registra em memória, sem sair da máquina. Entra pelo
 * `createE2eTestingModule` no lugar do `PortoCouponGateway`, para a suíte
 * exercitar o fluxo inteiro da aprovação sem credencial e sem chamada de rede.
 *
 * Guarda só os códigos, porque é só o que um registro de verdade recusaria em
 * dobro: percentual e situação são da nossa tabela. O conjunto morre com o
 * processo, de propósito — um estado que sobrevive ao restart esconderia falta
 * de persistência.
 */
export class FakeCouponGateway implements CouponGateway {
  private readonly logger = new Logger(FakeCouponGateway.name);
  private readonly registered = new Set<string>();

  async issue(input: IssueCouponInput): Promise<void> {
    if (this.registered.has(input.code)) throw new CouponCodeUnavailableError();

    this.registered.add(input.code);
    this.logger.log(`Cupom ${input.code} registrado com ${input.discountPercent}% (fake)`);
  }

  async checkAvailability(code: string): Promise<CouponAvailability> {
    // Desativar não devolve o código ao estoque: ele continua sendo daquele afiliado.
    if (this.registered.has(code)) return { available: false, reason: TAKEN };

    return { available: true, reason: null };
  }

  async change(input: ChangeCouponInput): Promise<void> {
    if (!this.registered.has(input.code)) throw new CouponNotFoundError();

    this.logger.log(
      `Cupom ${input.code} alterado (fake): ${input.status ?? 'mesma situação'}, ${
        input.discountPercent ?? 'mesmo'
      }%`,
    );
  }
}
