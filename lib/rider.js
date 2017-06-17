var util   = require("util");
var worker = require("node-resque").worker;
var utils  = require(__dirname + '/sections/utils.js');
var bus    = require(__dirname + '/bus.js').bus;

var rider = function(options, jobs){
  worker.call(this, options, jobs);

  var busClassKey        = this.busDefaults().busClassKey;
  this.jobs[busClassKey] = this.busJob();

  this.bus = new bus(options, jobs);

  var busDefaults = this.busDefaults();
  for(var i in busDefaults){
    if(this.options[i] === undefined){
      this.options[i] = busDefaults[i];
    }
  }

  if(this.options.toDrive === true){
    if(this.queues instanceof Array && this.queues.indexOf(this.options.incomingQueue) < 0){
      this.queues.push( this.options.incomingQueue );
    }
  }

  this.bus.connect(function(){ });
  var self = this;
  this.bus.on('error', function(error){
    self.emit(error);
  });
};

util.inherits(rider, worker);

rider.prototype.busDefaults      = utils.defaults;
rider.prototype.busJob           = require(__dirname + '/sections/driver.js').busJob;

exports.rider = rider;