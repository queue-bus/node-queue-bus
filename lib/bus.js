const util  = require("util");
const Queue = require('node-resque').Queue;
const utils = require(__dirname + '/sections/utils');
const winston = require('winston');
const Subscription = require(__dirname + '/sections/subscriptions.js');
const Publish = require(__dirname + '/sections/publish.js');;

class Bus extends Queue {
  constructor (options, jobs) {
    try {
    if (!jobs) { jobs = {} }
    super(options, jobs);

    const subs = new Subscription(this.options, this);
    const pubs = new Publish(this.options, this);

    let busDefaults = utils.defaults();
    
    for(let i in busDefaults){
      if(this.options[i] === undefined){
        this.options[i] = busDefaults[i];
      }
    } 
    //this.connection.on('error', (error) => { this.emit('error', error) })

    this.subscriptions    = subs.subscriptions;
    this.unsubscribeAll   = subs.unsubscribeAll;
    this.subscribe        = subs.subscribe;
    this.unsubscribe      = subs.unsubscribe;
    this.rubyizeMatcher   = subs.rubyizeMatcher;

    this.publish          = pubs.publish;
    this.publishAt        = pubs.publishAt;
    this.publishIn        = pubs.publishIn;

    this.publishHeartbeat = pubs.publishHeartbeat;
    this.logger = new (winston.createLogger)({
       level: 'info',
       format: winston.format.simple(),
        transports: [
          new winston.transports.Console()
        ]
    });
    this.logger.debug(`connection type: ${typeof(this.connection)} ${Object.keys(this.connection)}`)
    this.logger.debug(`busDefaults: ${JSON.stringify(busDefaults)}`)
    this.logger.debug(`options: ${Object.keys(options)} this.connection: ${Object.keys(this.connection)}`)
} catch (e) {
    console.log(e);
  }
}
}

module.exports = Bus;