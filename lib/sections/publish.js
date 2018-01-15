const utils = require(__dirname + '/utils.js');
const winston = require('winston');

const uuid            = require('uuid');
const os              = require('os');
const system_timezone = require('system-timezone');

const systemTimezone = system_timezone();

class Publish {

   constructor(options, bus) {
    this.options = options;
    this.bus = bus;
    this.connection = this.options.connection;
    this.publish = this.publish.bind(this);
    this.publishHeartbeat = this.publishHeartbeat.bind(this);
    this.publishAt = this.publishAt.bind(this);
    this.logger = new (winston.createLogger)({
           level: 'debug',
           format: winston.format.simple(),
            transports: [
              new winston.transports.Console()
            ]
        });
  }

  async publish (eventType, args) {
    let queue = this.options.incomingQueue;
    let klass = this.options.busClassKey;
    let payload = this.publishMetadata(eventType, args);
    payload.bus_class_proxy  = 'QueueBus::Driver';
    this.logger.debug(`+++++queue:${JSON.stringify(queue)} klass: ${JSON.stringify(klass)} payload: ${JSON.stringify(payload)} `)
    
    let publish = await this.bus.enqueue(queue, klass, JSON.stringify(payload));
    this.logger.debug(`publish: ${publish}`)
    return publish;
  };

  async publishHeartbeat() {
    let queue = this.options.incomingQueue;
    let klass = this.options.busClassKey;
    let payload = this.publishMetadata('QueueBus::Heartbeat', {});
    payload.bus_class_proxy  = 'QueueBus::Heartbeat';

    this.enqueue(queue, klass, JSON.stringify(payload), function(err, toRun){
      if(typeof callback === 'function'){ callback(err, toRun); }
    });
  };

  async publishAt(timestamp, eventType, args) {
    let queue   = this.options.incomingQueue;
    let klass   = this.options.busClassKey;
    let payload = this.publishMetadata(eventType, args);
    payload.bus_class_proxy  = 'QueueBus::Publisher';

    if(payload.bus_delayed_until === undefined){
      payload.bus_delayed_until = Math.floor(timestamp/1000);
    }

    delete payload.bus_published_at; // will get re-added upon re-publish

    await this.bus.enqueueAt(timestamp, queue, klass, JSON.stringify(payload));
  };

  async publishIn(time, eventType, args) {
    let timestamp = new Date().getTime() + time;
    await this.publishAt(timestamp, eventType, args);
  };

  publishMetadata(eventType, args) {
    let payload = {};
    this.logger.debug(`publishMetadata ${eventType} ${args}`);
    if(eventType){
      payload.bus_event_type = eventType;
    } else {
      payload.bus_event_type = null;
    }
    payload.bus_published_at = utils.timestamp();
    payload.bus_id           = utils.timestamp() + "-" + uuid.v4();
    payload.bus_app_hostname = os.hostname();
    payload.bus_timezone     = systemTimezone;
    try{
      payload.bus_locale     = process.env.LANG.split('.')[0];
    }catch(e){
      payload.bus_locale     = process.env.LANG;
    }

    // overwrite defaults
    for(let i in args){
      payload[i] = args[i];
    }
    this.logger.debug(`publishMetadata payload: ${JSON.stringify(payload)}`)
    return payload;
  };

}

module.exports = Publish;