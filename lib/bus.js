const util  = require("util");
const Queue = require('node-resque').Queue;
const utils = require(__dirname + '/sections/utils');
const winston = require('winston');
const Subscriptionion = require(__dirname + '/sections/subscriptions.js');

class Bus extends Queue {
  constructor (options, jobs) {
    try {
    super(options, jobs);
    console.log(`options: ${Object.keys(options)}`)
    if (!jobs) { jobs = {} }

    this.options = options;
    this.connection = this.options.connection;
    const subs = new Subscriptionion(this.options);

    let busDefaults = utils.defaults();
    console.log(`busDefaults: ${JSON.stringify(busDefaults)}`)
    for(let i in busDefaults){
      console.log(`busDefaults: ${busDefaults[i]}`)
      if(this.options[i] === undefined){
        this.options[i] = busDefaults[i];
      }
    } 
    console.log(`connection type: ${typeof(this.connection)} ${Object.keys(this.connection)}`)
    //this.connection.on('error', (error) => { this.emit('error', error) })

    this.subscriptions    = subs.subscriptions;
    this.unsubscribeAll   = subs.unsubscribeAll;
    this.subscribe        = subs.subscribe;
    this.unsubscribe      = subs.unsubscribe;
    this.rubyizeMatcher   = subs.rubyizeMatcher;

    this.publish          = require(__dirname + '/sections/publish.js').publish;
    this.publishAt        = require(__dirname + '/sections/publish.js').publishAt;
    this.publishIn        = require(__dirname + '/sections/publish.js').publishIn;

    this.publishHeartbeat = require(__dirname + '/sections/publish.js').publishHeartbeat;
    this.logger = new (winston.createLogger)({
       level: 'info',
       format: winston.format.simple(),
        transports: [
          new winston.transports.Console()
        ]
    });
    this.logger.info('test message');
} catch (e) {
    console.log(e);
  }
}
}

module.exports = Bus;