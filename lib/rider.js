const util   = require("util");
const Worker = require("node-resque").Worker;
const utils  = require(__dirname + '/sections/utils.js');
const Bus    = require(__dirname + '/bus.js');
const Driver = require(__dirname + '/sections/driver.js');
const winston = require('winston');

class Rider extends Worker {
  constructor (options, jobs) {
    if (!jobs) { jobs = {} }
    console.log(`options: ${JSON.stringify(options)} jobs: ${JSON.stringify(jobs)}`)
    super(options, jobs);
    

    this.logger = new (winston.createLogger)({
       level: 'debug',
       format: winston.format.simple(),
        transports: [
          new winston.transports.Console()
        ]
    });

    this.logger.debug(`options: ${Object.keys(options)} jobs: ${jobs}`);

    let busClassKey        = utils.defaults().busClassKey;
    this.busJob = new Driver(options).busJob;
    this.jobs[busClassKey] = this.busJob;

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
    
  }

  async connect() {
    this.bus.connect();
  }

}

module.exports = Rider;