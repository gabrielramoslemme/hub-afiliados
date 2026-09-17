import { envValidationSchema } from './env.validation';

const required = {
  DATABASE_URL: 'postgres://porto:porto@localhost:5432/hub_afiliados',
  JWT_SECRET: 'a'.repeat(32),
  APP_BASE_URL: 'https://afiliados.porto.example',
  PANEL_BASE_URL: 'https://painel.porto.example',
};

const credentials = {
  PORTO_CLIENT_ID: 'the-client-id',
  PORTO_CLIENT_SECRET: 'the-client-secret',
};

function validate(env: Record<string, string>) {
  return envValidationSchema.validate({ ...required, ...env });
}

describe('envValidationSchema', () => {
  // Os ambientes são desenvolvimento e produção; `test` é o da suíte.
  it('refuses an environment that does not exist', () => {
    expect(validate({ NODE_ENV: 'staging', ...credentials }).error?.message).toContain('NODE_ENV');
  });

  describe('Porto credentials', () => {
    /*
      Fora de `test` a API sempre fala com a Porto: sem credencial, cada aprovação
      voltaria 503 com a analista na frente do diálogo. Recusar a subida mostra o
      problema no deploy, e não no primeiro cadastro.
    */
    it.each(['development', 'production'])(
      'refuses to start in %s without the client id',
      (nodeEnv) => {
        expect(
          validate({ NODE_ENV: nodeEnv, PORTO_CLIENT_SECRET: 'the-client-secret' }).error?.message,
        ).toContain('PORTO_CLIENT_ID');
      },
    );

    it.each(['development', 'production'])(
      'refuses to start in %s without the client secret',
      (nodeEnv) => {
        expect(
          validate({ NODE_ENV: nodeEnv, PORTO_CLIENT_ID: 'the-client-id' }).error?.message,
        ).toContain('PORTO_CLIENT_SECRET');
      },
    );

    it('refuses blank credentials', () => {
      expect(
        validate({ NODE_ENV: 'production', PORTO_CLIENT_ID: '', PORTO_CLIENT_SECRET: '' }).error
          ?.message,
      ).toContain('PORTO_CLIENT_ID');
    });

    it('treats a missing NODE_ENV as development and requires the credentials', () => {
      expect(validate({}).error?.message).toContain('PORTO_CLIENT_ID');
    });

    it('accepts both credentials outside test', () => {
      expect(validate({ NODE_ENV: 'production', ...credentials }).error).toBeUndefined();
    });

    /*
      No e2e o gateway é sempre trocado pelo falso antes de a API subir, então a
      credencial não teria uso — e a CI não precisa carregá-la.
    */
    it('starts without credentials in test', () => {
      expect(validate({ NODE_ENV: 'test' }).error).toBeUndefined();
    });
  });
});
