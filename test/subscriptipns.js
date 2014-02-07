var specHelper = require(__dirname + "/_specHelper.js").specHelper;
var should = require('should');
var bus;

var appKey   = 'testapp';
var priority = 'default';
var job      = 'testEvent';

describe('subscriptions', function(){

  beforeEach(function(done){
    specHelper.connect(function(){
      specHelper.cleanup(function(){
        bus = new specHelper.BusPrototype({connection: specHelper.connectionDetails}, function(){
          done();
        });
      });
    });
  });

  it('can subscribe', function(done){
    bus.subscribe(appKey, priority, job, { bus_event_type : "key" }, function(err, combined_queue_name){
      should.not.exist(err);
      combined_queue_name.should.equal("testapp_default");
      done();
    })
  })

  it('can list subscriptions', function(done){
    bus.subscribe(appKey, priority, job, { bus_event_type : "key" }, function(err, combined_queue_name){
      bus.subscriptions(function(err, subscriptions){
        var collection = subscriptions.testapp.testapp_default_testEvent
        collection.queue_name.should.equal('testapp_default');
        collection.key.should.equal('testapp_default_testEvent');
        collection.class.should.equal(job);
        collection.matcher.bus_event_type.should.equal("key");
        done()
      });
    })
  });

  it('can unsubscribe one subscription', function(done){
    bus.subscribe(appKey, priority, job, { bus_event_type : "key" }, function(err, combined_queue_name){
      bus.subscribe(appKey, priority, 'otherJob', { bus_event_type : "keyA" }, function(err, combined_queue_name){
        bus.unsubscribe(appKey, priority, job, function(){
          bus.subscriptions(function(err, subscriptions){
            should.not.exist(subscriptions[appKey][job]);
            should.exist(subscriptions[appKey]['testapp_default_otherJob']);
            done();
          })
        })
      })
    })
  });

  it('can unsubscribe all subscriptions', function(done){
    bus.subscribe(appKey, priority, job, { bus_event_type : "keyA" }, function(err, combined_queue_name){
      bus.subscribe(appKey, priority, 'otherJob', { bus_event_type : "keyA" }, function(err, combined_queue_name){
        bus.unsubscribeAll(appKey, function(){
          bus.subscriptions(function(err, subscriptions){
            should.not.exist(subscriptions.testapp);
            done();
          })
        })
      })
    })
  });

});