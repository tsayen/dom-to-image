import ts from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      format: "es",
    },
    {
      file: "dist/dom-to-image.iife.js",
      format: "iife",
      name: "domToImage",
    },
  ],
  external: [
    // "tslib",
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ], plugins: [
    ts(),
    terser(),
  ],
};
