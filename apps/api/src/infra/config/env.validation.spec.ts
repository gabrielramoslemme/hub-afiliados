import { envValidationSchema } from './env.validation';

const required = {
  DATABASE_URL: 'postgres://porto:porto@localhost:5432/hub_afiliados',
  JWT_SECRET: 'a'.repeat(32),
  APP_BASE_URL: 'https://afiliados.porto.example',
};

const credentials = {
  PORTO_CLIENT_ID: 'the-client-id',
  PORTO_CLIENT_SECRET: 'the-client-secret',
  RESEND_API_KEY: 're_the_key',
};

// Os endereços de produção do gateway: lá não há padrão que valha.
const gateway = {
  PORTO_OAUTH_URL: 'https://gateway.porto.example/oauth/v2/access-token',
  PORTO_API_BASE_URL: 'https://gateway.porto.example',
};

function credentialsWithout(key: keyof typeof credentials): Record<string, string> {
  const { [key]: _left, ...rest } = credentials;
  return { ...rest, ...gateway };
}

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
          validate({ ...credentialsWithout('PORTO_CLIENT_ID'), NODE_ENV: nodeEnv }).error?.message,
        ).toContain('PORTO_CLIENT_ID');
      },
    );

    it.each(['development', 'production'])(
      'refuses to start in %s without the client secret',
      (nodeEnv) => {
        expect(
          validate({ ...credentialsWithout('PORTO_CLIENT_SECRET'), NODE_ENV: nodeEnv }).error
            ?.message,
        ).toContain('PORTO_CLIENT_SECRET');
      },
    );

    it('refuses blank credentials', () => {
      expect(
        validate({
          ...credentials,
          ...gateway,
          NODE_ENV: 'production',
          PORTO_CLIENT_ID: '',
          PORTO_CLIENT_SECRET: '',
        }).error?.message,
      ).toContain('PORTO_CLIENT_ID');
    });

    it('treats a missing NODE_ENV as development and requires the credentials', () => {
      expect(validate(credentialsWithout('PORTO_CLIENT_ID')).error?.message).toContain(
        'PORTO_CLIENT_ID',
      );
    });

    it('accepts both credentials outside test', () => {
      expect(
        validate({ NODE_ENV: 'production', ...credentials, ...gateway }).error,
      ).toBeUndefined();
    });

    /*
      No e2e o gateway é sempre trocado pelo falso antes de a API subir, então a
      credencial não teria uso — e a CI não precisa carregá-la.
    */
    it('starts without credentials in test', () => {
      expect(validate({ NODE_ENV: 'test' }).error).toBeUndefined();
    });
  });

  describe('Resend key', () => {
    /*
      Opcional enquanto a conta do Resend não existe: travar a subida travaria o
      deploy inteiro por causa do e-mail. Sem a chave a API sobe, e cada envio
      falha no log — nunca com o link, que leva o token em claro.
    */
    it.each(['development', 'production'])('starts in %s without the key', (nodeEnv) => {
      expect(
        validate({ ...credentialsWithout('RESEND_API_KEY'), NODE_ENV: nodeEnv }).error,
      ).toBeUndefined();
    });

    it('accepts a blank key', () => {
      expect(
        validate({ ...credentials, ...gateway, NODE_ENV: 'production', RESEND_API_KEY: '' }).error,
      ).toBeUndefined();
    });
  });

  describe('Porto gateway addresses', () => {
    /*
      Fora de produção vale o padrão, e o padrão é homologação: cada aprovação
      local registra cupom de verdade, mas no ambiente de teste da Porto. O host
      de OAuth da doc da Porto (`hml.api.portoseguro.com.br`) não resolve em DNS
      público, e todo token morria em `fetch failed` antes de sair da máquina.
    */
    it('defaults the OAuth address to the host that issues tokens in homologation', () => {
      expect(validate({ NODE_ENV: 'development', ...credentials }).value.PORTO_OAUTH_URL).toBe(
        'https://portoapicloud-hml.portoseguro.com.br/oauth/v2/access-token',
      );
    });

    it('defaults the API address to homologation outside production', () => {
      expect(validate({ NODE_ENV: 'development', ...credentials }).value.PORTO_API_BASE_URL).toBe(
        'https://portoapicloud-hml.portoseguro.com.br',
      );
    });

    /*
      Em produção um padrão de homologação faria a credencial de produção falar
      com HML, e cada aprovação falharia sem dizer por quê — ou, pior, a de HML
      registraria cupom que nunca vale no checkout. Sem o endereço, não sobe.
    */
    it.each(['PORTO_OAUTH_URL', 'PORTO_API_BASE_URL'] as const)(
      'refuses to start in production without %s',
      (key) => {
        const { [key]: _left, ...otherAddress } = gateway;

        expect(
          validate({ NODE_ENV: 'production', ...credentials, ...otherAddress }).error?.message,
        ).toContain(key);
      },
    );

    it('refuses a blank address in production', () => {
      expect(
        validate({ NODE_ENV: 'production', ...credentials, ...gateway, PORTO_API_BASE_URL: '' })
          .error?.message,
      ).toContain('PORTO_API_BASE_URL');
    });
  });
});
