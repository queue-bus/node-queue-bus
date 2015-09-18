var util   = require("util");
var worker = require("node-resque").worker;
var utils  = require(__dirname + '/sections/utils.js');
var bus    = require(__dirname + '/bus.js').bus;

var rider = function(options, jobs, callback){
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

    if(self.options.toDrive === true){
      if(self.queues.indexOf(self.options.incomingQueue) < 0){
        self.queues.push( self.options.incomingQueue );
      }
    }

    if(typeof callback === 'function'){ callback(error); }
  });
};

util.inherits(rider, worker);

rider.prototype.busDefaults      = utils.defaults;
rider.prototype.subscriptions    = require(__dirname + '/sections/subscriptions.js').subscriptions;
rider.prototype.busJob           = require(__dirname + '/sections/driver.js').busJob;

rider.prototype.publish          = require(__dirname + '/sections/publish.js').publish;
rider.prototype.publishAt        = require(__dirname + '/sections/publish.js').publishAt;
rider.prototype.publishIn        = require(__dirname + '/sections/publish.js').publishIn;

rider.prototype.heartbeatLoop    = require(__dirname + '/sections/heartbeat.js').heartbeatLoop;
rider.prototype.publishHeartbeat = require(__dirname + '/sections/publish.js').publishHeartbeat;

exports.rider = rider;