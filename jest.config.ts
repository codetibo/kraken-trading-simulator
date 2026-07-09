import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/lib/engine/__tests__',
    '<rootDir>/server/actions/__tests__',
    '<rootDir>/lib/validation/__tests__',
    '<rootDir>/lib/__tests__',
    '<rootDir>/components/__tests__',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
    '^.+\\.tsx$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],

  verbose: true,
};

export default config;
