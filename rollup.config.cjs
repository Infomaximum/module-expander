const typescript = require("@rollup/plugin-typescript");
const { optimizeLodashImports } = require("@optimize-lodash/rollup-plugin");
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const packageJSON = require("./package.json");

const config = [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/index.esm.js",
        format: "es",
        sourcemap: true,
      },
    ],
    plugins: [typescript(), optimizeLodashImports(), resolve(), commonjs()],
    external: Object.keys({
      ...packageJSON.peerDependencies,
      ...packageJSON.dependencies,
    }),
  },
];

module.exports = config;
