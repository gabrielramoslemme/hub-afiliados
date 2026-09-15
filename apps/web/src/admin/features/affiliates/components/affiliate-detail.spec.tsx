import { render, screen } from '@testing-library/react';
import { AffiliateStatusEnum, CouponStatusEnum } from '@porto/contracts';
import { type MockAffiliate, mockAffiliates } from '@/shared/http/mocks/fixtures';
import { fetchAffiliate, fetchAffiliateHistory, fetchCouponHistory } from '../data';
import { AffiliateDetailScreen } from './affiliate-detail';

jest.mock('../data', () => ({
  fetchAffiliate: jest.fn(),
  fetchAffiliateHistory: jest.fn(),
  fetchCouponHistory: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
// Os botões de decisão descem até o `api-client`, que importa `server-only`. O
// que esta tela promete é o que ela mostra, não o que a decisão envia.
jest.mock('../decide.action', () => ({
  approveAffiliate: jest.fn(),
  checkCouponAvailability: jest.fn(),
  rejectAffiliate: jest.fn(),
}));
jest.mock('../change-coupon.action', () => ({ changeCoupon: jest.fn() }));

const readAffiliate = fetchAffiliate as jest.MockedFunction<typeof fetchAffiliate>;
const readHistory = fetchAffiliateHistory as jest.MockedFunction<typeof fetchAffiliateHistory>;
const readCouponHistory = fetchCouponHistory as jest.MockedFunction<typeof fetchCouponHistory>;

function affiliateWith(status: AffiliateStatusEnum): MockAffiliate {
  const found = mockAffiliates.find((item) => item.status === status);

  if (!found) throw new Error(`Nenhuma fixture com o status ${status}.`);

  return found;
}

const approved = affiliateWith(AffiliateStatusEnum.APPROVED);
const coupon = approved.coupon;

if (!coupon) throw new Error('A fixture aprovada precisa carregar o cupom da aprovação.');

beforeEach(() => {
  jest.clearAllMocks();
  readHistory.mockResolvedValue([]);
  readCouponHistory.mockResolvedValue([]);
});

function showDetailOf(affiliate: MockAffiliate) {
  readAffiliate.mockResolvedValue(affiliate);

  return AffiliateDetailScreen({ publicId: affiliate.publicId });
}

/**
 * A analista escolhe o cupom no diálogo de aprovação e nunca mais o vê — é esta
 * tela que responde "qual é o cupom desta pessoa?" quando ela
 * volta, dias depois, com o afiliado do outro lado do telefone.
 */
describe('AffiliateDetailScreen', () => {
  it('shows the coupon the approval issued, with the discount it carries', async () => {
    render(await showDetailOf(approved));

    expect(screen.getByText('Cupom')).toBeVisible();
    expect(screen.getByText(coupon.code)).toBeVisible();
    expect(screen.getByText(new RegExp(`${coupon.discountPercent}% de desconto`))).toBeVisible();
  });

  it('offers to change the coupon the approval issued', async () => {
    render(await showDetailOf(approved));

    expect(screen.getByRole('button', { name: /alterar cupom/i })).toBeVisible();
  });

  /* Desativar o cupom é evento sensível do RF-33: aparece na mesma trilha da decisão. */
  it('shows the coupon events in the audit trail', async () => {
    readCouponHistory.mockResolvedValue([
      {
        fromStatus: CouponStatusEnum.ACTIVE,
        toStatus: CouponStatusEnum.INACTIVE,
        fromDiscountPercent: 10,
        toDiscountPercent: 10,
        actorName: 'Analista Porto',
        createdAt: '2026-09-01T12:00:00.000Z',
      },
    ]);

    render(await showDetailOf(approved));

    expect(screen.getByText('Cupom desativado')).toBeVisible();
  });

  it('says nothing about a coupon while the registration is still under review', async () => {
    render(await showDetailOf(affiliateWith(AffiliateStatusEnum.PENDING_APPROVAL)));

    expect(screen.queryByText('Cupom')).not.toBeInTheDocument();
  });
});
