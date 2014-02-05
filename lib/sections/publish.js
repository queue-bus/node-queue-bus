var publish = function(payload, callback){
  var self = this;
  var queue = self.options.incommigQueue;
  var klass = self.options.busDriverClassKey;
  if(payload.bus_event_type == null){
    payload.bus_event_type = 'unknown'
  }
  var args = [payload];

  self.queueObject.enqueue(queue, klass, args, function(err, toRun){
    if(typeof callback === 'function'){ callback(err, toRun); }
  });
}

var publishAt = function(timestamp, payload, callback){
  var self = this;
  var queue = self.options.incommigQueue;
  var klass = self.options.busDriverClassKey;
  if(payload.bus_event_type == null){
    payload.bus_event_type = 'unknown'
  }
  var args = [payload];

  self.queueObject.enqueueAt(timestamp, queue, klass, args, function(){
    if(typeof callback === 'function'){ callback(); }
  });
}

var publishIn = function(time, payload, callback){
  var self = this;
  var timestamp = new Date().getTime() + time;
  self.publishAt(timestamp, payload, callback);
}

exports.publish   = publish;
exports.publishAt = publishAt;
exports.publishIn = publishIn;