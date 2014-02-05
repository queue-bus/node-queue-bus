var subscriptions = function(callback){
  var self = this;
  var subscriptions = {};
  var count = 0;

  var now = new Date().getTime();
  if(self.data.subscriptions != null && ((self.data.lastSubscriptionLoad + self.options.subscriptionCacheDuration) > now)){
    process.nextTick(function(){
      for(var i in self.data.subscriptions){ count++; }
      callback(null, self.data.subscriptions, count);
    });
  }else{
    self.connection.redis.smembers(self.options.subscriptionSet, function(err, applications){
      if(err != null || applications.length === 0){ 
        callback(err, subscriptions, count);
      }else{
        var started = 0;
        applications.forEach(function(app){
          started++;
          self.connection.redis.hgetall(self.options.appPrefix + app , function(err, subscription){
            for(var i in subscription){
              if(subscriptions[app] == null){ subscriptions[app] = {}; }
              subscriptions[app][i] = JSON.parse(subscription[i]);
              count++;
            }
            started--;
            if(started === 0){
              callback(err, subscriptions, count);
            }
          });
        });
      }
    });
  }  
}

var subscribe = function(appKey, priority, job, matcher, callback){
  var self                  = this;    
  appKey                    = normalize(appKey);
  var key               = hashKey(appKey, priority, job);   
  var combined_queue_name   = appKey + "_" + priority;
  var subscription = { 
    queue_name : combined_queue_name,
    key        : key,
    class      : job,
    matcher    : matcher
  }
  self.connection.redis.hset(self.options.appPrefix + appKey, key, JSON.stringify(subscription), function(err){
    self.connection.redis.sadd(self.options.subscriptionSet, appKey, function(err){
      if(typeof callback === 'function'){ callback(err, combined_queue_name); }
    });
  });
}

var unsubscribe = function(appKey, priority, job, callback){
  var self    = this;
  appKey      = normalize(appKey);
  var key     = hashKey(appKey, priority, job);   
  self.connection.redis.hdel(self.options.appPrefix + appKey, key, function(err){
    self.connection.redis.hkeys(self.options.appPrefix + appKey, function(err, keys){
      if(keys.length == 0){
        self.unsubscribeAll(appKey, function(){
          if(typeof callback === 'function'){ callback(); }
        });
      }else{  
        if(typeof callback === 'function'){ callback(); }
      }
    });
  });
}

var unsubscribeAll = function(appKey, callback){
  var self = this;
  appKey   = normalize(appKey);
  self.connection.redis.srem(self.options.subscriptionSet, appKey, function(err){
    self.connection.redis.del(self.options.appPrefix + appKey, function(err){
      if(typeof callback === 'function'){ callback(); }
    });
  });
}

var hashKey = function(appKey, priority, job){
  appKey = normalize(appKey);
  return appKey + "_" + priority + "_" + job;
}

var normalize = function(s){
  s = String(s);
  s = s.replace(/ +?/g, '_');
  s = s.toLowerCase();
  return s;
}

exports.subscriptions  = subscriptions;
exports.subscribe      = subscribe;
exports.unsubscribe    = unsubscribe;
exports.unsubscribeAll = unsubscribeAll;