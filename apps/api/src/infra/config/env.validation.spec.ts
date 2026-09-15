import { envValidationSchema } from './env.validation';

const required = {
  DATABASE_URL: 'postgres://porto:porto@localhost:5432/hub_afiliados',
  JWT_SECRET: 'a'.repeat(32),
  APP_BASE_URL: 'https://afiliados.porto.example',
  PANEL_BASE_URL: 'https://painel.porto.example',
};

function validate(env: Record<string, string>) {
  return envValidationSchema.validate({ ...required, ...env });
}

describe('envValidationSchema', () => {
  describe('COUPON_PROVIDER', () => {
    it('falls back to the fake provider in development', () => {
      expect(validate({ NODE_ENV: 'development' }).value.COUPON_PROVIDER).toBe('fake');
    });

    it('falls back to the fake provider in test', () => {
      expect(validate({ NODE_ENV: 'test' }).value.COUPON_PROVIDER).toBe('fake');
    });

    /*
      O emissor falso num ambiente real manda ao afiliado, por e-mail, um cupom
      que não existe na Porto. Fora de desenvolvimento a escolha tem que ser
      explícita — é o que impede um deploy de herdar o padrão sem ninguém ver.
    */
    it('refuses to start in production without choosing the provider', () => {
      expect(validate({ NODE_ENV: 'production' }).error?.message).toContain('COUPON_PROVIDER');
    });

    it('refuses to start in staging without choosing the provider', () => {
      expect(validate({ NODE_ENV: 'staging' }).error?.message).toContain('COUPON_PROVIDER');
    });

    it('accepts the fake provider in production when it is chosen on purpose', () => {
      expect(validate({ NODE_ENV: 'production', COUPON_PROVIDER: 'fake' }).error).toBeUndefined();
    });

    it('refuses the porto provider without credentials', () => {
      expect(validate({ COUPON_PROVIDER: 'porto' }).error?.message).toContain('PORTO_CLIENT_ID');
    });

    it('accepts the porto provider with both credentials', () => {
      expect(
        validate({
          NODE_ENV: 'production',
          COUPON_PROVIDER: 'porto',
          PORTO_CLIENT_ID: 'the-client-id',
          PORTO_CLIENT_SECRET: 'the-client-secret',
        }).error,
      ).toBeUndefined();
    });
  });
});
