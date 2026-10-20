// @openuidev/react-lang auto-mounts its Inspect widget in development unless this flag is set.
// Must be imported before anything that imports @openuidev/react-lang.
;(globalThis as Record<symbol, unknown>)[Symbol.for('openui.devtools.autoMount')] = true
