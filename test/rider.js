const SpecHelper = require('./_specHelper.js');
const should = require('should');
const expect = require('chai').expect;
const os = require('os');
const SchedulerPrototype = require("node-resque").scheduler;
let bus;
let rider;
let helper = new SpecHelper();

const priority = 'default';
const job      = 'testEvent';

let subscribe_a = async () => {
  await bus.subscribe('app_a', priority, 'job_a', { bus_event_type : "event_a" });
};

let subscribe_b = async () => {
  await bus.subscribe('app_b', priority, 'job_b', { bus_event_type : "event_b" });
};

let subscribe_c = async () => {
  await bus.subscribe('app_c', priority, 'job_c', { bus_event_type : "bus_special_value_present" });
};

let subscribe_d = async () => {
  await bus.subscribe('app_d', priority, 'job_d', { bus_event_type : /^.*matcher.*$/g });
};

let subscribe_all = async () => {
  await Promise.all([subscribe_a(), 
                     subscribe_b(),
                     subscribe_c(),
                     subscribe_d() ]);  
};

let getAllQueues = async () => {
  let events_a = await bus.connection.redis.lrange(helper.namespace + ":queue:app_a_default", 0, 9999);
  let events_b = await bus.connection.redis.lrange(helper.namespace + ":queue:app_b_default", 0, 9999);
  let events_c = await bus.connection.redis.lrange(helper.namespace + ":queue:app_c_default", 0, 9999);
  let events_d = await bus.connection.redis.lrange(helper.namespace + ":queue:app_d_default", 0, 9999);
  return { a: events_a,
           b: events_b,
           c: events_c,
           d: events_d
          };
};

describe('rider', function(){

  beforeEach(async () => {

    await helper.connect();
    let cleanup = await helper.cleanup();
    bus = helper.bus;
    rider = helper.rider;
    expect(cleanup).to.equal(undefined);

  });

  afterEach(async () => {
    await rider.end();
    await helper.cleanup(); 
    await helper.quit();
  });

  it.only('will append metadata to driven events', async () => {
    await subscribe_all();
    await bus.publish('event_a', {thing: 'stuff'});
    await rider.start();
    await helper.sleep(helper.timeout * 3);
    let data = await getAllQueues();
    console.log(`data: ${JSON.stringify(data)}`)
    let e = JSON.parse(data.a);
    let paylaod = JSON.parse(e.args[0]);
    should.exist(paylaod.bus_driven_at);
    paylaod.bus_rider_queue.should.equal('app_a_default');
    paylaod.bus_rider_app_key.should.equal('app_a');
    paylaod.bus_rider_sub_key.should.equal('app_a_default_job_a');
    paylaod.bus_rider_class_name.should.equal('job_a');
    paylaod.bus_event_type.should.equal('event_a');

  });

  it('subscriptions: direct events', function(done){
    subscribe_all(function(){
      bus.publish('event_a', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(1);
            data.b.length.should.equal(0);
            data.c.length.should.equal(1);
            data.d.length.should.equal(0);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('subscriptions: special values', function(done){
    subscribe_all(function(){
      bus.publish('event_xx', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(0);
            data.b.length.should.equal(0);
            data.c.length.should.equal(1);
            data.d.length.should.equal(0);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('subscriptions: regexp (normal, negative)', function(done){
    subscribe_all(function(){
      bus.publish('event_d', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(0);
            data.b.length.should.equal(0);
            data.c.length.should.equal(1);
            data.d.length.should.equal(0);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });
  it('subscriptions: regexp (normal, positive)', function(done){
    subscribe_all(function(){
      bus.publish('event_matcher_should_work', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(0);
            data.b.length.should.equal(0);
            data.c.length.should.equal(1);
            data.d.length.should.equal(1);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('will ignore events that do not match any subscriptions', function(done){
    bus.subscribe('app_a', priority, 'job_a', { bus_event_type : "event_a" }, function(){
      bus.publish('something_crazy', {thing: 'stuff'}, function(){
        rider.start();
        setTimeout(function(){
          getAllQueues(function(data){
            data.a.length.should.equal(0);
            data.b.length.should.equal(0);
            data.c.length.should.equal(0);
            data.d.length.should.equal(0);
            done();
          });
        }, (specHelper.timeout * 3));
      });
    });
  });

  it('can publish a delayed job', function(done){
    var scheduler = new SchedulerPrototype({connection: specHelper.connectionDetails, timeout: specHelper.timeout});
    scheduler.connect(function(){
      scheduler.start();
      subscribe_all(function(){
        bus.publishIn(100, 'event_a', {thing: 'stuff'}, function(){
          rider.start();
          setTimeout(function(){
            getAllQueues(function(data){
              data.a.length.should.equal(1);
              data.b.length.should.equal(0);
              data.c.length.should.equal(1);
              data.d.length.should.equal(0);
              scheduler.end(done);
            });
          }, (specHelper.timeout * 5));
        });
      });
    });
  });

  describe('matchers & special patterns', function(){

    var matcherHelper = function(matcher, key, value, callback){
      bus.subscribe('app_a', priority, 'job_a', { key : matcher}, function(){
        var data = {};
        data[key] = value;
        bus.publish('event_xxx', data, function(){
          rider.start();
          setTimeout(function(){
            specHelper.redis.lrange(specHelper.namespace + ":queue:app_a_default", 0, 9999, function(err, events){
              callback(err, events);
            });
          }, (specHelper.timeout * 3));
        });
      });
    };

    it(':key', function(done){
      matcherHelper('bus_special_value_key', 'key', 'value', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':blank', function(done){
      matcherHelper('bus_special_value_blank', 'key', '', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':empty', function(done){
      matcherHelper('bus_special_value_empty', 'key', null, function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':nil', function(done){
      matcherHelper('bus_special_value_nil', 'Otherkey', 'thing', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':value', function(done){
      matcherHelper('bus_special_value_value', 'key', 'x', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
    it(':present', function(done){
      matcherHelper('bus_special_value_present', 'key', 'x', function(err, events){
        events.length.should.equal(1);
        done();
      });
    });
  });

  describe('heartbeat', function(){

    it('can work out the QueueBus::Heartbeat job', function(done){
      var now = new Date();
      bus.subscribe('time_app', priority, 'time_job', { bus_event_type : "heartbeat_minutes" }, function(){
        bus.publishHeartbeat(function(){
          rider.start();
          setTimeout(function(){
            specHelper.redis.lrange(specHelper.namespace + ":queue:time_app_default", 0, 9999, function(err, events){
              events.length.should.equal(1);
              var event = JSON.parse(events[0]);
              var args = JSON.parse(event.args[0]);

              event.class.should.equal('QueueBus::Worker');
              event.queue.should.equal('time_app_default');
              args.bus_rider_sub_key.should.equal('time_app_default_time_job');
              args.minute.should.equal( now.getMinutes() );
              args.hour.should.equal( now.getHours() );
              args.day.should.equal( now.getDate() );
              args.month.should.equal( now.getMonth() + 1 );
              args.year.should.equal( now.getFullYear() );

              done();
            });
          }, 1000);
        });
      });
    });

    it('will only heartbeat up to the present time, no matter how many calls', function(){
      var now = new Date();
      bus.subscribe('time_app', priority, 'time_job', { bus_event_type : "heartbeat_minutes" }, function(){
        bus.publishHeartbeat(function(){
        bus.publishHeartbeat(function(){
        bus.publishHeartbeat(function(){
          rider.start();
          setTimeout(function(){
            specHelper.redis.lrange(specHelper.namespace + ":queue:time_app_default", 0, 9999, function(err, events){
              events.length.should.equal(1);
              done();
            });
          }, 1000);
        });
        });
        });
      });
    });

  });

});