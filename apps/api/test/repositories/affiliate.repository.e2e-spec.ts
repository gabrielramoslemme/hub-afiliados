import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  AffiliateStatusEnum,
  CouponStatusEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
  UserRoleEnum,
  UserTypeEnum,
} from '@porto/contracts';
import { AppModule } from '../../src/app.module';
import {
  AFFILIATE_REPOSITORY,
  AffiliateRepository,
} from '../../src/domain/affiliates/affiliate.repository';
import {
  AFFILIATE_STATUS_HISTORY_REPOSITORY,
  AffiliateStatusHistoryRepository,
} from '../../src/domain/affiliates/affiliate-status-history.repository';
import {
  CpfAlreadyRegisteredError,
  RgAlreadyRegisteredError,
} from '../../src/domain/affiliates/affiliates.errors';
import {
  COUPON_HISTORY_REPOSITORY,
  CouponHistoryRepository,
} from '../../src/domain/coupons/coupon-history.repository';
import { CouponCodeUnavailableError } from '../../src/domain/coupons/coupons.errors';
import { USER_REPOSITORY, UserRepository } from '../../src/domain/users/user.repository';

describe('AffiliateRepository (integration)', () => {
  let dataSource: DataSource;
  let affiliates: AffiliateRepository;
  let history: AffiliateStatusHistoryRepository;
  let couponHistory: CouponHistoryRepository;
  let users: UserRepository;
  let affiliateId: number;
  let analystId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    affiliates = app.get<AffiliateRepository>(AFFILIATE_REPOSITORY);
    history = app.get<AffiliateStatusHistoryRepository>(AFFILIATE_STATUS_HISTORY_REPOSITORY);
    couponHistory = app.get<CouponHistoryRepository>(COUPON_HISTORY_REPOSITORY);
    users = app.get<UserRepository>(USER_REPOSITORY);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE affiliate_coupon_history, affiliate_coupons, affiliate_status_history, password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
    );
    const owner = await users.save({
      name: 'Marina Ferraz',
      email: 'marina@example.com',
      type: UserTypeEnum.AFFILIATE,
    });
    const analyst = await users.save({
      name: 'Analista Porto',
      email: 'analista@porto.example',
      type: UserTypeEnum.ADMIN,
      role: UserRoleEnum.PORTO_ANALYST,
    });
    analystId = analyst.id;
    const affiliate = await affiliates.save({
      userId: owner.id,
      cpf: '52998224725',
      rg: '12345678X',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'marina@example.com',
      status: AffiliateStatusEnum.PENDING_APPROVAL,
      termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
    });
    affiliateId = affiliate.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('returns the affiliate with the new status', async () => {
    const changed = await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: analystId,
    });

    expect(changed?.status).toBe(AffiliateStatusEnum.APPROVED);
    expect(await affiliates.findByCpf('52998224725')).toMatchObject({
      status: AffiliateStatusEnum.APPROVED,
    });
  });

  it('returns null when the affiliate does not exist', async () => {
    expect(
      await affiliates.changeStatus({
        affiliateId: 999_999,
        expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        actorUserId: analystId,
      }),
    ).toBeNull();
  });

  it('derives the previous status from the stored row instead of trusting the caller', async () => {
    await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: analystId,
    });
    await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.APPROVED,
      toStatus: AffiliateStatusEnum.REJECTED,
      reason: 'Denúncia de uso indevido do cupom',
      actorUserId: analystId,
      changes: { rejectionReason: 'Denúncia de uso indevido do cupom' },
    });

    const entries = await history.listByAffiliateId(affiliateId);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      fromStatus: AffiliateStatusEnum.APPROVED,
      toStatus: AffiliateStatusEnum.REJECTED,
      reason: 'Denúncia de uso indevido do cupom',
    });
    expect(entries[1]).toMatchObject({
      fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
    });
  });

  it('records the actor that requested the change', async () => {
    await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.REJECTED,
      reason: 'CPF divergente do titular da chave PIX',
      actorUserId: analystId,
      changes: { rejectionReason: 'CPF divergente do titular da chave PIX' },
    });

    const [entry] = await history.listByAffiliateId(affiliateId);

    expect(entry.actorUserId).toBe(analystId);
    expect(entry.actor?.name).toBe('Analista Porto');
  });

  it('writes the affiliate columns the transition carries in the same transaction', async () => {
    const approvedAt = new Date('2026-08-18T10:00:00Z');

    const changed = await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: analystId,
      changes: { approvedAt, approvedByUserId: analystId },
    });

    expect(changed).toMatchObject({
      status: AffiliateStatusEnum.APPROVED,
      approvedAt,
      approvedByUserId: analystId,
    });
  });

  it('leaves the status untouched when the history write fails', async () => {
    const unknownActor = 999_999;

    await expect(
      affiliates.changeStatus({
        affiliateId,
        expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        actorUserId: unknownActor,
      }),
    ).rejects.toThrow();

    expect(await affiliates.findByCpf('52998224725')).toMatchObject({
      status: AffiliateStatusEnum.PENDING_APPROVAL,
    });
    expect(await history.listByAffiliateId(affiliateId)).toHaveLength(0);
  });

  /*
    A guarda que decide duas decisões simultâneas: quem chega ao lock depois
    encontra a linha fora do status esperado e não grava nada — nem status, nem
    coluna, nem trilha.
  */
  it('writes nothing when the affiliate is no longer in the expected status', async () => {
    await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: analystId,
    });

    const late = await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.REJECTED,
      reason: 'Decisão que chegou atrasada',
      actorUserId: analystId,
      changes: { rejectionReason: 'Decisão que chegou atrasada' },
    });

    expect(late).toBeNull();
    expect(await affiliates.findByCpf('52998224725')).toMatchObject({
      status: AffiliateStatusEnum.APPROVED,
      rejectionReason: null,
    });
    expect(await history.listByAffiliateId(affiliateId)).toHaveLength(1);
  });

  it('records the coupon issue as the first entry of the coupon trail', async () => {
    await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: analystId,
      coupon: { code: 'MARINA25', discountPercent: 10, status: CouponStatusEnum.ACTIVE },
    });

    const [coupon] = await dataSource.query(
      `SELECT id FROM affiliate_coupons WHERE code = 'MARINA25'`,
    );
    const entries = await couponHistory.listByCouponId(coupon.id);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      fromStatus: null,
      toStatus: CouponStatusEnum.ACTIVE,
      fromDiscountPercent: null,
      toDiscountPercent: 10,
      actorUserId: analystId,
    });
    expect(entries[0].actor?.name).toBe('Analista Porto');
  });

  /*
    Duas aprovações com o mesmo código passam juntas pela checagem do use case,
    e é o índice único que decide. Sem a tradução, quem perde a corrida recebe
    500 em vez de "código em uso" — e o use case não sabe que o cupom é de outro.
  */
  it('translates the coupon code unique index into a domain conflict', async () => {
    await affiliates.changeStatus({
      affiliateId,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: analystId,
      coupon: { code: 'MARINA25', discountPercent: 10, status: CouponStatusEnum.ACTIVE },
    });
    const otherOwner = await users.save({
      name: 'Bruno Alves',
      email: 'bruno@example.com',
      type: UserTypeEnum.AFFILIATE,
    });
    const other = await affiliates.save({
      userId: otherOwner.id,
      cpf: '11144477735',
      rg: '11223344',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'bruno@example.com',
      status: AffiliateStatusEnum.PENDING_APPROVAL,
      termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
    });

    await expect(
      affiliates.changeStatus({
        affiliateId: other.id,
        expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        actorUserId: analystId,
        coupon: { code: 'MARINA25', discountPercent: 10, status: CouponStatusEnum.ACTIVE },
      }),
    ).rejects.toThrow(CouponCodeUnavailableError);
  });

  describe('search', () => {
    const defaults = {
      page: 1,
      limit: 10,
      status: null,
      search: null,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    beforeEach(async () => {
      const rogerio = await affiliates.createWithUser({
        fullName: 'Rogério Bastos',
        email: 'rogerio.bastos@email.com',
        cpf: '11144477735',
        rg: '22334455',
        pixKeyType: PixKeyTypeEnum.EMAIL,
        pixKey: 'rogerio.bastos@email.com',
        socialNetwork: null,
        socialHandle: null,
        termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
      });
      await affiliates.createWithUser({
        fullName: 'Cleide Nakamura',
        email: 'cleide.nakamura@email.com',
        cpf: '39053344705',
        rg: '33445566',
        pixKeyType: PixKeyTypeEnum.EMAIL,
        pixKey: 'cleide.nakamura@email.com',
        socialNetwork: null,
        socialHandle: null,
        termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
      });
      await affiliates.changeStatus({
        affiliateId: rogerio.id,
        expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        actorUserId: analystId,
      });
    });

    it('loads the user the list needs', async () => {
      const { rows, total } = await affiliates.search(defaults);

      expect(total).toBe(3);
      expect(rows[0].user.name).toEqual(expect.any(String));
    });

    it('filters by status', async () => {
      const { rows, total } = await affiliates.search({
        ...defaults,
        status: AffiliateStatusEnum.PENDING_APPROVAL,
      });

      expect(total).toBe(2);
      expect(rows.every((row) => row.status === AffiliateStatusEnum.PENDING_APPROVAL)).toBe(true);
    });

    it('searches by part of the name', async () => {
      const { rows, total } = await affiliates.search({ ...defaults, search: 'nakam' });

      expect(total).toBe(1);
      expect(rows[0].user.name).toBe('Cleide Nakamura');
    });

    it('searches by email regardless of case', async () => {
      const { rows } = await affiliates.search({ ...defaults, search: 'ROGERIO.BASTOS@EMAIL' });

      expect(rows[0].user.email).toBe('rogerio.bastos@email.com');
    });

    it('searches by cpf even when the caller types the punctuation', async () => {
      const { rows, total } = await affiliates.search({ ...defaults, search: '111.444.777-35' });

      expect(total).toBe(1);
      expect(rows[0].cpf).toBe('11144477735');
    });

    it('sorts by name ascending', async () => {
      const { rows } = await affiliates.search({ ...defaults, sortBy: 'name', sortOrder: 'asc' });

      expect(rows.map((row) => row.user.name)).toEqual([
        'Cleide Nakamura',
        'Marina Ferraz',
        'Rogério Bastos',
      ]);
    });

    it('paginates without losing the total', async () => {
      const { rows, total } = await affiliates.search({
        ...defaults,
        page: 2,
        limit: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(total).toBe(3);
      expect(rows).toHaveLength(1);
      expect(rows[0].user.name).toBe('Marina Ferraz');
    });
  });

  describe('createWithUser', () => {
    const createInput = {
      fullName: 'Bruno Alves',
      email: 'bruno@example.com',
      cpf: '11144477735',
      rg: '11223344',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'bruno@example.com',
      socialNetwork: SocialNetworkEnum.YOUTUBE,
      socialHandle: 'brunoalves',
      termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
    };

    it('creates user, affiliate and the first history row atomically', async () => {
      const affiliate = await affiliates.createWithUser(createInput);

      expect(affiliate).toMatchObject({
        status: AffiliateStatusEnum.PENDING_APPROVAL,
        user: expect.objectContaining({ email: 'bruno@example.com', password: null }),
      });
      expect(await history.listByAffiliateId(affiliate.id)).toEqual([
        expect.objectContaining({
          fromStatus: null,
          toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        }),
      ]);
    });

    it('translates the rg unique index into a domain conflict', async () => {
      await affiliates.createWithUser(createInput);

      await expect(
        affiliates.createWithUser({
          ...createInput,
          email: 'outro@example.com',
          cpf: '39053344705',
        }),
      ).rejects.toThrow(RgAlreadyRegisteredError);
    });

    it('finds an affiliate by the rg', async () => {
      await affiliates.createWithUser(createInput);

      await expect(affiliates.findByRg('11223344')).resolves.toMatchObject({ rg: '11223344' });
    });

    it('rolls back the user when the affiliate insert fails', async () => {
      await affiliates.createWithUser(createInput);
      const [{ count: beforeCount }] = await dataSource.query('SELECT count(*) FROM users');

      await expect(
        affiliates.createWithUser({ ...createInput, email: 'outro@example.com' }),
      ).rejects.toThrow(CpfAlreadyRegisteredError);

      const [{ count: afterCount }] = await dataSource.query('SELECT count(*) FROM users');
      expect(afterCount).toBe(beforeCount);
    });
  });
});
