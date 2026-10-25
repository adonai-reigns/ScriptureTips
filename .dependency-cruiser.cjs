/** Package boundary rules (testing.md §3). Run with `pnpm boundaries`. */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular imports make packages impossible to reason about in isolation.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "packages-not-to-apps",
      severity: "error",
      comment: "Shared packages must never depend on an app.",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-undeclared-dependencies",
      severity: "error",
      comment: "Every imported package must be declared in the importing package's package.json.",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      name: "tests-only-in-tests",
      severity: "error",
      comment: "Test tools (vitest, fast-check) may only be imported from tests and test config.",
      from: { pathNot: ["\\.test\\.ts$", "/test-support/", "vitest\\.config\\.ts$"] },
      to: { path: "node_modules/(vitest|fast-check)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "default"],
      extensions: [".ts", ".tsx", ".js"],
    },
  },
};
