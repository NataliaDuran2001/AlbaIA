// No-op stand-in for the `server-only` marker package under the unit runner.
// In a real build, `server-only` throws if imported into a client bundle; in
// the node test process there is no client boundary, so importing it is inert.
export {}
