/**
 * End-to-end tests through the gateway against real Postgres, RabbitMQ and Redis.
 * Locally: `pnpm infra:up` first. CI: service containers (see .github/workflows/backend.yml).
 * @type {import('jest').Config}
 */
module.exports = {
  displayName: 'integration',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  testRegex: 'test/integration/.*\\.int-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleNameMapper: {
    '^@zelqune/common(|/.*)$': '<rootDir>/libs/common/src$1',
    '^@zelqune/contracts(|/.*)$': '<rootDir>/libs/contracts/src$1',
  },
  globalSetup: '<rootDir>/test/integration/preflight.ts',
  testTimeout: 120_000,
  maxWorkers: 1,
};
