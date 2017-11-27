const utils = require(__dirname + '/utils.js');
const winston = require('winston');


class Subscriptions {

  constructor() {
    this.subscriptions = this.subscriptions.bind(this);
    this.rubyizeMatcher = this.rubyizeMatcher.bind(this);
    this.logger = new (winston.createLogger)({
           level: 'info',
           format: winston.format.simple(),
            transports: [
              new winston.transports.Console()
            ]
        });
    this.logger.info('test message');
  }

  async subscriptions () {
    this.logger.info('subscriptions');
    let subscriptions = {};
    let count = 0;

    let now = new Date().getTime();

    let applications = await this.connection.redis.smembers(fullSubscriptionSet(this));

    let started = 0;
    for (let app in applications) {
      started++;
      let subscription = await this.connection.redis.hgetall(fullAppPrefix(this) + app)
      for(let i in subscription){
        if(subscriptions[app] === null || subscriptions[app] === undefined){ subscriptions[app] = {}; }
        subscriptions[app][i] = JSON.parse(subscription[i]);
        count++;
      }
      started--;
      if(started === 0){
        callback(err, subscriptions, count);
      }
    };
  };

  fullAppPrefix(){
    return this.options.connection.namespace + this.options.appPrefix;
  };

  fullSubscriptionSet(){
    return this.options.connection.namespace + this.options.subscriptionSet;
  };

  rubyizeMatcher(matcher){
    for(let i in matcher){
      matcher[i] = utils.toRubyRegExp(matcher[i]);
    }
    return matcher;
  };

  async subscribe(appKey, priority, job, matcher, callback){
    this.logger.info(`redis test ${Object.keys(this)}`);
    appKey                    = utils.normalize(appKey);
    let key                   = utils.hashKey(appKey, priority, job);   
    let combined_queue_name   = appKey + "_" + priority;
    let subscription = { 
      queue_name : combined_queue_name,
      key        : key,
      class      : job,
      matcher    : this.rubyizeMatcher(matcher)
    };
    this.logger.info(`redis ${appKey}, ${priority}, ${job}, ${matcher} ${Object.keys(this.connection)}`);
    await self.connection.redis.hset(fullAppPrefix(self) + appKey, key, JSON.stringify(subscription))
    await self.connection.redis.sadd(fullSubscriptionSet(self), appKey);
  };

  unsubscribe(appKey, priority, job, callback){
    appKey      = utils.normalize(appKey);
    let key     = utils.hashKey(appKey, priority, job);   
    this.connection.redis.hdel(fullAppPrefix(this) + appKey, key, function(err){
      this.connection.redis.hkeys(fullAppPrefix(this) + appKey, function(err, keys){
        if(keys.length === 0){
          this.unsubscribeAll(appKey, function(){
            if(typeof callback === 'function'){ callback(); }
          });
        }else{  
          if(typeof callback === 'function'){ callback(); }
        }
      });
    });
  };

  unsubscribeAll(appKey, callback){
    appKey   = utils.normalize(appKey);
    this.connection.redis.srem(fullSubscriptionSet(this), appKey, function(err){
      this.connection.redis.del(fullAppPrefix(this) + appKey, function(err){
        if(typeof callback === 'function'){ callback(); }
      });
    });
  };

} 
module.exports = Subscriptions;

