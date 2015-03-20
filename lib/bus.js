var util  = require("util");
var queue = require("node-resque").queue;
var utils = require(__dirname + '/sections/utils');

var bus = function(options, jobs, callback){
  var self = this;

  if(!callback && typeof jobs === 'function'){
    callback = jobs;
    jobs = {};
  }
  
  queue.call(this, options, jobs, function(error){

    var busDefaults = self.busDefaults();
    for(var i in busDefaults){
      if(self.options[i] === undefined){
        self.options[i] = busDefaults[i];
      }
    }

    if(typeof callback === 'function'){ callback(error); }
  });
};

util.inherits(bus, queue);

bus.prototype.busDefaults    = utils.defaults;

bus.prototype.subscriptions  = require(__dirname + '/sections/subscriptions.js').subscriptions;
bus.prototype.subscribe      = require(__dirname + '/sections/subscriptions.js').subscribe;
bus.prototype.unsubscribe    = require(__dirname + '/sections/subscriptions.js').unsubscribe;
bus.prototype.unsubscribeAll = require(__dirname + '/sections/subscriptions.js').unsubscribeAll;

bus.prototype.publish        = require(__dirname + '/sections/publish.js').publish;
bus.prototype.publishAt      = require(__dirname + '/sections/publish.js').publishAt;
bus.prototype.publishIn      = require(__dirname + '/sections/publish.js').publishIn;

exports.bus = bus;