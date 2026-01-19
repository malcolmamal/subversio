module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  transformIgnorePatterns: ['/node_modules/(?!uuid|subtitle)/'],
};
