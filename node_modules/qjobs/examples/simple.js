
// My non blocking main job
var myjob = function(args,next) {

    // do nothing now but in 1 sec

    setTimeout(function() {

        // if i'm job id 10 or 20, let's add
        // another job dynamicaly in the queue.
        // It can be usefull for network operation (retry on timeout)

        if (args._jobId==10||args._jobId==20) {
            myQueueJobs.add(myjob,[999,'bla '+args._jobId]);
        }
        next();
    },Math.random(1000)*2000);
}

// Notice the "new" before require, to be able to use more
// than one queue independently
var myQueueJobs = new require('../qjobs')();

// Let's add 30 job and add them to the queue
for (var i = 0; i<30; i++) {
    myQueueJobs.add(myjob,[i,'test1']);
}

// I want to know when the first job has started
myQueueJobs.on('start',function() {
    console.log('starting ...');
    console.log(JSON.stringify(myQueueJobs.stats()));
});

// I want to know when the last job has ended
myQueueJobs.on('end',function() {
    clearInterval(statId);
    console.log('end');
    console.log(JSON.stringify(myQueueJobs.stats()));
});

// I want to know when each job has started
myQueueJobs.on('jobStart',function(args) {
    console.log('jobStart',args);
});

// I want to know when each job has ended
myQueueJobs.on('jobEnd',function(args) {

    console.log('jobEnd',args);

    // If i'm jobId 10, then make a pause of 5 sec

    if (args._jobId == 10) {
        myQueueJobs.pause(true);
        setTimeout(function() {
            myQueueJobs.pause(false);
        },5000);
    }
});

// I want to know if queue is in pause every sec
myQueueJobs.on('pause',function(since) {
    console.log('in pause since '+since+' milliseconds');
});


// JOBS !! leeeeeeeeeet's staaaaaaaart !
myQueueJobs.run();

var statId = setInterval(function() {
    console.log(JSON.stringify(myQueueJobs.stats()));
},1000);
