require "bundler/setup"
Bundler.require(:default)
require 'sinatra'
require 'resque/server'
require 'resque-scheduler'
require 'resque/scheduler/server'
require 'resque_bus/server'

run Rack::URLMap.new \
  "/" => Resque::Server.new