import 'dotenv/config';

// O DataSource de verdade mora em `src/`, para existir também na imagem de
// produção. Este arquivo continua sendo o `-d` do CLI em desenvolvimento, onde
// o `.env` precisa ser lido antes.
export { default } from './src/infra/database/typeorm/data-source';
