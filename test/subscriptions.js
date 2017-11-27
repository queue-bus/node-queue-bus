const SpecHelper = require('./_specHelper.js');
const should = require('should');
let bus;
let helper = new SpecHelper();

const appKey   = 'testapp';
const priority = 'default';
const job      = 'testEvent';

describe('subscriptions', function(){

  beforeEach(async function(done){

    console.log(SpecHelper);
    await helper.logger.info('beforeEach subscription test');
    
    await helper.connect();
    bus = helper.bus;
    try {
    console.log(`bus keys: ${Object.keys(bus)} typeof: ${Object.getOwnPropertyNames(bus)}`);
  } catch (e) {
    console.log(e)
  }
    await helper.cleanup();
    done();
  });

  it.only('can subscribe', async function(done){
    console.log(`bus keys: ${Object.keys(bus)} typeof: ${Object.getOwnPropertyNames(bus)}`);
    try {
      await bus.subscribe(appKey, priority, job, { bus_event_type : "key" });
    } catch (e) {
      console.log(e)
    }  
    done();
  });

  it('can list subscriptions', function(done){
    bus.subscribe(appKey, priority, job, { bus_event_type : "key" }, function(err, combined_queue_name){
      bus.subscriptions(function(err, subscriptions){
        var collection = subscriptions.testapp.testapp_default_testEvent;
        collection.queue_name.should.equal('testapp_default');
        collection.key.should.equal('testapp_default_testEvent');
        collection.class.should.equal(job);
        collection.matcher.bus_event_type.should.equal("key");
        done();
      });
    });
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