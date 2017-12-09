const utils = require(__dirname + '/utils.js');
const winston = require('winston');


class Subscriptions {

  constructor(options) {
    this.options = options;
    this.connection = this.options.connection;
    this.subscriptions = this.subscriptions.bind(this);
    this.rubyizeMatcher = this.rubyizeMatcher.bind(this);
    this.fullAppPrefix = this.fullAppPrefix.bind(this);
    this.subscribe = this.subscribe.bind(this);
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

    let applications = await this.connection.redis.smembers(this.fullSubscriptionSet(this));

    let started = 0;
    for (let app in applications) {
      started++;
      let subscription = await this.connection.redis.hgetall(this.fullAppPrefix(this) + app)
      console.log(`this subscription: ${JSON.stringify(subscription)}`);
      for(let i in subscription){
        if(subscriptions[app] === null || subscriptions[app] === undefined){ subscriptions[app] = {}; }
        subscriptions[app][i] = JSON.parse(subscription[i]);
        count++;
      }
      started--;
      console.log(`started: ${started} ${JSON.stringify(subscriptions)}`)
      if(started === 0){
        return {subscriptions: subscriptions, count: count};
      }
    };
  };

  fullAppPrefix(){
    console.log(`fullAppPrefix namespace: ${this.options.connection.namespace} this.options.appPrefix ${this.options.appPrefix}`)
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
    console.log(`combined_queue_name: ${combined_queue_name}`)
    let subscription = { 
      queue_name : combined_queue_name,
      key        : key,
      class      : job,
      matcher    : this.rubyizeMatcher(matcher)
    };
    this.logger.info(`redis keyinfo prefix: ${this.fullAppPrefix(this)} appkey: ${appKey}, key: ${key} priority: ${priority}, job: ${job}, matcher: ${matcher} connection: ${Object.keys(subscription)}`);
    let result = await this.connection.redis.hset(this.fullAppPrefix(this) + appKey, key, JSON.stringify(subscription))
    console.log(`subscribe hset result: ${result}`);
    console.log(`subscriptionSet: ${this.fullSubscriptionSet(this)} appKey: ${appKey}`);
    let bresult = await this.connection.redis.sadd(this.fullSubscriptionSet(this), appKey);
    console.log(`subscribe sadd result: ${bresult}`);
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

