import nextJest from 'next/jest.js';

// Fuso fixo antes de qualquer módulo carregar: numa máquina em São Paulo, o
// teste que espera o horário de Brasília passaria mesmo com o `timeZone`
// esquecido no formatador. Em UTC, só passa se o formatador fixar o fuso.
process.env.TZ = 'UTC';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  // Só lógica é testada aqui — Server Action, schema, formatação, função pura —,
  // nunca componente renderizado. Por isso o ambiente é o do Node, e não o jsdom.
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

export default createJestConfig(config);
