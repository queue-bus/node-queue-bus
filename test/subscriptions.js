const SpecHelper = require('./_specHelper.js');
const asyncDump = require('./async-dump.js');
const should = require('should');
const expect = require('chai').expect;
let bus;
let helper = new SpecHelper();

const appKey   = 'testapp';
const priority = 'default';
const job      = 'testEvent';

describe.only('subscriptions', function(){

  beforeEach(async () => {
    await helper.connect();
    bus = helper.bus;
   
    let cleanup = await helper.cleanup()
    expect(cleanup).to.equal(undefined);
  });

  afterEach(async () => {
    await helper.cleanup(); 
    await helper.quit();
    //global.asyncDump();
  });

  it('can subscribe', async () => {
    let sub = await bus.subscribe(appKey, priority, job, { bus_event_type : "key" });
    expect(sub).to.equal('testapp_default');
  });

  it('can list subscriptions', async () => {
    let result = await bus.subscribe(appKey, priority, job, { bus_event_type : "key" });
    let subscriptions = await bus.subscriptions();
    let collection = subscriptions.testapp.testapp_default_testEvent;
    collection.queue_name.should.equal('testapp_default');
    collection.key.should.equal('testapp_default_testEvent');
    collection.class.should.equal(job);
    collection.matcher.bus_event_type.should.equal("key");
  });

  it('can unsubscribe one subscription', async () => {
    await bus.subscribe(appKey, priority, job, { bus_event_type : "key" });
    await bus.subscribe(appKey, priority, 'otherJob', { bus_event_type : "keyA" });
    await bus.unsubscribe(appKey, priority, job);
    let subscriptions = await bus.subscriptions();
    should.not.exist(subscriptions[appKey][job]);
    should.exist(subscriptions[appKey]['testapp_default_otherJob']);
  });

  it('can unsubscribe all subscriptions', async () => {
    await bus.subscribe(appKey, priority, job, { bus_event_type : "keyA" });
    await bus.subscribe(appKey, priority, 'otherJob', { bus_event_type : "keyA" });
    await bus.unsubscribeAll(appKey);
    let subscriptions = await bus.subscriptions();
    should.not.exist(subscriptions.testapp);
  });

});