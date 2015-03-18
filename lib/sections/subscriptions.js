var utils = require(__dirname + '/utils.js');

var subscriptions = function(callback){
  var self = this;
  var subscriptions = {};
  var count = 0;

  var now = new Date().getTime();
  self.connection.redis.smembers(fullSubscriptionSet(self), function(err, applications){
    if(err || applications.length === 0){ 
      callback(err, subscriptions, count);
    }else{
      var started = 0;
      applications.forEach(function(app){
        started++;
        self.connection.redis.hgetall(fullAppPrefix(self) + app , function(err, subscription){
          for(var i in subscription){
            if(subscriptions[app] === null || subscriptions[app] === undefined){ subscriptions[app] = {}; }
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
};

var fullAppPrefix = function(self){
  return self.options.connection.namespace + self.options.appPrefix;
};

var fullSubscriptionSet = function(self){
  return self.options.connection.namespace + self.options.subscriptionSet;
};

var rubyizeMatcher = function(matcher){
  for(var i in matcher){
    matcher[i] = utils.toRubyRegExp(matcher[i]);
  }
  return matcher;
};

var subscribe = function(appKey, priority, job, matcher, callback){
  var self                  = this;    
  appKey                    = utils.normalize(appKey);
  var key                   = utils.hashKey(appKey, priority, job);   
  var combined_queue_name   = appKey + "_" + priority;
  var subscription = { 
    queue_name : combined_queue_name,
    key        : key,
    class      : job,
    matcher    : rubyizeMatcher(matcher)
  };

  self.connection.redis.hset(fullAppPrefix(self) + appKey, key, JSON.stringify(subscription), function(err){
    self.connection.redis.sadd(fullSubscriptionSet(self), appKey, function(err){
      if(typeof callback === 'function'){ callback(err, combined_queue_name); }
    });
  });
};

var unsubscribe = function(appKey, priority, job, callback){
  var self    = this;
  appKey      = utils.normalize(appKey);
  var key     = utils.hashKey(appKey, priority, job);   
  self.connection.redis.hdel(fullAppPrefix(self) + appKey, key, function(err){
    self.connection.redis.hkeys(fullAppPrefix(self) + appKey, function(err, keys){
      if(keys.length === 0){
        self.unsubscribeAll(appKey, function(){
          if(typeof callback === 'function'){ callback(); }
        });
      }else{  
        if(typeof callback === 'function'){ callback(); }
      }
    });
  });
};

var unsubscribeAll = function(appKey, callback){
  var self = this;
  appKey   = utils.normalize(appKey);
  self.connection.redis.srem(fullSubscriptionSet(self), appKey, function(err){
    self.connection.redis.del(fullAppPrefix(self) + appKey, function(err){
      if(typeof callback === 'function'){ callback(); }
    });
  });
};

exports.subscriptions  = subscriptions;
exports.subscribe      = subscribe;
exports.unsubscribe    = unsubscribe;
exports.unsubscribeAll = unsubscribeAll;