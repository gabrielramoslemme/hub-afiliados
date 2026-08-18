import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TokenPurposeEnum, UserTypeEnum } from '@porto/contracts';
import { AppModule } from '../../src/app.module';
import { PasswordResetTokenRepository } from '../../src/domain/auth/password-reset-token.repository';
import { UserRepository } from '../../src/domain/users/user.repository';

describe('PasswordResetTokenRepository (integration)', () => {
  let dataSource: DataSource;
  let tokens: PasswordResetTokenRepository;
  let users: UserRepository;
  let userId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    tokens = app.get(PasswordResetTokenRepository);
    users = app.get(UserRepository);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
    );
    const user = await users.save({
      name: 'Marina Ferraz',
      email: 'marina@example.com',
      type: UserTypeEnum.AFFILIATE,
    });
    userId = user.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const future = (): Date => new Date(Date.now() + 60 * 60 * 1000);
  const past = (): Date => new Date(Date.now() - 60 * 1000);

  it('finds a usable token by hash and purpose', async () => {
    await tokens.create({
      userId,
      tokenHash: 'a'.repeat(64),
      purpose: TokenPurposeEnum.SET_PASSWORD,
      expiresAt: future(),
    });
    const found = await tokens.findUsable('a'.repeat(64), TokenPurposeEnum.SET_PASSWORD);
    expect(found?.userId).toBe(userId);
  });

  it('does not find a token with a different purpose', async () => {
    await tokens.create({
      userId,
      tokenHash: 'b'.repeat(64),
      purpose: TokenPurposeEnum.SET_PASSWORD,
      expiresAt: future(),
    });
    const found = await tokens.findUsable('b'.repeat(64), TokenPurposeEnum.RESET_PASSWORD);
    expect(found).toBeNull();
  });

  it('does not find an expired token', async () => {
    await tokens.create({
      userId,
      tokenHash: 'c'.repeat(64),
      purpose: TokenPurposeEnum.SET_PASSWORD,
      expiresAt: past(),
    });
    const found = await tokens.findUsable('c'.repeat(64), TokenPurposeEnum.SET_PASSWORD);
    expect(found).toBeNull();
  });

  it('does not find an already used token', async () => {
    const created = await tokens.create({
      userId,
      tokenHash: 'd'.repeat(64),
      purpose: TokenPurposeEnum.SET_PASSWORD,
      expiresAt: future(),
    });
    await tokens.markUsed(created.id);
    const found = await tokens.findUsable('d'.repeat(64), TokenPurposeEnum.SET_PASSWORD);
    expect(found).toBeNull();
  });

  it('invalidates all pending tokens with the same purpose', async () => {
    await tokens.create({
      userId,
      tokenHash: 'e'.repeat(64),
      purpose: TokenPurposeEnum.RESET_PASSWORD,
      expiresAt: future(),
    });
    await tokens.create({
      userId,
      tokenHash: 'f'.repeat(64),
      purpose: TokenPurposeEnum.RESET_PASSWORD,
      expiresAt: future(),
    });
    await tokens.invalidateAllFor(userId, TokenPurposeEnum.RESET_PASSWORD);
    expect(await tokens.findUsable('e'.repeat(64), TokenPurposeEnum.RESET_PASSWORD)).toBeNull();
    expect(await tokens.findUsable('f'.repeat(64), TokenPurposeEnum.RESET_PASSWORD)).toBeNull();
  });
});
