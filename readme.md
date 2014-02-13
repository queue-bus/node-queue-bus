# node-resquebus

[![Build Status](https://travis-ci.org/taskrabbit/node-resquebus.png?branch=master)](https://travis-ci.org/taskrabbit/node-resquebus)

## Acknowledgments
- [Resque-Bus in Ruby](https://github.com/taskrabbit/resque-bus)
- [Original Blog Post](http://tech.taskrabbit.com/blog/2013/09/28/resque-bus/)

## What?

ResqueBus is a plugin for [Resque](https://github.com/resque/resque) (we use [node-resque](https://github.com/taskrabbit/node-resque) for this project) which transforms Resque into a distributed message bus.  This allows more than one application to share workloads on the bus, and for events/jobs to fan out to more than one application.  Perhaps you want the `user_created` event to be consumed by the `analytics` and `email` applications... then ResqueBus is for you.

This application is a [port of the main ruby project](https://github.com/taskrabbit/resque-bus) to node.js.  This project is likley to be behind the Ruby project.

## Ecosystem

![img](https://raw.github.com/taskrabbit/node-resquebus/master/doc/data_flow.jpg)

There are a few roles which are required to use the resquebus:

## Notes
- When subscribing, `appKey` will alwats be lowercased, and all spaves will be replaced with `"_"`
- When using a regexp matcher, we will attempt to [convert JS's RegExp to a ruby regular expression](https://github.com/taskrabbit/node-resquebus/blob/master/lib/sections/utils.js#L28-L84).  This conversion is less than perfect, and there are liley to be problems with more complex matchers.  Please let us know if you find something wrong and open a GitHub issue.