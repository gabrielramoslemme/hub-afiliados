import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@Domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@Application/(.*)$': '<rootDir>/src/application/$1',
    '^@Infra/(.*)$': '<rootDir>/src/infra/$1',
    '^@Http/(.*)$': '<rootDir>/src/http/$1',
    '^@Testing/(.*)$': '<rootDir>/src/testing/$1',
  },
};

export default config;
