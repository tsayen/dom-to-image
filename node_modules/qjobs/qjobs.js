var util = require('util');
var events = require('events').EventEmitter;

var qjob = function(options) {

    if(false === (this instanceof qjob)) {
        return new qjob(options);
    }

    this.maxConcurrency  = 10;
    this.jobsRunning = 0;
    this.jobsDone = 0;
    this.jobsTotal = 0;
    this.timeStart;
    this.jobId = 0;
    this.jobsList = [];
    this.paused = false;
    this.pausedId = null;
    this.lastPause = 0;

    this.interval = null;
    this.stopAdding = false;
    this.sleeping = false;

    this.aborting = false;

    if (options) {
        this.maxConcurrency = options.maxConcurrency || this.maxConcurrency;
        this.interval = options.interval || this.interval;
    }
    events.call(this);
};

util.inherits(qjob, events);

/*
 * helper to set max concurrency
 */
qjob.prototype.setConcurrency = function(max) {
    this.maxConcurrency = max;
}

/*
 * helper to set delay between rafales
 */
qjob.prototype.setInterval = function(delay) {
    this.interval = delay;
}

/*
 * add some jobs in the queue
 */
qjob.prototype.add = function(job,args) {
    var self = this;
    self.jobsList.push([job,args]);
    self.jobsTotal++;
}

/*
 *
 */
qjob.prototype.sleepDueToInterval = function() {
    var self = this;

    if (this.interval === null) {
        return;
    }

    if (this.sleeping) {
        return true;
    }

    if (this.stopAdding) {

        if (this.jobsRunning > 0) {
            //console.log('waiting for '+jobsRunning+' jobs to finish');
            return true;
        }

        //console.log('waiting for '+rafaleDelay+' ms');
        this.sleeping = true;
        self.emit('sleep');

        setTimeout(function() {
            this.stopAdding = false;
            this.sleeping = false;
            self.emit('continu');
            self.run();
        }.bind(self),this.interval);

        return true;
    }

    if (this.jobsRunning + 1 == this.maxConcurrency) {
        //console.log('max concurrent jobs reached');
        this.stopAdding = true;
        return true;
    }
}

/*
 * run the queue
 */
qjob.prototype.run = function() {

    var self = this;

    // first launch, let's emit start event
    if (this.jobsDone == 0) {
        self.emit('start');
        this.timeStart = Date.now();
    }

    if (self.sleepDueToInterval()) return;

    if (self.aborting) {
        this.jobsList = [];
    }

    // while queue is empty and number of job running
    // concurrently are less than max job running,
    // then launch the next job

    while (this.jobsList.length && this.jobsRunning < this.maxConcurrency) {
        // get the next job and
        // remove it from the queue
        var job = self.jobsList.shift();

        // increment number of job running
        self.jobsRunning++;

        // fetch args for the job
        var args = job[1];

        // add jobId in args
        args._jobId = this.jobId++;

        // emit jobStart event
        self.emit('jobStart',args);

        // run the job
        setTimeout(function() {
            this.j(this.args,self.next.bind(self,this.args));
        }.bind({j:job[0],args:args}),1);
    }

    // all jobs done ? emit end event
    if (this.jobsList.length == 0 && this.jobsRunning == 0) {
        self.emit('end');
    }
}

/*
 * a task has been terminated,
 * so 'next()' has been called
 */
qjob.prototype.next = function(args) {

    var self = this;

    // update counters
    this.jobsRunning--;
    this.jobsDone++;

    // emit 'jobEnd' event
    self.emit('jobEnd',args);

    // if queue has been set to pause
    // then do nothing
    if (this.paused) return;

    // else, execute run() function
    self.run();
}

/*
 * You can 'pause' jobs.
 * it will not pause running jobs, but
 * it will stop launching pending jobs
 * until paused = false
 */
qjob.prototype.pause = function(status) {
    var self = this;
    this.paused = status;
    if (!this.paused && this.pausedId) {
        clearInterval(this.pausedId);
        self.emit('unpause');
        this.run();
    }
    if (this.paused && !this.pausedId) {
        self.lastPause = Date.now();
        this.pausedId = setInterval(function() {
            var since = Date.now() - self.lastPause;
            self.emit('pause',since);
        },1000);
        return;
    }
}

qjob.prototype.stats = function() {

    var now =  Date.now();

    var o = {};
    o._timeStart = this.timeStart || 'N/A';
    o._timeElapsed = (now - this.timeStart) || 'N/A';
    o._jobsTotal = this.jobsTotal;
    o._jobsRunning = this.jobsRunning;
    o._jobsDone = this.jobsDone;
    o._progress = Math.floor((this.jobsDone/this.jobsTotal)*100);
    o._concurrency = this.maxConcurrency;

    if (this.paused) {
        o._status = 'Paused';
        return o;
    }

    if (o._timeElapsed == 'N/A') {
        o._status = 'Starting';
        return o;
    }

    if (this.jobsTotal == this.jobsDone) {
        o._status = 'Finished';
        return o;
    }

    o._status = 'Running';
    return o;
}

qjob.prototype.abort = function() {
    this.aborting = true;
}

module.exports = qjob;
