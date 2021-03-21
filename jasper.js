import { readLines } from "https://deno.land/std@0.90.0/io/mod.ts";
import check from "https://unpkg.com/check-arg-types@1.1.2/dist/check-arg-types.m.js";

// -- Util

const type = check.prototype.toType;
let _;
try {
  _ = window;
} catch {
  _ = global;
}

const atom = token =>
  isNaN(Number(token.value)) ? String(token.value) : Number(token.value);

const evalOrAtom = token => new Promise((resolve) => {
  if (token instanceof Exp) {
    token.evaluate().then(result => resolve(result));
  } else {
    resolve(atom(token));
  }
});

const serial = (tasks) => new Promise((resolve, reject) => {
  const results = [];
  const getResult = (prev, task) => prev
    .then(task)
    .then(result => {
      results.push(result)
      return result
    })
    .catch(err => console.error(err));

  tasks
    .reduce(getResult, Promise.resolve())
    .then(() => resolve(results))
    .catch(err => console.error(err));
});

// -- Internal

// Protected scopes from JavaScript.
const ns = ["Math"];

// Global function scope that can be written to.
let ENV = {
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

function Exp(token) {
  this.value = token;
  this.args = [];
}

Exp.prototype.push = function (arg) {
  this.args.push(arg);
};

Exp.prototype.evaluate = function() {
  return new Promise((resolve) => {
    if (this.value === "root-node") {
      const results = this.args.map(a => evalOrAtom(a));
      serial(this.args.map(evalOrAtom)).then(result => resolve(result));
    } else if (this.value === "def") {
      const [symbol, token] = this.args;
      console.log("DEFINE1:", symbol, token);
      evalOrAtom(token).then(result => {
        ENV[symbol] = result;
        console.log("DEFINE2:", symbol, token, result, ENV);
        resolve(result);
      });
    } else if (this.value === "print") {
      serial(this.args.map(evalOrAtom)).then(result => {
        console.log.apply(console, result);
        resolve(result);
      });
    } else if (this.value in ENV) {
      console.log("PROC1:", this);
      console.log('PROC2:', ENV[this.value], this.args);
      const syncResult = ENV[this.value].apply(ENV[this.value], this.args);
      if (typeof syncResult.then === "function") {
        syncResult.then(result => resolve(result));
      } else {
        resolve(syncResult);
      }
    }
  });
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

function run(exp) {
  // root-node
  exp.evaluate().then(result => console.log('END:', result));
};

// -- User land

let program = '';
for await (let line of readLines(Deno.stdin)) {
  program = program + line + '\n';
}

run(parse(tokenize(program)));
