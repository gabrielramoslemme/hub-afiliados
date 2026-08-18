import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/infra/database/typeorm/entities/*.entity.ts'],
  migrations: ['src/infra/database/typeorm/migrations/*.ts'],
});
