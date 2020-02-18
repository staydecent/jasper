const check = require('check-arg-types')
const wasmuth = require('wasmuth')
const type = check.prototype.toType

const tokenize = str => str
  .replace(/(?:\r\n|\r|\n|\t)/g, ' ')
  .replace(/\(/g, ' ( ')
  .replace(/\)/g, ' ) ')
  .split(' ')
  .filter(x => !!x)

const atom = token =>
  isNaN(Number(token)) ? String(token) : Number(token)

const readFromTokens = tokens => {
  if (!tokens || !tokens.length) throw new Error('unexpected EOF')
  let token = tokens.shift()
  if (token === ')') {
    throw new Error('unexpected )')
  } else if (token === '(') {
    let L = []
    while (tokens[0] !== ')') {
      L.push(readFromTokens(tokens))
    }
    tokens.shift()
    return L
  } else {
    return atom(token)
  }
}

const parse = program => readFromTokens(tokenize(program))

let ENV = {
  ...wasmuth,
  begin: (...args) => args[args.length - 1],
  array: (...args) => [...args],
  set: (...args) => new Set([...args]),
  pi: Math.PI,
  '+': (x, y) => x + y,
  '-': (x, y) => x - y,
  '*': (x, y) => x * y,
  '/': (x, y) => x / y,
  '>': (x, y) => x < y,
  '>': (x, y) => x > y,
  '>=': (x, y) => x >= y,
  '<=': (x, y) => x <= y,
  '=': (x, y) => x = y,
  not: x => !x,
  cons: (a, b) => fn => fn(b == null ? b : a, b || a),
  car: pair => pair((a, b) => a),
  cdr: pair => pair((a, b) => b),
  tuple: (...items) => fn => fn(...items),
  head: ls => ls((head, ...rest) => head),
  tail: ls => ls((head, ...rest) => rest),
}

const run = (exp, env = ENV) => {
  if (type(exp) === 'string') {
    return env[exp]
  } else if (type(exp) === 'number') {
    return exp
  } else if (exp[0] === 'if') {
    let [, predicate, result, alt] = exp
    let x = run(predicate, env) ? result : alt
    return run(x, env)
  } else if (exp[0] === 'def') {
    let [, symbol, x] = exp
    ENV[symbol] = run(x, env)
  } else {
    let [head, ...tail] = exp
    let proc = run(head, env)
    let args = tail.map(arg => run(arg, env))
    return proc.apply(null, args)
  }
}

// -- 

// const program = '(begin (def r 10) (* pi (* r r)))'
const program = `
(begin
	(def r 10)
	(* pi (* r r)))
`

const prog = `
(begin
  (def x (cons 1 2))
  (+ (car x) (cdr x)))
`

const tuple_prog = `
(begin
  (def x (tuple 1 2 3))
  (tail x))
`

console.log(
  run(parse(tuple_prog))
)

