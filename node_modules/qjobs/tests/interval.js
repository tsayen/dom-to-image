#!/usr/bin/env node
var assert = require('assert');
var qjob = require('../qjobs');

// maximum number of jobs executed in parallels
var maxConcurrency = 5;

// delay between each group of maxConcurrency jobs done
var interval = 1000;

var q = new qjob({
    maxConcurrency:maxConcurrency,
    interval:interval
});

// number of total jobs
var maxJobs = 20;

// tests dedicated variables
var testExecutedJobs = 0;
var testNbSleep = 0;

// warning, if you change maxConcurrency, maxJobs
// or interval variable, you will have to review
// the testMaxNbSleep value
var testMaxNbSleep = 4;

var myjob = function(args,next) {
    setTimeout(function() {
        testExecutedJobs++;
        next();
    },args[1]);
}

// Let's add 10 job and add them to the queue
for (var i = 0; i<maxJobs; i++) {
    q.add(myjob,['test'+i,Math.random()*1000]);
}

q.on('end',function() {
    assert.equal(testExecutedJobs, maxJobs);
    assert.equal(testNbSleep, testMaxNbSleep);
    //console.log('Done');
});

q.on('jobStart',function(args) {
    //console.log(args[0]+' wait for '+args[1]+' ms');
});

q.on('sleep',function() {
    testNbSleep++;
    //console.log('zzZZzzzz for '+interval+'ms',testNbSleep);
});

q.on('continu',function() {
    //console.log('WAKE !');
});

q.run();


