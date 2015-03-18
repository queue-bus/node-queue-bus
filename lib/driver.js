var util   = require("util");
var worker = require("node-resque").worker;
var utils  = require(__dirname + '/sections/utils.js');
var bus    = require(__dirname + '/bus.js').bus;

var driver = function(options, jobs, callback){
  var self = this;

  if(!callback && typeof jobs === 'function'){
    callback = jobs;
    jobs = {};
  }

  worker.call(this, options, jobs, function(error){
    var busClassKey        = self.busDefaults().busClassKey;
    self.jobs[busClassKey] = self.busJob();

    var busDefaults = self.busDefaults();
    for(var i in busDefaults){
      if(self.options[i] === undefined){
        self.options[i] = busDefaults[i];
      }
    }

    if(typeof callback === 'function'){ callback(error); }
  });
};

util.inherits(driver, worker);

driver.prototype.busDefaults   = utils.defaults;
driver.prototype.subscriptions = require(__dirname + '/sections/subscriptions.js').subscriptions;
driver.prototype.busJob        = require(__dirname + '/sections/driver.js').busJob;

driver.prototype.publish       = require(__dirname + '/sections/publish.js').publish;
driver.prototype.publishAt     = require(__dirname + '/sections/publish.js').publishAt;
driver.prototype.publishIn     = require(__dirname + '/sections/publish.js').publishIn;

exports.driver = driver;