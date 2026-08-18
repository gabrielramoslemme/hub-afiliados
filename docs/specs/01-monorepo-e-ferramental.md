# Spec 01 — Fundação do monorepo

**Depende de:** nada · **Entrega:** `npm install` e `npx turbo run lint` rodam na raiz sem erro.

> **Ferramental trocado depois desta spec.** O ESLint e o Prettier descritos aqui foram substituídos pelo Biome, e o pacote `@porto/eslint-config` deixou de existir. A configuração vigente é o `biome.jsonc` da raiz, e o lint é um comando de raiz (`npm run lint`), não uma task do Turbo. Esta spec fica como registro do que foi entregue na época.


**Files:**
- Create: `package.json`, `turbo.json`, `.npmrc`, `.gitignore`, `.nvmrc`, `README.md`
- Create: `packages/tsconfig/package.json`, `packages/tsconfig/base.json`, `packages/tsconfig/nest.json`, `packages/tsconfig/next.json`
- Create: `packages/eslint-config/package.json`, `packages/eslint-config/base.mjs`
- Create: `commitlint.config.js`, `lefthook.yml`

**Interfaces:**
- Consumes: nada.
- Produces: workspaces `apps/*` e `packages/*`; pacotes `@porto/tsconfig` e `@porto/eslint-config` importáveis por qualquer app; comandos `npm run lint`, `npm run test`, `npm run build` na raiz, delegando ao Turborepo.

---

- [ ] **Step 1: Inicializar o repositório git**

O diretório `/Users/gabriel.dev/dev/porto-hub-afiliados` já existe e contém apenas `docs/`.

```bash
cd /Users/gabriel.dev/dev/porto-hub-afiliados
git init -b main
```

- [ ] **Step 2: Criar o `package.json` raiz**

`package.json`:

```json
{
  "name": "porto-hub-afiliados",
  "version": "0.0.0",
  "private": true,
  "engines": { "node": ">=20" },
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "type-check": "turbo run type-check",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "prepare": "lefthook install || true"
  },
  "devDependencies": {
    "@commitlint/cli": "^20.5.0",
    "@commitlint/config-conventional": "^20.5.0",
    "lefthook": "^2.1.4",
    "prettier": "^3.4.2",
    "turbo": "^2.5.0",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 3: Criar `turbo.json`**

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "lint": { "dependsOn": ["^build"] },
    "type-check": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- [ ] **Step 4: Criar `.npmrc`, `.nvmrc` e `.gitignore`**

`.npmrc` — o Nest CLI e o Refine CLI resolvem binários pelo caminho hoisted, então o hoisting fica ligado:

```
save-exact=false
engine-strict=true
```

`.nvmrc`:

```
20
```

`.gitignore`:

```
node_modules/
dist/
.next/
coverage/
.turbo/
*.log
.env
.env.local
!.env.example
.DS_Store
```

- [ ] **Step 5: Criar o pacote `@porto/tsconfig`**

`packages/tsconfig/package.json`:

```json
{
  "name": "@porto/tsconfig",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json", "nest.json", "next.json"]
}
```

`packages/tsconfig/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

`packages/tsconfig/nest.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false,
    "outDir": "./dist"
  }
}
```

`packages/tsconfig/next.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2023"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "noEmit": true,
    "allowJs": true,
    "incremental": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 6: Criar o pacote `@porto/eslint-config`**

`packages/eslint-config/package.json`:

```json
{
  "name": "@porto/eslint-config",
  "version": "0.0.0",
  "private": true,
  "main": "base.mjs",
  "dependencies": {
    "@eslint/js": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
    "globals": "^16.0.0",
    "typescript-eslint": "^8.20.0"
  }
}
```

`packages/eslint-config/base.mjs`:

```js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  { ignores: ['dist/**', '.next/**', 'coverage/**', 'node_modules/**'] },
);
```

- [ ] **Step 7: Configurar commitlint e lefthook**

`commitlint.config.js`:

```js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

`lefthook.yml`:

```yaml
commit-msg:
  commands:
    commitlint:
      run: npx --no -- commitlint --edit {1}

pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx}'
      run: npx --no -- biome check --staged --no-errors-on-unmatched
```

- [ ] **Step 8: Instalar e verificar**

```bash
npm install
npx turbo run lint
```

Esperado: o `npm install` cria um único `package-lock.json` na raiz e um `node_modules` hoisted. O `turbo run lint` termina sem erro e sem tarefas (ainda não há apps) — a saída deve conter `No tasks were executed`.

- [ ] **Step 9: Escrever o README raiz**

`README.md`:

````markdown
# Porto Hub de Afiliados

Monorepo da API e do painel do Hub de Afiliados da Porto Serviços.

| Pacote | O que é |
|---|---|
| `apps/api` | API NestJS. Três canais: `/v1/mobile` (app), `/v1/admin` (painel), `/v1/webhooks`. |
| `apps/painel` | Painel de backoffice em Next.js + Refine. |
| `packages/contracts` | Tipos e schemas zod dos DTOs que o painel consome da API. |
| `packages/tsconfig` | Configurações TypeScript compartilhadas. |
| `packages/eslint-config` | Configuração ESLint compartilhada. |

O aplicativo Flutter do afiliado fica em repositório próprio e consome o
`openapi.json` publicado pela API.

## Começando

```bash
nvm use
npm install
npm run dev
```

Documentação de escopo e planejamento em [`docs/`](docs/).
````

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: bootstrap monorepo with npm workspaces and turborepo"
```
