import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@Domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@Infra/(.*)$': '<rootDir>/src/infra/$1',
    '^@Modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@Testing/(.*)$': '<rootDir>/src/testing/$1',
  },
};

export default config;
