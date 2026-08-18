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
      'TRUNCATE affiliate_status_history, password_reset_tokens, affiliates, users, terms_versions RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      `INSERT INTO terms_versions (version, content_url, published_at, is_current)
       VALUES ('1.0-test', 'https://example.com/termos/1.0', now(), true)`,
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
      termsVersionId: 1,
      termsAcceptedAt: new Date(),
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
});
