#!/usr/bin/env node
var program = require('commander');
var request = require('request');
var Zipfile   = require('adm-zip');
var package = require('../package.json');
var path    = require('path');
var boilerplate = 'http://github.com/koapi/koapi-boilerplate/archive/master.zip';

program.version(package.version);

program.command('init [dir]').description('Init koapi application')
       .action(function(dir, options){
         request({encoding: null, method:'GET', url:boilerplate}, function(err, res){
           var file = new Zipfile(res.body);
           file.extractEntryTo('koapi-boilerplate-master/', path.resolve(dir), false);
           console.log('Initialized koapi application successed!');
         });
       });

program.parse(process.argv);
