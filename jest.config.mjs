/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.m?[jt]sx?$": "babel-jest",
  },
  moduleNameMapper: {},
};

export default config;
