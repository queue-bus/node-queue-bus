const SpecHelper = require('./_specHelper.js');
const asyncDump = require('./async-dump.js');
const should = require('should');
const expect = require('chai').expect;
let bus;
let helper = new SpecHelper();

const appKey   = 'testapp';
const priority = 'default';
const job      = 'testEvent';

describe('subscriptions', function(){

  beforeEach(async () => {
    try {
      console.log(SpecHelper);
      helper.logger.info('beforeEach subscription test');
      
      await helper.connect();
      helper.logger.info('after helper connect subscription test');
      bus = helper.bus;
     
      console.log(`bus keys: ${Object.keys(bus)} typeof: ${Object.getOwnPropertyNames(bus)}`);
      console.log('about to cleanup');
      let cleanup = await helper.cleanup()
      console.log('done cleaning');
      expect(cleanup).to.equal(undefined);
    } catch (e) {
      console.log(e)
    }

  });

  after(function () {
    helper.quit();
    //global.asyncDump();
  });

  it.only('can subscribe', async () => {
    console.log(`bus keys: ${Object.keys(bus)} typeof: ${Object.getOwnPropertyNames(bus)}`);
    console.log('starting')
    console.log(`bus: ${bus} subscribe: ${bus.subscribe}`)
    let sub = await bus.subscribe(appKey, priority, job, { bus_event_type : "key" });
    expect(sub).to.equal('testapp_default');
    console.log(`ending sub:${sub}`)
  });

  it('can list subscriptions', async () => {
    console.log(`bus.subscribe(appKey: ${appKey}, priority: ${priority}, job: ${job}, { bus_event_type : "key" });`);
    let result = await bus.subscribe(appKey, priority, job, { bus_event_type : "key" });
    console.log(`result: ${JSON.stringify(result)}`)
    let subscriptions = await bus.subscriptions();
    console.log(`subscriptions: ${JSON.stringify(subscriptions)}`)
    let collection = subscriptions.testapp.testapp_default_testEvent;
    collection.queue_name.should.equal('testapp_default');
    collection.key.should.equal('testapp_default_testEvent');
    collection.class.should.equal(job);
    collection.matcher.bus_event_type.should.equal("key");
  });

  it('can unsubscribe one subscription', function(done){
    bus.subscribe(appKey, priority, job, { bus_event_type : "key" }, function(err, combined_queue_name){
      bus.subscribe(appKey, priority, 'otherJob', { bus_event_type : "keyA" }, function(err, combined_queue_name){
        bus.unsubscribe(appKey, priority, job, function(){
          bus.subscriptions(function(err, subscriptions){
            should.not.exist(subscriptions[appKey][job]);
            should.exist(subscriptions[appKey]['testapp_default_otherJob']);
            done();
          });
        });
      });
    });
  });

  it('can unsubscribe all subscriptions', function(done){
    bus.subscribe(appKey, priority, job, { bus_event_type : "keyA" }, function(err, combined_queue_name){
      bus.subscribe(appKey, priority, 'otherJob', { bus_event_type : "keyA" }, function(err, combined_queue_name){
        bus.unsubscribeAll(appKey, function(){
          bus.subscriptions(function(err, subscriptions){
            should.not.exist(subscriptions.testapp);
            done();
          });
        });
      });
    });
  });

});