const check = require('check-arg-types')
const wasmuth = require('wasmuth')
const type = check.prototype.toType

console.log(wasmuth)

const tokenize = str =>
  str.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(' ').filter(x => !!x)

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

const program = '(begin (def r 10) (* pi (* r r)))'

console.log(
  run(parse(program))
)
