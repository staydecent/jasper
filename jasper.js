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

  if (open !== -1) {
    throw new Error("You forgot to close an expression!");
  }

  // console.log("\n", rootNode.toArray(), "\n", { pos, open });
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
  fetch,
};

// Run the epxressions, handling any language/syntax features.
const run = (exp, env = ENV) => new Promise(async (resolve, reject) => {
  if (type(exp) === "string") {
    console.log('STRING', exp);
    if (exp[0] === "`") {
      resolve(exp.slice(1));
    } else if (exp.indexOf(".") > -1) {
      const [scope, ref] = exp.split(".");
      console.log('!!!!');
      if (scope in env) {
        console.log('var method!', scope, ref, env);
        resolve(env[scope]);
      } else {
        console.log('var method!', scope, ref, env);
        resolve(_[scope][ref]);
      }
    } else {
      console.log('ATOM', exp);
      resolve(env[exp]);
    }
  } else if (type(exp) === "number") {
    resolve(exp);
  } else if (exp instanceof Exp) {
    if (exp.value === "if") {
      let [, predicate, result, alt] = exp;
      let x = await run(predicate, env) ? result : alt;
      let ret = await run(x, env);
      resolve(ret);
    } else if (exp.value === "def") {
      let [symbol, x] = exp.args;
      ENV[symbol] = await run(x, env);
    } else if (exp.value === "print") {
      const promises = exp.args.map((a) => run(a, env));
      const results = await Promise.all(promises);
      console.log.apply(console, results);
    } else if (exp.value.indexOf(".") > -1) {
      console.log("REF METHOD", exp, env);
    } else {
      let proc = await run(exp.value, env);
      let argsPromises = exp.args.map((arg) => run(arg, env));
      let args = await Promise.all(argsPromises);
      let ret = await proc.apply(null, args);
      console.log('PROC', exp, ret);
      resolve(ret);
    }
  } else {
    resolve(exp);
  }
});

// -- User land

let program = '';
for await (let line of readLines(Deno.stdin)) {
  program = program + line + '\n';
}

const result = await run(parse(tokenize(program)));

console.log(result);
