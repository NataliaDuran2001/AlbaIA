// Test-only module resolver for `node --test --experimental-strip-types`.
//
// Loaded via `node --import ./tests/unit/resolver.mjs`. Registers a synchronous
// resolve hook so the unit runner (no bundler) can load .ts files that use two
// imports Next normally resolves at build time:
//   1. `server-only` — a Next marker package with no standalone install; under
//      node it should be a no-op (its only job is to fail a *client* bundle).
//   2. `@/…` path alias — mapped to the project root, mirroring tsconfig paths.
//      The alias target keeps its `.ts` extension so the strip-types loader
//      picks it up.
import { registerHooks } from "node:module"
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, resolve as resolvePath } from "node:path"

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "..")
const SERVER_ONLY = new URL("./server-only-shim.mjs", import.meta.url).href

// Extensionless alias targets must be resolved to a concrete file — the
// strip-types loader only auto-appends extensions for the *original*
// specifier, not one rewritten in a resolve hook.
function toConcretePath(base) {
  if (existsSync(base)) return base
  for (const ext of [".ts", ".tsx", ".mts", ".js", ".mjs"]) {
    if (existsSync(base + ext)) return base + ext
  }
  for (const idx of ["/index.ts", "/index.tsx", "/index.js"]) {
    if (existsSync(base + idx)) return base + idx
  }
  return base
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: SERVER_ONLY, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = resolvePath(ROOT, specifier.slice(2))
      return nextResolve(pathToFileURL(toConcretePath(base)).href, context)
    }
    return nextResolve(specifier, context)
  },
})
