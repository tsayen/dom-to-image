[![Build Status](https://secure.travis-ci.org/franck34/qjobs.png)](http://travis-ci.org/franck34/qjobs)

**qjobs**
==================
***Efficient queue job manager module for nodejs.***

Features
--------------
* Concurrency limiter
* Dynamic queue, a job can be added while the queue is running
* Optional delay before continuing after max concurrency has been reached
* Support of pause/unpause
* Events emitter based: start, end, sleep, continu, jobStart, jobEnd
* Quick statistic function, so you can know where the queue is, at regular interval

For what it can be usefull ?
---------------------
Jobs which needs to run in parallels, but in a controled maner, example: 
* Network scanners
* Parallels monitoring jobs
* Images/Videos related jobs 


Compatibility :
------------------
* not tested with nodejs < 0.10


Examples
--------------------

(take a look at tests directory if you are looking for running samples)


```
var qjobs = new require('./qjobs');
                                
// My non blocking main job     
var myjob = function(args,next) {
    setTimeout(function() {
        console.log('Do something interesting here',args);
        next();
    },1000);
}

var q = new qjobs({maxConcurrency:10});

// Let's add 30 job to the queue
for (var i = 0; i<30; i++) {
    q.add(myjob,[i,'test '+i]);
}

q.on('start',function() {
    console.log('Starting ...');
});

q.on('end',function() {
    console.log('... All jobs done');
});

q.on('jobStart',function(args) {
    console.log('jobStart',args);
});

q.on('jobEnd',function(args) {

    console.log('jobend',args);

    // If i'm jobId 10, then make a pause of 5 sec

    if (args._jobId == 10) {
        q.pause(true);
        setTimeout(function() {
            q.pause(false);
        },5000);
    }
});

q.on('pause',function(since) {
    console.log('in pause since '+since+' milliseconds');
});

q.on('unpause',function() {
    console.log('pause end, continu ..');
});

q.run();

//q.abort() will empty jobs list

```

