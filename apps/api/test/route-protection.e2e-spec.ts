import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, MetadataScanner } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { IS_PUBLIC } from '../src/http/shared/decorators/public.decorator';
import { AdminGuard } from '../src/http/shared/guards/admin.guard';
import { AffiliateGuard } from '../src/http/shared/guards/affiliate.guard';

/**
 * A separação entre os canais mora numa linha por controller: o guard global
 * garante "token válido", e é o `@UseGuards` de canal que garante "token
 * **deste** canal". Esquecer essa linha num controller novo publica a rota para
 * qualquer sessão autenticada — inclusive a do outro público —, e nada em lint,
 * type-check ou build acusa.
 *
 * Este teste percorre as rotas que o container registrou de verdade, e não uma
 * lista escrita à mão: rota nova nasce coberta por ele.
 */
const CHANNEL_GUARDS = [AdminGuard, AffiliateGuard];

/**
 * As únicas rotas sem sessão. A lista é literal de propósito: abrir a sexta
 * passa a exigir editar este arquivo, o que transforma uma decisão de segurança
 * num diff que alguém revisa.
 */
const PUBLIC_ROUTES = [
  'GET /health',
  'POST /affiliates',
  'POST /admin/auth/login',
  'POST /affiliate/auth/login',
  'POST /affiliate/auth/set-password',
];

const METHOD_NAMES = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD', 'SEARCH'];

interface DiscoveredRoute {
  signature: string;
  isPublic: boolean;
  guards: unknown[];
}

function join(controllerPath: string, handlerPath: string): string {
  return `/${[controllerPath, handlerPath].filter((part) => part && part !== '/').join('/')}`;
}

describe('Route protection (e2e)', () => {
  let routes: DiscoveredRoute[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DiscoveryModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const discovery = app.get(DiscoveryService);
    const scanner = app.get(MetadataScanner);

    routes = discovery.getControllers().flatMap((wrapper) => {
      const controller = wrapper.metatype;
      if (!controller || !wrapper.instance) return [];

      const prototype = Object.getPrototypeOf(wrapper.instance);
      const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) ?? '';

      return scanner
        .getAllMethodNames(prototype)
        .filter((name) => Reflect.hasMetadata(PATH_METADATA, prototype[name]))
        .map((name) => {
          const handler = prototype[name];
          const method = METHOD_NAMES[Reflect.getMetadata(METHOD_METADATA, handler)] ?? 'GET';
          const path = join(controllerPath, Reflect.getMetadata(PATH_METADATA, handler));

          return {
            signature: `${method} ${path}`,
            isPublic: Boolean(
              Reflect.getMetadata(IS_PUBLIC, handler) ?? Reflect.getMetadata(IS_PUBLIC, controller),
            ),
            guards: [
              ...(Reflect.getMetadata(GUARDS_METADATA, handler) ?? []),
              ...(Reflect.getMetadata(GUARDS_METADATA, controller) ?? []),
            ],
          };
        });
    });

    await app.close();
  });

  it('finds every route the container registered', () => {
    expect(routes.length).toBeGreaterThanOrEqual(9);
  });

  it('guards every route by channel unless it is explicitly public', () => {
    const unguarded = routes
      .filter((route) => !route.isPublic)
      .filter((route) => !route.guards.some((guard) => CHANNEL_GUARDS.includes(guard as never)))
      .map((route) => route.signature);

    expect(unguarded).toEqual([]);
  });

  it('opens exactly the routes that were meant to be open', () => {
    const publicRoutes = routes.filter((route) => route.isPublic).map((route) => route.signature);

    expect(publicRoutes.sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  it('never puts a channel guard on a public route', () => {
    // Guard de canal em rota pública é contradição: ou o `@Public()` está
    // sobrando, ou o guard está — e das duas, uma engana quem lê.
    const contradictory = routes
      .filter((route) => route.isPublic)
      .filter((route) => route.guards.some((guard) => CHANNEL_GUARDS.includes(guard as never)))
      .map((route) => route.signature);

    expect(contradictory).toEqual([]);
  });
});
