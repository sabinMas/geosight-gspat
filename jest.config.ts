import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@turf/turf$": "<rootDir>/node_modules/@turf/turf/dist/cjs/index.cjs",
  },
  testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
};

export default config;
