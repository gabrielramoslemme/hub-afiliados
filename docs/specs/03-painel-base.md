# Spec 03 — Esqueleto do painel

**Depende de:** 01 · **Entrega:** `npm run dev --workspace apps/painel` sobe o painel em `http://localhost:3005` com o layout do Refine e uma página inicial vazia.

O esqueleto sai de `mesainc/sis-porto-vendeu-ganhou-painel`. Copie layout, tema e providers; descarte todo recurso de domínio (vendas, estoque, resgatadores).

**Files:**
- Create: `apps/painel/package.json`, `apps/painel/tsconfig.json`, `apps/painel/next.config.mjs`, `apps/painel/postcss.config.mjs`, `apps/painel/eslint.config.mjs`, `apps/painel/.env.example`
- Create: `apps/painel/src/app/layout.tsx`, `apps/painel/src/app/globals.css`, `apps/painel/src/app/page.tsx`
- Create: `apps/painel/src/core/providers/refine-provider.tsx`, `apps/painel/src/core/providers/data-provider.ts`, `apps/painel/src/core/theme/theme.ts`
- Create: `apps/painel/src/core/http/api-client.ts`

**Interfaces:**
- Consumes: `@porto/tsconfig/next.json`, `@porto/eslint-config`.
- Produces:
  - `apiClient` — `fetch` embrulhado com base URL, `Authorization` e tradução do erro padrão da API. Assinatura: `apiClient<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T>`.
  - `dataProvider` do Refine apontando para `/v1/admin`.
  - `RefineProvider` — componente que envolve a árvore React com Refine, Ant Design e React Query.
  - Rota `/` protegida na Spec 16.

---

- [ ] **Step 1: Criar o `package.json` do painel**

`apps/painel/package.json`:

```json
{
  "name": "@porto/painel",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3005",
    "build": "next build",
    "start": "next start --port 3005",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@ant-design/icons": "^5.5.1",
    "@ant-design/nextjs-registry": "^1.0.0",
    "@hookform/resolvers": "^5.2.2",
    "@refinedev/antd": "^6.0.3",
    "@refinedev/core": "^5.0.6",
    "@refinedev/nextjs-router": "^7.0.4",
    "@porto/contracts": "*",
    "@tanstack/react-query": "^5.90.2",
    "antd": "^5.23.0",
    "js-cookie": "^3.0.5",
    "next": "^15.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.65.0",
    "tailwindcss": "^4.1.14",
    "@tailwindcss/postcss": "^4.1.14",
    "postcss": "^8.5.6",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@porto/eslint-config": "*",
    "@porto/tsconfig": "*",
    "@types/js-cookie": "^3.0.6",
    "@types/node": "^22.19.3",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "eslint-config-next": "^15.2.4",
    "typescript": "^5.7.3"
  }
}
```

> `@porto/contracts` ainda não existe — ele é criado na Spec 04. Até lá, o `npm install` vai falhar na resolução. Crie um stub mínimo antes de instalar: `packages/contracts/package.json` com `{"name":"@porto/contracts","version":"0.0.0","private":true,"main":"src/index.ts"}` e `packages/contracts/src/index.ts` com `export {};`. A Spec 04 preenche o conteúdo real.

- [ ] **Step 2: Configurar TypeScript, Next, PostCSS e ESLint**

`apps/painel/tsconfig.json`:

```json
{
  "extends": "@porto/tsconfig/next.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/painel/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@porto/contracts'],
};

export default nextConfig;
```

`apps/painel/postcss.config.mjs`:

```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

`apps/painel/eslint.config.mjs`:

```js
import base from '@porto/eslint-config/base.mjs';
export default base;
```

`apps/painel/.env.example`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/v1
```

- [ ] **Step 3: Escrever o cliente HTTP**

Ele centraliza duas coisas que senão vazam por todo o painel: o token e o formato de erro da API definido na Spec 02.

`apps/painel/src/core/http/api-client.ts`:

```ts
import Cookies from 'js-cookie';

export const ACCESS_TOKEN_COOKIE = 'porto_access_token';

export interface ApiErrorBody {
  statusCode: number;
  code: string | null;
  message: string | string[];
  path: string;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1';

export async function apiClient<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const token = auth ? Cookies.get(ACCESS_TOKEN_COOKIE) : undefined;

  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json();

  if (!response.ok) {
    const error = body as ApiErrorBody;
    const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new ApiError(error.statusCode, error.code, message);
  }

  return body as T;
}
```

- [ ] **Step 4: Escrever o data provider do Refine**

`apps/painel/src/core/providers/data-provider.ts`:

```ts
import type { DataProvider } from '@refinedev/core';
import { apiClient } from '@/core/http/api-client';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const dataProvider: DataProvider = {
  getApiUrl: () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1',

  getList: async ({ resource, pagination, filters, sorters }) => {
    const params = new URLSearchParams();
    params.set('page', String(pagination?.currentPage ?? 1));
    params.set('limit', String(pagination?.pageSize ?? 20));

    filters?.forEach((filter) => {
      if ('field' in filter && filter.value !== undefined && filter.value !== '') {
        params.set(filter.field, String(filter.value));
      }
    });

    const sorter = sorters?.[0];
    if (sorter) {
      params.set('sortBy', sorter.field);
      params.set('sortOrder', sorter.order);
    }

    const result = await apiClient<PaginatedResponse<unknown>>(`/admin/${resource}?${params}`);
    return { data: result.data as never[], total: result.total };
  },

  getOne: async ({ resource, id }) => ({
    data: (await apiClient(`/admin/${resource}/${id}`)) as never,
  }),

  create: async ({ resource, variables }) => ({
    data: (await apiClient(`/admin/${resource}`, {
      method: 'POST',
      body: JSON.stringify(variables),
    })) as never,
  }),

  update: async ({ resource, id, variables }) => ({
    data: (await apiClient(`/admin/${resource}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(variables),
    })) as never,
  }),

  deleteOne: async ({ resource, id }) => ({
    data: (await apiClient(`/admin/${resource}/${id}`, { method: 'DELETE' })) as never,
  }),
};
```

- [ ] **Step 5: Escrever o tema e o provider do Refine**

`apps/painel/src/core/theme/theme.ts`:

```ts
import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0046C0',
    colorLink: '#0046C0',
    borderRadius: 8,
    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
  },
};
```

`apps/painel/src/core/providers/refine-provider.tsx`:

```tsx
'use client';

import { Refine } from '@refinedev/core';
import { RefineThemes, useNotificationProvider } from '@refinedev/antd';
import routerProvider from '@refinedev/nextjs-router';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App as AntdApp } from 'antd';
import type { PropsWithChildren } from 'react';
import { dataProvider } from './data-provider';
import { theme } from '@/core/theme/theme';

import '@refinedev/antd/dist/reset.css';

export function RefineProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <AntdRegistry>
      <ConfigProvider theme={{ ...RefineThemes.Blue, ...theme }}>
        <AntdApp>
          <Refine
            routerProvider={routerProvider}
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider}
            options={{ syncWithLocation: true, warnWhenUnsavedChanges: true, disableTelemetry: true }}
          >
            {children}
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
```

> O `authProvider` e os `resources` entram nas Specs 16 e 17. Deixe o `Refine` sem eles agora — ele funciona.

- [ ] **Step 6: Escrever o layout e a página inicial**

`apps/painel/src/app/globals.css`:

```css
@import 'tailwindcss';

:root {
  --font-sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

html,
body {
  padding: 0;
  margin: 0;
}
```

`apps/painel/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';
import { RefineProvider } from '@/core/providers/refine-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hub de Afiliados — Painel',
  description: 'Backoffice de análise e aprovação de afiliados',
};

export default function RootLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="pt-BR">
      <body>
        <RefineProvider>{children}</RefineProvider>
      </body>
    </html>
  );
}
```

`apps/painel/src/app/page.tsx`:

```tsx
export default function HomePage(): JSX.Element {
  return (
    <main style={{ padding: 32 }}>
      <h1>Hub de Afiliados</h1>
      <p>Painel em construção.</p>
    </main>
  );
}
```

- [ ] **Step 7: Instalar, subir e verificar**

```bash
npm install
cp apps/painel/.env.example apps/painel/.env.local
npm run dev --workspace apps/painel
```

Acesse `http://localhost:3005`. Esperado: página com "Hub de Afiliados" e nenhum erro no console do navegador.

- [ ] **Step 8: Verificar tipos e lint**

```bash
npm run type-check --workspace apps/painel
npm run lint --workspace apps/painel
```

Esperado: ambos sem erro.

- [ ] **Step 9: Commit**

```bash
git add apps/painel packages/contracts
git commit -m "feat(painel): scaffold next app with refine, antd and api client"
```
