// Stub for the "server-only" import guard package. Next.js's own bundler
// (webpack/Turbopack) aliases this specifier to an internal no-op module
// independent of node_modules, so it's never installed as a real dependency
// here — but Vite/Vitest has no such built-in alias, so any file under test
// that transitively imports "server-only" (e.g. lib/subscription/early-bird.ts)
// fails to resolve outside Next's build. This file plus the vitest.config.ts
// `resolve.alias` entry stand in for Next's alias.
export {};
