module.exports = {
  server: {
    port: 3000
  },

  mockServerBaseUrl: 'http://event.com',

  retry: {
    maxFailures: 3,
    windowSeconds: 30,
    backoffMs: 1000
  },

  throttle: {
    maxConcurrent: 5
  }
};