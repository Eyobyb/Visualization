/** A named argument (`label: "Revenue"`) or a positional one (`name` absent). */
export interface Arg {
  name?: string
  e: Expr
}

export type Expr =
  | { k: 'lit'; v: string | number | boolean | null }
  | { k: 'state'; name: string }
  | { k: 'ref'; name: string }
  | { k: 'member'; o: Expr; f: string }
  | { k: 'index'; o: Expr; i: Expr }
  | { k: 'list'; items: Expr[] }
  | { k: 'obj'; entries: Array<[string, Expr]> }
  | { k: 'un'; op: '-' | '!'; e: Expr }
  | { k: 'bin'; op: string; l: Expr; r: Expr }
  | { k: 'tern'; c: Expr; a: Expr; b: Expr }
  | { k: 'fn'; name: string; args: Arg[] }
  | { k: 'comp'; name: string; args: Arg[] }

/** `name = expr`, or `$name = expr` for a state declaration. */
export interface Statement {
  name: string
  isState: boolean
  expr: Expr
  line: number
}
