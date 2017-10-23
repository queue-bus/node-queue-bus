const util  = require("util");
const Queue = require('node-resque').Queue;
const utils = require('./sections/utils');

class Bus extends Queue {
  constructor (options, jobs) {
    super()
    if (!jobs) { jobs = {} }

    this.options = options;

    var busDefaults = utils.defaults;
    for(var i in busDefaults){
      if(this.options[i] === undefined){
        this.options[i] = busDefaults[i];
      }
    } 

    this.jobs = jobs;

    this.connection = new Connection(this.options.connection);
    this.connection.on('error', (error) => { this.emit('error', error) })

    this.subscriptions = require(__dirname + '/sections/subscriptions.js').subscriptions;
    this.subscriptions    = require(__dirname + '/sections/subscriptions.js').subscriptions;
    this.subscribe        = require(__dirname + '/sections/subscriptions.js').subscribe;
    this.unsubscribe      = require(__dirname + '/sections/subscriptions.js').unsubscribe;
    this.unsubscribeAll   = require(__dirname + '/sections/subscriptions.js').unsubscribeAll;

    this.publish          = require(__dirname + '/sections/publish.js').publish;
    this.publishAt        = require(__dirname + '/sections/publish.js').publishAt;
    this.publishIn        = require(__dirname + '/sections/publish.js').publishIn;

    this.publishHeartbeat = require(__dirname + '/sections/publish.js').publishHeartbeat;
  }
}

exports.Bus = Bus;