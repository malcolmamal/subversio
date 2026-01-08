module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  globalSetup: 'jest-preset-angular/global-setup',
  moduleDirectories: ['node_modules', '<rootDir>/../../node_modules'],
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@angular|rxjs|slash|p-limit|yocto-queue)'],
  moduleNameMapper: {
    '^rxjs$': '<rootDir>/../../node_modules/rxjs',
    '^rxjs/(.*)$': '<rootDir>/../../node_modules/rxjs/$1',
    '^slash$': '<rootDir>/node_modules/slash/index.js',
    '^p-limit$': '<rootDir>/node_modules/p-limit/index.js',
  },
};
