/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
                sourceMap: true,
                inlineSourceMap: false,
                isolatedModules: true,
            },
        ],
    },
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    errorOnDeprecated: true,
    maxWorkers: 1,
    clearMocks: true,
    restoreMocks: true,
};
