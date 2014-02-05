var util   = require("util");
var worker = require("node-resque").worker;

var driver = function(options, jobs, callback){
  var self = this;

  if(callback == null && typeof jobs == 'function'){
    callback = jobs;
    jobs = {};
  }
  
  if(options.queues == null){ options.queues = []; }
  var incommingQueue = self.busDefaults().incommigQueue;
  if(options.queues.indexOf(incommingQueue) < 0){
    options.queues.push(incommingQueue);
  }

  self.data = {};

  if(jobs == null){ jobs = {}; }
  var busDriverClassKey = self.busDefaults().busDriverClassKey;
  jobs[busDriverClassKey] = self.driverJob();

  worker.call(this, options, jobs, function(){

    var busDefaults = self.busDefaults();
    for(var i in busDefaults){
      if(self.options[i] == null){
        self.options[i] = busDefaults[i];
      }
    }

    callback();
  });
}

util.inherits(driver, worker);

driver.prototype.busDefaults    = require(__dirname + '/sections/defaults.js').defaults;

driver.prototype.subscriptions  = require(__dirname + '/sections/subscriptions.js').subscriptions;
driver.prototype.driverJob      = require(__dirname + '/sections/driverJob.js').driverJob;

exports.driver = driver;