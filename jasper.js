import { readLines } from "https://deno.land/std@0.90.0/io/mod.ts";
import check from "https://unpkg.com/check-arg-types@1.1.2/dist/check-arg-types.m.js";

const type = check.prototype.toType;

let _;
try {
  _ = window;
} catch {
  _ = global;
}

// -- Internal

function Exp(token) {
  this.value = token;
  this.args = [];
}

Exp.prototype.push = function (arg) {
  this.args.push(arg);
};

Exp.prototype.toArray = function () {
  let arr = [];
  arr.push(this.value);
  arr = arr.concat(this.args.map((a) => a instanceof Exp ? a.toArray() : a));
  return arr;
};

const tokenize = (str) =>
  str
    .replace(/--(.)+/g, " ")
    .replace(/(?:\r\n|\r|\n|\t)/g, " ")
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .split(" ")
    .filter((x) => !!x);

const atom = (
  token,
) => (isNaN(Number(token.value)) ? String(token.value) : Number(token.value));

const parse = (tokens) => {
  const iterator = tokens[Symbol.iterator]();
  let token = iterator.next();
  let pos = 0;
  let open = -1;

  let rootNode = new Exp("root-node");
  let prevNode;
  let lastNode;

  while (!token.done && token.value !== " ") {
    if (token.value === "(") {
      if (open >= 0) {
        token = iterator.next();
        prevNode = lastNode;
        lastNode = new Exp(atom(token));
        prevNode.push(lastNode);
      }
      open++;
    } else if (token.value === ")") {
      open--;
      lastNode = prevNode;
      prevNode = null;
    } else {
      if (lastNode == null) {
        lastNode = new Exp(atom(token));
        rootNode.push(lastNode);
      } else {
        lastNode.push(atom(token));
      }
    }

    pos++;
    token = iterator.next();
  }

  // console.log("\n", rootNode.toArray());
  return rootNode;
};

// Protected scopes from JavaScript.
const ns = ["Math"];

// Global function scope that can be written to.
let ENV = {
  "root-node": (...args) => args[args.length - 1],
  "+": (x, y) => x + y,
  "-": (x, y) => x - y,
  "*": (x, y) => x * y,
  "/": (x, y) => x / y,
  "<": (x, y) => x < y,
  ">": (x, y) => x > y,
  "<=": (x, y) => x <= y,
  ">=": (x, y) => x >= y,
  "=": (x, y) => x === y,
  "!=": (x, y) => x !== y,
  not: (x) => !x,
  cons: (a, b) => (fn) => fn(b == null ? b : a, b || a),
  car: (pair) => pair((a, b) => a),
  cdr: (pair) => pair((a, b) => b),
  list: (...items) => (fn) => fn(...items),
  head: (ls) => ls((head, ...rest) => head),
  tail: (ls) => ls((head, ...rest) => rest),
};

// Run the epxressions, handling any language/syntax features.
const run = (exp, env = ENV) => {
  if (type(exp) === "string") {
    if (exp.indexOf(".") > -1) {
      const [scope, ref] = exp.split(".");
      return _[scope][ref];
    }
    return env[exp];
  } else if (type(exp) === "number") {
    return exp;
  } else if (exp instanceof Exp) {
    if (exp.value === "if") {
      let [, predicate, result, alt] = exp;
      let x = run(predicate, env) ? result : alt;
      return run(x, env);
    } else if (exp.value === "def") {
      let [symbol, x] = exp.args;
      ENV[symbol] = run(x, env);
    } else if (exp.value === "print") {
      const results = exp.args.map((a) => run(a, env));
      console.log.apply(console, results);
    } else {
      let proc = run(exp.value, env);
      let args = exp.args.map((arg) => run(arg, env));
      return proc.apply(null, args);
    }
  } else {
    return exp;
  }
};

const invoke = (program) => run(parse(tokenize(program)));

// -- User land

let program = '';
for await (let line of readLines(Deno.stdin)) {
  program = program + line + '\n';
}

console.log(invoke(program));

