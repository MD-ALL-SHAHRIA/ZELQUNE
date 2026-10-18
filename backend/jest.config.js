/** @type {import('jest').Config} */
const shared = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleNameMapper: {
    '^@zelqune/common(|/.*)$': '<rootDir>/libs/common/src$1',
    '^@zelqune/contracts(|/.*)$': '<rootDir>/libs/contracts/src$1',
  },
};

module.exports = {
  collectCoverageFrom: [
    'apps/**/src/**/*.ts',
    'libs/**/src/**/*.ts',
    '!**/src/generated/**',
    '!**/main.ts',
  ],
  projects: [
    { ...shared, displayName: 'unit', testRegex: '(apps|libs)/.*\\.spec\\.ts$' },
    { ...shared, displayName: 'e2e', testRegex: 'apps/.*/test/.*\\.e2e-spec\\.ts$' },
  ],
};
