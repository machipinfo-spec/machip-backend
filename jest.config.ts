import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
                // ソースマップを有効化
                sourceMap: true,
                inlineSourceMap: false,
                // 分離されたモジュールでより正確な行数マッピング
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

    // 追加設定
    // エラー報告の改善
    errorOnDeprecated: true,

    // より詳細なエラー情報
    maxWorkers: 1, // デバッグ時は1つのワーカーで実行

    // モック関連
    clearMocks: true,
    restoreMocks: true,

    // グローバル設定
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.test.json',
            isolatedModules: true,
            useESM: false,
        },
    },
};

export default config;
