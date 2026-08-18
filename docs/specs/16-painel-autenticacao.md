# Spec 16 — Painel: autenticação e recuperação de senha

**Issue:** SIS-518 · **RF:** RF-32 · **Depende de:** 03, 13

**Entrega:** telas de login, esqueci a senha e redefinir senha; middleware do Next barrando rota autenticada sem sessão; `authProvider` do Refine ligado ao `/v1/admin/auth`.

**Files:**
- Create: `apps/painel/src/core/providers/auth-provider.ts`
- Create: `apps/painel/src/core/auth/session.ts`
- Create: `apps/painel/src/middleware.ts`
- Create: `apps/painel/src/app/(auth)/layout.tsx`, `.../login/page.tsx`, `.../esqueci-senha/page.tsx`, `.../redefinir-senha/page.tsx`
- Create: `apps/painel/src/app/(painel)/layout.tsx`
- Modify: `apps/painel/src/core/providers/refine-provider.tsx`, `apps/painel/src/app/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `ACCESS_TOKEN_COOKIE` (Spec 03); `adminLoginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `AdminLoginResponse`, `UserRoleEnum` de `@porto/contracts` (Spec 04); rotas `/v1/admin/auth/*` (Spec 13).
- Produces:
  - `REFRESH_TOKEN_COOKIE` e as funções `saveSession(response: AdminLoginResponse): void`, `clearSession(): void`, `getStoredUser(): SessionUser | null`.
  - `authProvider` do Refine, com `login`, `logout`, `check`, `getIdentity` e `onError`.

---

- [ ] **Step 1: Escrever o armazenamento de sessão**

`apps/painel/src/core/auth/session.ts`:

```ts
import Cookies from 'js-cookie';
import type { AdminLoginResponse, UserRoleEnum } from '@porto/contracts';
import { ACCESS_TOKEN_COOKIE } from '@/core/http/api-client';

export const REFRESH_TOKEN_COOKIE = 'porto_refresh_token';
const USER_COOKIE = 'porto_user';

export interface SessionUser {
  publicId: string;
  name: string;
  email: string;
  role: UserRoleEnum;
}

const cookieOptions = {
  sameSite: 'strict' as const,
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  expires: 30,
};

export function saveSession(response: AdminLoginResponse): void {
  Cookies.set(ACCESS_TOKEN_COOKIE, response.accessToken, cookieOptions);
  Cookies.set(REFRESH_TOKEN_COOKIE, response.refreshToken, cookieOptions);
  Cookies.set(
    USER_COOKIE,
    JSON.stringify({
      publicId: response.user.publicId,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
    }),
    cookieOptions,
  );
}

export function clearSession(): void {
  [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, USER_COOKIE].forEach((name) => Cookies.remove(name));
}

export function getStoredUser(): SessionUser | null {
  const raw = Cookies.get(USER_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_COOKIE);
}
```

- [ ] **Step 2: Escrever o `authProvider`**

`apps/painel/src/core/providers/auth-provider.ts`:

```ts
import type { AuthProvider } from '@refinedev/core';
import type { AdminLoginRequest, AdminLoginResponse } from '@porto/contracts';
import { ApiError, apiClient } from '@/core/http/api-client';
import { clearSession, getRefreshToken, getStoredUser, saveSession } from '@/core/auth/session';

export const authProvider: AuthProvider = {
  login: async ({ email, password }: AdminLoginRequest) => {
    try {
      const response = await apiClient<AdminLoginResponse>('/admin/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      saveSession(response);
      return { success: true, redirectTo: '/afiliados' };
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Não foi possível entrar. Tente novamente.';
      return { success: false, error: { name: 'Falha no login', message } };
    }
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await apiClient('/admin/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    clearSession();
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    const user = getStoredUser();
    return user ? { authenticated: true } : { authenticated: false, redirectTo: '/login' };
  },

  getIdentity: async () => getStoredUser(),

  getPermissions: async () => getStoredUser()?.role ?? null,

  onError: async (error) => {
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
      clearSession();
      return { logout: true, redirectTo: '/login' };
    }
    return {};
  },
};
```

Registre-o no `RefineProvider`: `<Refine authProvider={authProvider} ...>`.

- [ ] **Step 3: Escrever o middleware**

`apps/painel/src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/core/http/api-client';

const PUBLIC_PATHS = ['/login', '/esqueci-senha', '/redefinir-senha'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/afiliados';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

> O middleware só olha a presença do cookie. A validação real do token é da API — o middleware evita a piscada de tela, não substitui o guard.

- [ ] **Step 4: Escrever o layout das telas de autenticação**

`apps/painel/src/app/(auth)/layout.tsx`:

```tsx
import type { PropsWithChildren } from 'react';

export default function AuthLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Hub de Afiliados</h1>
        <p className="mb-6 text-sm text-slate-500">Painel de análise e aprovação</p>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Escrever a tela de login**

`apps/painel/src/app/(auth)/login/page.tsx`:

```tsx
'use client';

import { useLogin } from '@refinedev/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Button, Form, Input } from 'antd';
import Link from 'next/link';
import { adminLoginSchema, type AdminLoginRequest } from '@porto/contracts';
import { useState } from 'react';

export default function LoginPage(): JSX.Element {
  const { mutate: login, isPending } = useLogin<AdminLoginRequest>();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginRequest>({ resolver: zodResolver(adminLoginSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    login(values, {
      onError: (loginError) => setError(loginError?.message ?? 'Não foi possível entrar.'),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <Alert type="error" message={error} showIcon className="mb-4" />}

      <div className="mb-4">
        <label htmlFor="email" className="mb-1 block text-sm text-slate-700">E-mail</label>
        <Input
          id="email"
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder="voce@porto.com.br"
          status={errors.email ? 'error' : undefined}
        />
        {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
      </div>

      <div className="mb-6">
        <label htmlFor="password" className="mb-1 block text-sm text-slate-700">Senha</label>
        <Input.Password
          id="password"
          {...register('password')}
          autoComplete="current-password"
          status={errors.password ? 'error' : undefined}
        />
        {errors.password && <span className="text-xs text-red-600">{errors.password.message}</span>}
      </div>

      <Button type="primary" htmlType="submit" block loading={isPending}>
        Entrar
      </Button>

      <div className="mt-4 text-center">
        <Link href="/esqueci-senha" className="text-sm text-blue-700">
          Esqueci a senha
        </Link>
      </div>
    </form>
  );
}
```

> O formulário é do `react-hook-form`, com componentes do Ant Design apenas como campo — sem `<Form>` do AntD, que traz um sistema de estado próprio e concorrente. Rótulo, erro e espaçamento ficam em markup simples. Mantenha esse mesmo padrão nas outras telas de autenticação.

- [ ] **Step 6: Escrever as telas de recuperação de senha**

`apps/painel/src/app/(auth)/esqueci-senha/page.tsx` — envia o e-mail e **sempre** mostra a mesma confirmação, espelhando o comportamento da API:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Button, Input } from 'antd';
import Link from 'next/link';
import { useState } from 'react';
import { forgotPasswordSchema, type ForgotPasswordRequest } from '@porto/contracts';
import { apiClient } from '@/core/http/api-client';

export default function ForgotPasswordPage(): JSX.Element {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    // A API responde 204 exista ou não a conta. A tela faz o mesmo.
    await apiClient('/admin/auth/password/forgot', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(values),
    }).catch(() => undefined);
    setLoading(false);
    setSent(true);
  });

  if (sent) {
    return (
      <>
        <Alert
          type="success"
          showIcon
          message="Se houver uma conta com esse e-mail, enviamos um link de recuperação."
        />
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-blue-700">Voltar para o login</Link>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-4">
        <label className="mb-1 block text-sm">E-mail</label>
        <Input {...register('email')} type="email" status={errors.email ? 'error' : undefined} />
        {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
      </div>
      <Button type="primary" htmlType="submit" block loading={loading}>Enviar link</Button>
      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-blue-700">Voltar para o login</Link>
      </div>
    </form>
  );
}
```

`apps/painel/src/app/(auth)/redefinir-senha/page.tsx` — lê `token` de `useSearchParams()`, valida com `resetPasswordSchema`, chama `POST /admin/auth/password/reset` e redireciona para `/login` com aviso de sucesso. Em erro `401`, mostra "Link inválido ou expirado. Solicite um novo." com link para `/esqueci-senha`.

- [ ] **Step 7: Escrever o layout autenticado**

`apps/painel/src/app/(painel)/layout.tsx` usando o `ThemedLayoutV2` do `@refinedev/antd`:

```tsx
'use client';

import { ThemedLayoutV2, ThemedTitleV2 } from '@refinedev/antd';
import type { PropsWithChildren } from 'react';

export default function PainelLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <ThemedLayoutV2
      Title={({ collapsed }) => (
        <ThemedTitleV2 collapsed={collapsed} text="Hub de Afiliados" />
      )}
    >
      {children}
    </ThemedLayoutV2>
  );
}
```

E troque `apps/painel/src/app/page.tsx` por um redirecionamento:

```tsx
import { redirect } from 'next/navigation';

export default function RootPage(): never {
  redirect('/afiliados');
}
```

> A rota `/afiliados` chega na Spec 17. Até lá, o redirecionamento leva a um 404 — é esperado.

- [ ] **Step 8: Verificar o fluxo**

```bash
npm run dev --workspace apps/api
npm run dev --workspace apps/painel
```

Com a API rodando e o seed aplicado, em `http://localhost:3005`:

1. Sem sessão, qualquer rota redireciona para `/login`. ✓
2. Login com `analista@porto.example` / `MudarAgora!2026` redireciona para `/afiliados`. ✓
3. Senha errada mostra "E-mail ou senha inválidos" sem derrubar a tela. ✓
4. Com sessão, acessar `/login` redireciona para `/afiliados`. ✓
5. `/esqueci-senha` com e-mail inexistente mostra a mesma mensagem de sucesso. ✓
6. O link impresso no log da API abre `/redefinir-senha?token=...` e a senha nova funciona no login. ✓

- [ ] **Step 9: Verificar tipos, lint e commitar**

```bash
npm run type-check --workspace apps/painel
npm run lint --workspace apps/painel
git add apps/painel
git commit -m "feat(painel): add authentication, route guard and password recovery screens"
```
