var utils     = require(__dirname + '/utils.js');
var heartbeat = require(__dirname + '/heartbeat.js');

var busJob = function(){
  return {
    perform: function(args, callback){
      var self = this;
      try{
        args = JSON.parse(args);
      }catch(e){
        callback(e);
      }

      if(args.bus_class_proxy === 'QueueBus::Driver'){   
        driverPerform.call(self, args, callback); 
      }else if(args.bus_class_proxy === 'QueueBus::Publisher'){
        publisherPerform.call(self, args, callback); 
      }else if(args.bus_class_proxy === 'QueueBus::Heartbeat'){
        heartbeatPerform.call(self, args, callback); 
      }else{
        if( self.jobs[args.bus_class_proxy] && typeof self.jobs[args.bus_class_proxy].perform === 'function' ){
          self.jobs[args.bus_class_proxy].perform.call(self, args, callback);
        }else{
          callback(new Error('Bus Error: Cannot find job named `' + args.bus_class_proxy + '`'));
        }
      }
    } 
  };
};

var publisherPerform = function(args, callback){
  var self = this;
  self.publish(args.bus_event_type, args, function(err){
    callback(err, self.options.busClassKey);
  });
};

var driverPerform = function(args, callback){
  var self = this;
  var started = 0;
  var matches = [];

  var end = function(err){
    if(started === 0 && typeof callback === 'function'){ 
      callback(err, matches);
    }
  };

  self.subscriptions(function(err, subscriptions, count){
    if(err){
      end(err);
    }else if(count === 0){
      end();
    }else{    
      for(var app in subscriptions){
        for(var i in subscriptions[app]){
          started++;
          var subscription = subscriptions[app][i];
          var matched = subscriptionMatch(args, subscription);
          if(matched === true){
            matches.push(subscription.queue_name);
            var payload = driverMetadata(args, subscription.queue_name, app, i, subscription.class, args.bus_event_type);
            payload.bus_class_proxy = subscription.class;
            self.queueObject.enqueue(subscription.queue_name, self.options.busClassKey, JSON.stringify(payload), function(err, toRun){
              started--;
              end(err);
            });
          }else{
            process.nextTick(function(){
              started--;
              end();
            });
          }
        }
      }
    }
  });
};

var heartbeatPerform = function(args, callback){
  var self = this;
  heartbeat.perform.call(self, callback);
};

var driverMetadata = function(args, bus_rider_queue, bus_rider_app_key, bus_rider_sub_key, bus_rider_class_name, bus_event_type){
  var payload = {};

  payload.bus_driven_at        = utils.timestamp();
  payload.bus_rider_queue      = bus_rider_queue;
  payload.bus_rider_app_key    = bus_rider_app_key;
  payload.bus_rider_sub_key    = bus_rider_sub_key;
  payload.bus_rider_class_name = bus_rider_class_name;
  payload.bus_event_type       = bus_event_type;

  for(var i in args){
    payload[i] = args[i];
  }

  return payload;
}; 

var subscriptionMatch = function(args, subscription){
  var specialPrepend = "bus_special_value_";
  var matched = true;
  var parts = 0;

  for(var key in subscription.matcher){
    parts++;
    var value = subscription.matcher[key];

    if(matched === true){
      if(value === specialPrepend + "key"){
        if( args[key] !== null && args[key] !== undefined ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "blank"){
        if( args[key] !== null && args[key] !== undefined && args[key].trim().length === 0 ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "empty"){
        if( args[key] === null ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "nil" || value === specialPrepend + "null"){
        if( args[key] === undefined ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "value"){
        if( args[key] !== null && args[key] !== undefined ){ matched = true; }
        else{ matched = false; }
      }
      else if(value === specialPrepend + "present"){
        if( args[key] !== null && args[key] !== undefined && args[key].trim().length > 0 ){ matched = true; }
        else{ matched = false; }
      }
      else{
        var matches = args[key].match(utils.toJSRegExp(value));
        if (matches !== null){ matched = true; }
        else{ matched = false; }
      }
    }
  }

  if(parts === 0){
    matched = false;
  }

  return matched;
};

exports.busJob = busJob;