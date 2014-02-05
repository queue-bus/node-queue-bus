exports.bus    = require(__dirname + "/lib/bus.js").bus;        // like a node_resque.queue
exports.driver = require(__dirname + "/lib/driver.js").driver;  // like a node_resque.worker