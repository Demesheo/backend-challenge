const config = require('../config');

let current = 0;
const queue = [];

module.exports = async function throttler(req, reply) {
  if (current >= config.throttle.maxConcurrent) {
    await new Promise(resolve => queue.push(resolve));
  }

  current++;
  try {
    // nothing else here, just throttle the request
  } finally {
    current--;
    if (queue.length > 0) queue.shift()();
  }
};
