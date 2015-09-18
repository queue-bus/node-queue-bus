var redisHeartbeatLockKey = 'bus:heartbeat:lock';
var redisHeartbeatKey     = 'bus:heartbeat:timestamp';
var lockSeconds = 60;

var heartbeatLoop = function(callback){
  var self = this;
  clearTimeout(self.heartbeatLoopTimer);
  self.publishHeartbeat(function(){
    if(typeof callback === 'function'){ 
      callback(); 
    }else{
      self.heartbeatLoopTimer = setTimeout(function(){
        heartbeatLoop.call(self);
      }, 1000 * 60);
    }
  });
};

var lock = function(callback){
  var self = this;
  var now = Math.ceil(new Date().getTime() / 1000);
  var timeout = now + lockSeconds + 2;
  self.connection.redis.setnx((self.options.connection.namespace + redisHeartbeatLockKey), timeout, function(error, set){
    // return true if we successfully acquired the lock
    if(set === true || set === 1){ return callback(null, timeout); }
    self.connection.redis.get((self.options.connection.namespace + redisHeartbeatLockKey), function(error, value){
      if(error){ return callback(error); }
      // see if the existing timeout is still valid and return false if it is
      // (we cannot acquire the lock during the timeout period)
      if(now <= parseInt(value)){ return callback(null, 0); }
      self.connection.redis.getset((self.options.connection.namespace + redisHeartbeatLockKey), timeout, function(error, value){
        if(error){ return callback(error); }
        // otherwise set the timeout and ensure that no other worker has
        // acquired the lock
        if(now > parseInt(value)){ return callback(null, timeout); }
        else{ return 0; }
      });
    });
  });
};

var unlock = function(callback){
  var self = this;
  self.connection.redis.del((self.options.connection.namespace + redisHeartbeatLockKey), callback);
};

var getSavedMinute = function(callback){
  var self = this;
  self.connection.redis.get((self.options.connection.namespace + redisHeartbeatKey), callback);
};

var setSavedMinute = function(epochMinute, callback){
  var self = this;
  self.connection.redis.set((self.options.connection.namespace + redisHeartbeatKey), epochMinute, callback);
};

var perform = function(callback){
  var self = this;
  var realNow = Math.ceil(new Date().getTime() / 1000);
  lock.call(self, function(error, locked){
    if(error){ return callback(error); }
    var runUntil = locked - 2 ;
    if(runUntil > realNow){ return callback(); }
    if(realNow < runUntil){
      getSavedMinute.call(self, function(error, last){
        if(error){ return callback(error); }
        publishHeartbeatAttributes.call(self, realNow, last, function(error){
          if(error){ return callback(error); }
          perform.call(self, callback);
        });
      });
    }else{
      unlock.call(self, callback);
    }
  });
};

var publishHeartbeatAttributes = function(realNow, last, callback){
  var self = this;
  var minutes = Math.floor(realNow / 60);
  if(last && minutes < last){ return callback(); }
  minutes = last + 1;

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
  attributes.year   = now.getYear();
  // TODO http://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
  // attributes.yday   = now.yday; 
  attributes.wday   = now.getDay();

  self.publish("heartbeat_minutes", attributes, function(){
    setSavedMinute(minutes, callback);
  });
};

exports.lock          = lock;
exports.unlock        = unlock;
exports.heartbeatLoop = heartbeatLoop;
exports.perform       = perform;
