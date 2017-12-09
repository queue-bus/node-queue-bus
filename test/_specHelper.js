const Redis = require('ioredis');
const Bus = require(__dirname + "/../index.js").Bus;
const Rider = require(__dirname + "/../index.js");
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
      console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
      // application specific logging, throwing an error, or other logic here
    });
  }
  
  async connect () {
     this.logger.info('SpecHelper connect starts')
     this.redis = Redis.createClient(this.connectionDetails.port, this.connectionDetails.host, this.connectionDetails.options)
     this.redis.setMaxListeners(0)
     if (this.connectionDetails.password !== null && this.connectionDetails.password !== '') {
       await this.redis.auth(this.connectionDetails.password)
     }
     await this.redis.select(this.connectionDetails.database);
     this.connectionDetails.redis = this.redis;
     
     this.bus = new Bus({connection: this.connectionDetails});
     console.log(`bus definition ${Object.keys(this.bus)} redis: ${Object.keys(this.bus.connection.redis)}`);
     this.logger.info(`created bus ${this.bus} subscribe: ${this.bus.subscribe}`)
     this.logger.info('SpecHelper connect ends');
  }

  async cleanup () {
     let keys = await this.redis.keys(this.namespace + '*')
     if (keys.length > 0) { await this.redis.del(keys) }
  }
}
module.exports=SpecHelper;
