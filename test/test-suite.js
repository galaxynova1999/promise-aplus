const adapter = require('../src');

const promisesAplusTests = require("promises-aplus-tests");

promisesAplusTests(adapter, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
    console.log(err);
});
