/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      testMatch: ["**/__tests__/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
      },
    },
    {
      displayName: "chat-integration",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.css$": "<rootDir>/src/__tests__/chat/styleMock.js",
      },
      testMatch: ["**/__tests__/chat/**/*.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/src/__tests__/chat/jest.setup.ts"],
      transform: {
        // assistant-ui, ai, and their dependency trees ship ESM-only
        // builds under node_modules, so they need to go through ts-jest
        // too (see transformIgnorePatterns below for the one exception).
        "^.+\\.(t|j)sx?$": [
          "ts-jest",
          { tsconfig: "tsconfig.jest.json", isolatedModules: true },
        ],
      },
      // undici ships pre-compiled CJS with class fields/private members
      // that ts-jest's downlevel transform chokes on — leave it as-is,
      // it doesn't need transforming.
      transformIgnorePatterns: ["node_modules/undici/"],
    },
    {
      displayName: "components",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.css$": "<rootDir>/src/__tests__/chat/styleMock.js",
      },
      testMatch: ["**/__tests__/components/**/*.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/src/__tests__/components/jest.setup.ts"],
      transform: {
        "^.+\\.(t|j)sx?$": [
          "ts-jest",
          { tsconfig: "tsconfig.jest.json", isolatedModules: true },
        ],
      },
    },
  ],
};
