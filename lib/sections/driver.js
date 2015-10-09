var utils     = require(__dirname + '/utils.js');

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
  self.bus.publish(args.bus_event_type, args, function(err){
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

  self.bus.subscriptions(function(err, subscriptions, count){
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

  var redisHeartbeatLockKey = self.options.connection.namespace + ':bus:heartbeat:lock';
  var redisHeartbeatKey     = self.options.connection.namespace + ':bus:heartbeat:timestamp';
  var lockSeconds = 60;

  var lock = function(next){
    var now = Math.ceil(new Date().getTime() / 1000);
    var timeout = now + lockSeconds + 2;
    self.connection.redis.setnx(redisHeartbeatLockKey, timeout, function(error, set){
      // return true if we successfully acquired the lock
      if(set === true || set === 1){ return next(null, timeout); }
      self.connection.redis.get(redisHeartbeatLockKey, function(error, value){
        if(error){ return next(error); }
        // see if the existing timeout is still valid and return false if it is
        // (we cannot acquire the lock during the timeout period)
        if(now <= parseInt(value)){ return next(null, 0); }
        self.connection.redis.getset(redisHeartbeatLockKey, timeout, function(error, value){
          if(error){ return next(error); }
          // otherwise set the timeout and ensure that no other worker has
          // acquired the lock
          if(now > parseInt(value)){ return next(null, timeout); }
          else{ return 0; }
        });
      });
    });
  };

  var unlock = function(next){
    self.connection.redis.del(redisHeartbeatLockKey, next);
  };

  var getSavedMinute = function(next){
    self.connection.redis.get(redisHeartbeatKey, next);
  };

  var setSavedMinute = function(epochMinute, next){
    self.connection.redis.set(redisHeartbeatKey, epochMinute, next);
  };

  var publishHeartbeatAttributes = function(realNow, last, next){
    var minutes = Math.floor(realNow / 60);
    if(last){
      last = parseInt(last);
      if(minutes <= last){ return next(null, true); }
      minutes = last + 1;
    }

    var seconds = minutes * (60);
    var hours   = Math.floor(minutes / (60));
    var days    = Math.floor(minutes / (60*24));

    var now     = new Date(seconds * 1000);

    var attributes = {};
    attributes.epoch_seconds = seconds;
    attributes.epoch_minutes = minutes;
    attributes.epoch_hours   = hours;
    attributes.epoch_days    = days;

    attributes.minute = now.getMinutes();
    attributes.hour   = now.getHours();
    attributes.day    = now.getDate();
    attributes.month  = now.getMonth() + 1;
    attributes.year   = now.getFullYear();
    // TODO http://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
    // attributes.yday   = now.yday; 
    attributes.wday   = now.getDay();

    self.bus.publish("heartbeat_minutes", attributes, function(error){
      if(error){ return next(error); }
      setSavedMinute(minutes, next);
    });
  };

  var realNow = Math.ceil(new Date().getTime() / 1000);
  lock(function(error, locked){
    if(error){ return callback(error); }
    var runUntil = locked - 2 ;
    if(runUntil < realNow){ return callback(); }
    if(realNow < runUntil){
      getSavedMinute(function(error, last){
        if(error){ return callback(error); }
        publishHeartbeatAttributes(realNow, last, function(error, ignore){
          if(error){ return callback(error); }
          unlock(function(error){
            if(error){ return callback(error); }
            if(!ignore){
              heartbeatPerform.call(self, args, callback); 
            }else{
              callback();
            }
          });
        });
      });
    }else{
      unlock(callback);
    }
  });
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
        if(args[key]){
          var matches = args[key].match(utils.toJSRegExp(value));
          if (matches !== null){ matched = true; }
          else{ matched = false; }
        }else{
          matched = false;
        }
      }
    }
  }

  if(parts === 0){
    matched = false;
  }

  return matched;
};

exports.busJob = busJob;