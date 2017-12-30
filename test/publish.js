const SpecHelper = require("./_specHelper.js");
const should = require('should');
const expect = require('chai').expect;
const os = require('os');
const NodeResque = require("node-resque")
let bus;
let helper = new SpecHelper();

const appKey   = 'testapp';
const priority = 'default';
const job      = 'testEvent';
let hook;

describe('publish', function(){

  beforeEach(async () => { 
    await helper.connect();
    bus = helper.bus;
   
    let cleanup = await helper.cleanup()
    expect(cleanup).to.equal(undefined);
  });

  afterEach(async () => { 
    await helper.cleanup(); 
    await helper.quit();
  });

  it('can publish', async () => {
    let publish = await bus.publish(job, {'thing': 'stuff'})
    expect(publish).to.be.true;
  });

  it('will append metadata to published events', async () => {
    const now = Math.floor(new Date().getTime() / 1000);
    let publish = await bus.publish(job, {'thing': 'stuff'});
    let key = helper.namespace + ':queue:bus_incoming';
    let element = await bus.connection.redis.lpop(key);
    let elem = JSON.parse(element);
    let payload = JSON.parse(elem.args[0]);
    elem.class.should.equal("QueueBus::Worker");
    payload.bus_class_proxy.should.equal("QueueBus::Driver");
    elem.queue.should.equal("bus_incoming");
    payload.thing.should.equal('stuff');
    payload.bus_event_type.should.equal("testEvent");
    payload.bus_published_at.should.equal(now);
    should.exist(payload.bus_id);
    payload.bus_app_hostname.should.equal(os.hostname());
  });

  it('can publishAt', async () => {
    let t = (new Date().getTime()) + 1000;
    let timestamp = Math.round(t/1000);
    let stuff = await bus.publishAt(t, job, {'thing': 'stuff'});
    let key = (helper.namespace + ':delayed_queue_schedule');
    let score = await bus.connection.redis.zscore(key, timestamp);
    score.should.equal(String(timestamp));
    let delayedKey = (helper.namespace + ':delayed:' + timestamp);
    let elem = await bus.connection.redis.lpop(delayedKey);
    elem = JSON.parse(elem);
    let payload = JSON.parse(elem.args[0]);
    elem.class.should.equal("QueueBus::Worker");
    payload.bus_class_proxy.should.equal("QueueBus::Publisher");
    elem.queue.should.equal("bus_incoming");
  });

  it('can publishIn', async () => {
    let t = (new Date().getTime()) + 1000;;
    let timestamp = Math.round((new Date().getTime() + t) / 1000);
    let stuff = await bus.publishIn(t, job, {'thing': 'stuff'});
    let key = (helper.namespace + ':delayed_queue_schedule'); 
    let score = await bus.connection.redis.zscore(key, timestamp);
    score.should.equal(String(timestamp));
    let delayedKey = (helper.namespace + ':delayed:' + timestamp);
    let elem = await bus.connection.redis.lpop(delayedKey);
    elem = JSON.parse(elem);
    let payload = JSON.parse(elem.args[0]);
    elem.class.should.equal("QueueBus::Worker");
    payload.bus_class_proxy.should.equal("QueueBus::Publisher");
    elem.queue.should.equal("bus_incoming");
  });

  it('delayed publish jobs will be moved to incomming eventually', async () => {
    this.timeout(helper.timeout * 4);
    let scheduler = new NodeResque.Scheduler({connection: helper.connectionDetails, timeout: helper.timeout});
    await scheduler.connect();
    scheduler.start();
    let t = (new Date().getTime()) + 1000;
    let timestamp = Math.round(t/1000);
    await bus.publishAt(t, job, {'thing': 'stuff'});
    console.log('start');
    await helper.sleep(helper.timeout * 3);
    console.log('end');
    let key = helper.namespace + ':queue:bus_incoming';
    let elem = await bus.connection.redis.lpop(key);
    console.log(`key ${key} element: ${elem} ${JSON.stringify(elem)}`);
    elem = JSON.parse(elem);
    let payload = JSON.parse(elem.args[0]);
    elem.class.should.equal("QueueBus::Worker");
    payload.bus_class_proxy.should.equal("QueueBus::Publisher");
    elem.queue.should.equal("bus_incoming");
    payload.thing.should.equal('stuff');
  });

});