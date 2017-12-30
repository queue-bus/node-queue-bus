const util   = require("util");
const Worker = require("node-resque").Worker;
const utils  = require(__dirname + '/sections/utils.js');
const Bus    = require(__dirname + '/bus.js');
const BusJob = require(__dirname + '/sections/driver.js').busJob;
const winston = require('winston');

class Rider extends Worker {
  constructor (options, jobs) {
    console.log(`options: ${JSON.stringify(options)} jobs: ${jobs}`)
    super(options, jobs);
    if (!jobs) { jobs = {} }

    this.logger = new (winston.createLogger)({
       level: 'debug',
       format: winston.format.simple(),
        transports: [
          new winston.transports.Console()
        ]
    });

    this.logger.debug(`options: ${Object.keys(options)} jobs: ${jobs}`);

    let busClassKey        = utils.defaults().busClassKey;
    this.jobs[busClassKey] = BusJob;

    this.bus = new Bus(options, jobs);

    let busDefaults = utils.defaults;
    for(let i in busDefaults){
      if(this.options[i] === undefined){
        this.options[i] = busDefaults[i];
      }
    } 

    if(this.options.toDrive === true){
      if(this.queues instanceof Array && this.queues.indexOf(this.options.incomingQueue) < 0){
        this.queues.push( this.options.incomingQueue );
      }
    }

    this.bus.on('error', (error, queue, job) => { self.emit(error); });
    this.busJob = require(__dirname + '/sections/driver.js').busJob;
  }

  async connect() {
    this.bus.connect();
  }

}

module.exports = Rider;