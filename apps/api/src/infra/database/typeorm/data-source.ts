import { DataSource } from 'typeorm';
import { postgresSslFromEnv } from './postgres-ssl';

/**
 * Caminhos resolvidos por `__dirname` e com os dois sufixos, como o
 * `typeorm.module.ts` já faz: em desenvolvimento o CLI roda por `ts-node` sobre
 * `src/`, e na imagem de produção roda por `node` sobre `dist/`. Glob relativo
 * ao cwd funcionaria só no primeiro caso.
 */
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // O CLI roda fora do Nest, então lê o ambiente direto — mas a opção é montada
  // pela mesma função que o `typeorm.module.ts` usa. Ver `postgres-ssl.ts`.
  ssl: postgresSslFromEnv(),
  entities: [`${__dirname}/entities/*.typeorm-entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});

/**
 * Um único export de instância, e por isso `default` sozinho: o
 * `migration:run -d <arquivo>` recusa o módulo que exporte duas — e a mesma
 * instância exportada como nomeada e como default já conta como duas.
 */
export default dataSource;
