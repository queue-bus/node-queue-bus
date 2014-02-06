var util   = require("util");
var worker = require("node-resque").worker;
var utils  = require(__dirname + '/sections/utils.js');
var bus    = require(__dirname + '/bus.js').bus;

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
  var busDriverClassKey      = self.busDefaults().busDriverClassKey;
  jobs[busDriverClassKey]    = self.driverJob();
  var busPublisherClassKey   = self.busDefaults().busPublisherClassKey;
  jobs[busPublisherClassKey] = self.publisherJob();

  worker.call(this, options, jobs, function(){

    var busDefaults = self.busDefaults();
    for(var i in busDefaults){
      if(self.options[i] == null){
        self.options[i] = busDefaults[i];
      }
    }

    self.bus = new bus(options, jobs, function(){
      callback();
    });
  });
}

util.inherits(driver, worker);

driver.prototype.busDefaults    = utils.defaults;

driver.prototype.subscriptions  = require(__dirname + '/sections/subscriptions.js').subscriptions;
driver.prototype.driverJob      = require(__dirname + '/sections/driver.js').driverJob;
driver.prototype.publisherJob   = require(__dirname + '/sections/publish.js').publisherJob;

exports.driver = driver;