var utils  = require(__dirname + '/utils.js');
var uuid   = require('node-uuid');
var os     = require('os');
var time   = require('time');

var publish = function(eventType, args, callback){
  var self = this;
  var queue = self.options.incommigQueue;
  var klass = self.options.busClassKey;
  var payload = [publishMetadata(eventType, args)];
  payload[0].bus_class_proxy  = '::QueueBus::Driver';

  self.queueObject.enqueue(queue, klass, payload, function(err, toRun){
    if(typeof callback === 'function'){ callback(err, toRun); }
  });
};

var publishAt = function(timestamp, eventType, args, callback){
  var self    = this;
  var queue   = self.options.incommigQueue;
  var klass   = self.options.busClassKey;
  var payload = [publishMetadata(eventType, args)];
  payload[0].bus_class_proxy  = '::QueueBus::Publisher';

  if(payload.bus_delayed_until === undefined){
    payload.bus_delayed_until = Math.floor(timestamp/1000);
  }

  delete payload.bus_published_at; // will get re-added upon re-publish

  self.queueObject.enqueueAt(timestamp, queue, klass, payload, function(err){
    if(typeof callback === 'function'){ callback(err); }
  });
};

var publishIn = function(time, eventType, args, callback){
  var self = this;
  var timestamp = new Date().getTime() + time;
  self.publishAt(timestamp, eventType, args, callback);
};

var publishMetadata = function(eventType, args){
  var payload = {};
  if(eventType){
    payload.bus_event_type = eventType;
  } else {
    payload.bus_event_type = null;
  }
  payload.bus_published_at = utils.timestamp();
  payload.bus_id           = utils.timestamp() + "-" + uuid.v4();
  payload.bus_app_hostname = os.hostname();
  payload.bus_locale       = process.env.LANG.split('.')[0];
  payload.bus_timezone     = new time.Date().getTimezone();

  // overwrite defaults
  for(var i in args){
    payload[i] = args[i];
  }

  return payload;
};

exports.publish      = publish;
exports.publishAt    = publishAt;
exports.publishIn    = publishIn;