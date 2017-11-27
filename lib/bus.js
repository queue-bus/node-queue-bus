const util  = require("util");
const Queue = require('node-resque').Queue;
const utils = require('./sections/utils');
const winston = require('winston');
const Subscriptionion = require(__dirname + '/sections/subscriptions.js');

const subs = new Subscriptionion();

class Bus extends Queue {
  constructor (options, jobs) {
    super(options, jobs);
    if (!jobs) { jobs = {} }

    this.options = options;

    let busDefaults = utils.defaults;
    for(let i in busDefaults){
      if(this.options[i] === undefined){
        this.options[i] = busDefaults[i];
      }
    } 
    this.connection.on('error', (error) => { this.emit('error', error) })

    this.subscriptions    = subs.subscriptions;
    this.subscribe        = subs.subscribe;
    this.unsubscribe      = subs.unsubscribe;
    this.unsubscribeAll   = subs.unsubscribeAll;

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
  }
}

module.exports = Bus;