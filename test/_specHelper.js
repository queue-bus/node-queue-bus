const Redis = require('ioredis');
const Bus = require(__dirname + "/../index.js").Bus;
const Rider = require(__dirname + "/../index.js").Rider;
const winston = require('winston');
const namespace = "resque_test";

class SpecHelper {
  constructor () {
    this.bus = null;
    this.rider = null;
    this.namespace = namespace;
    this.timeout = 500;
    this.logger = new (winston.createLogger)({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console(),
        new (winston.transports.File)({filename: '/Users/pdevine/projects/taskrabbit/node-queue-bus/debug.log'})
      ]
});
    this.connectionDetails = {
      package:  'ioredis',
      host:      "127.0.0.1",
      password:  "",
      port:      6379,
      database:  1,
      namespace: namespace,
      // looping: true
    };

    process.on('unhandledRejection', (reason, p) => {
      this.logger.error(`Unhandled Rejection at: Promise ${p} reason: ${reason}`);
    });
  }
  
  async connect () {
     this.logger.debug('SpecHelper connect starts')
     //this.redis = new Redis(this.connectionDetails.port, this.connectionDetails.host, this.connectionDetails.options);
     //this.redis.setMaxListeners(0)
     if (this.connectionDetails.password !== null && this.connectionDetails.password !== '') {
       let auth = await this.redis.auth(this.connectionDetails.password);
     }
    // let database = await this.redis.select(this.connectionDetails.database);
     //this.logger.debug(`database: ${database}`);  
     //this.connectionDetails.redis = this.redis;
     
     this.bus = new Bus({connection: this.connectionDetails});
     this.rider = new Rider({connection: this.connectionDetails, timeout: this.timeout});
     await this.bus.connection.connect();
     this.logger.debug(`bus definition ${Object.keys(this.bus)} connection: '${Object.keys(this.bus.connection)}'`);
     this.logger.debug(`created bus ${this.bus} subscribe: ${this.bus.subscribe}`)
     this.logger.debug('SpecHelper connect ends');
  }

  async cleanup () {
     let keys = await this.bus.connection.redis.keys(this.namespace + '*')
     this.logger.debug(`what redis.keys ${keys}`)
     if (keys.length > 0) { await this.bus.connection.redis.del(keys) }
  }

  async quit() {
    this.logger.debug('quitting redis');
    this.bus.connection.redis.quit();
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
module.exports=SpecHelper;
