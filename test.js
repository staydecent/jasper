const myArray = [1, 2, 3, 4, 5, 6]

const sleep = ms =>
  new Promise(res => {
    setTimeout(res, ms)
  })

const myPromise = num =>
  sleep(500).then(() => {
    console.log('done: ' + num)
  })

myArray.reduce(
  (p, x) =>
    p.then(_ => myPromise(x)),
  Promise.resolve()
)

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

serial(myArray.map(myPromise));
