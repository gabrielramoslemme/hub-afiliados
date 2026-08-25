import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AffiliateStatusEnum, PixKeyTypeEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { AppModule } from '../../src/app.module';
import {
  AFFILIATE_REPOSITORY,
  AffiliateRepository,
} from '../../src/domain/affiliates/affiliate.repository';
import {
  AFFILIATE_STATUS_HISTORY_REPOSITORY,
  AffiliateStatusHistoryRepository,
} from '../../src/domain/affiliates/affiliate-status-history.repository';
import { CpfAlreadyRegisteredError } from '../../src/domain/affiliates/affiliates.errors';
import { USER_REPOSITORY, UserRepository } from '../../src/domain/users/user.repository';

describe('AffiliateRepository (integration)', () => {
  let dataSource: DataSource;
  let affiliates: AffiliateRepository;
  let history: AffiliateStatusHistoryRepository;
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
    users = app.get<UserRepository>(USER_REPOSITORY);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE affiliate_status_history, password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
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
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'marina@example.com',
      status: AffiliateStatusEnum.PENDING_APPROVAL,
    });
    affiliateId = affiliate.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('returns the affiliate with the new status', async () => {
    const changed = await affiliates.changeStatus({
      affiliateId,
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
        toStatus: AffiliateStatusEnum.APPROVED,
        actorUserId: analystId,
      }),
    ).toBeNull();
  });

  it('derives the previous status from the stored row instead of trusting the caller', async () => {
    await affiliates.changeStatus({
      affiliateId,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: analystId,
    });
    await affiliates.changeStatus({
      affiliateId,
      toStatus: AffiliateStatusEnum.SUSPENDED,
      reason: 'Denúncia de uso indevido do cupom',
      actorUserId: analystId,
    });

    const entries = await history.listByAffiliateId(affiliateId);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      fromStatus: AffiliateStatusEnum.APPROVED,
      toStatus: AffiliateStatusEnum.SUSPENDED,
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
        toStatus: AffiliateStatusEnum.APPROVED,
        actorUserId: unknownActor,
      }),
    ).rejects.toThrow();

    expect(await affiliates.findByCpf('52998224725')).toMatchObject({
      status: AffiliateStatusEnum.PENDING_APPROVAL,
    });
    expect(await history.listByAffiliateId(affiliateId)).toHaveLength(0);
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
        pixKeyType: PixKeyTypeEnum.EMAIL,
        pixKey: 'rogerio.bastos@email.com',
      });
      await affiliates.createWithUser({
        fullName: 'Cleide Nakamura',
        email: 'cleide.nakamura@email.com',
        cpf: '39053344705',
        pixKeyType: PixKeyTypeEnum.EMAIL,
        pixKey: 'cleide.nakamura@email.com',
      });
      await affiliates.changeStatus({
        affiliateId: rogerio.id,
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
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'bruno@example.com',
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
