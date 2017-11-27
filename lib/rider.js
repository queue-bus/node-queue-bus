const util   = require("util");
const Worker = require("node-resque").Worker;
const utils  = require(__dirname + '/sections/utils.js');
const Bus    = require(__dirname + '/bus.js').Bus;

class Rider extends Worker {
  constructor (options, jobs) {
    super()
    if (!jobs) { jobs = {} }

    this.options = options;

    let busClassKey        = this.busDefaults().busClassKey;
    this.jobs[busClassKey] = this.busJob();

    this.bus = new Bus(options, jobs);

    let busDefaults = utils.defaults;
    for(var i in busDefaults){
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