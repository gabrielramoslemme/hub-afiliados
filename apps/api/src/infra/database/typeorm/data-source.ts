import { DataSource } from 'typeorm';

/**
 * Caminhos resolvidos por `__dirname` e com os dois sufixos, como o
 * `typeorm.module.ts` já faz: em desenvolvimento o CLI roda por `ts-node` sobre
 * `src/`, e na imagem de produção roda por `node` sobre `dist/`. Glob relativo
 * ao cwd funcionaria só no primeiro caso.
 */
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
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
