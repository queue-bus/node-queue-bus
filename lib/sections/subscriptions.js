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
    this.unsubscribe = this.unsubscribe.bind(this);
    this.unsubscribeAll = this.unsubscribeAll.bind(this);
    this.logger = new (winston.createLogger)({
           level: 'info',
           format: winston.format.simple(),
            transports: [
              new winston.transports.Console()
            ]
        });
  }

  async subscriptions () {
    this.logger.debug('subscriptions');
    let subscriptions = {};
    let count = 0;

    let now = new Date().getTime();

    let applications = await this.connection.redis.smembers(this.fullSubscriptionSet(this));
    this.logger.debug(`applications: ${JSON.stringify(applications)}`);

    let started = 0;
    for (let app of applications) {
      started++;
      this.logger.debug(`prefix: ${this.fullAppPrefix(this) + app} app:${app}`);
      let rawSubscriptions = await this.connection.redis.hgetall(this.fullAppPrefix(this) + app)
      this.logger.debug(`this rawSubscriptions: ${JSON.stringify(rawSubscriptions)}`);
      for(let i in rawSubscriptions){
        if(subscriptions[app] === null || subscriptions[app] === undefined){ subscriptions[app] = {}; }
        this.logger.debug(`i: ${i} subscriptions ${subscriptions} subscription ${JSON.parse(rawSubscriptions[i])}`)
        subscriptions[app][i] = JSON.parse(rawSubscriptions[i]);
        count++;
      }
      started--;
      this.logger.debug(`started: ${started} ${JSON.stringify(subscriptions)}`)
      if(started === 0){
        return subscriptions;
      }
    };
    return subscriptions;
  };

  fullAppPrefix(){
    this.logger.debug(`fullAppPrefix namespace: ${this.options.connection.namespace} this.options.appPrefix ${this.options.appPrefix}`)
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

  async subscribe(appKey, priority, job, matcher){
    this.logger.debug(`redis test ${Object.keys(this)}`);
    appKey                    = utils.normalize(appKey);
    let key                   = utils.hashKey(appKey, priority, job);   
    let combined_queue_name   = appKey + "_" + priority;
    this.logger.debug(`combined_queue_name: ${combined_queue_name}`)
    let subscription = { 
      queue_name : combined_queue_name,
      key        : key,
      class      : job,
      matcher    : this.rubyizeMatcher(matcher)
    };
    this.logger.debug(`redis keyinfo prefix: ${this.fullAppPrefix(this)} appkey: ${appKey}, key: ${key} priority: ${priority}, job: ${job}, matcher: ${matcher} connection: ${Object.keys(subscription)}`);
    let result = await this.connection.redis.hset(this.fullAppPrefix(this) + appKey, key, JSON.stringify(subscription))
    this.logger.debug(`subscribe hset result: ${result}`);
    this.logger.debug(`subscriptionSet: ${this.fullSubscriptionSet(this)} appKey: ${appKey}`);
    let bresult = await this.connection.redis.sadd(this.fullSubscriptionSet(this), appKey);
    this.logger.debug(`subscribe sadd queueName: ${combined_queue_name} result: ${bresult}`);
    return combined_queue_name;
  };

  async unsubscribe(appKey, priority, job){
    appKey      = utils.normalize(appKey);
    let key     = utils.hashKey(appKey, priority, job);   
    await this.connection.redis.hdel(this.fullAppPrefix(this) + appKey, key);
    let keys = await this.connection.redis.hkeys(this.fullAppPrefix(this) + appKey);

    if(keys.length === 0){
      this.unsubscribeAll(appKey, function(){
        if(typeof callback === 'function'){ callback(); }
      });
    }else{  
      if(typeof callback === 'function'){ callback(); }
    }
  };

  async unsubscribeAll(appKey){
    appKey   = utils.normalize(appKey);
    await this.connection.redis.srem(this.fullSubscriptionSet(this), appKey);
    await this.connection.redis.del(this.fullAppPrefix(this) + appKey);
  };

} 
module.exports = Subscriptions;

