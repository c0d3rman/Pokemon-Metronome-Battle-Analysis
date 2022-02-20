// This scheduler makes sure we don't fire off more than 10,000 promises at a time to avoid memory issues
// If too many promises are "in flight", the loop that fires them will simply wait
// It's very fragile and not resilient to multiple consumers calling isReady and isDone so be careful
// This doesn't define the number of battles actually running – that's workerpool, and it's only a single-digit number (based on your CPUs)
class Scheduler {
    // Max is the maximum number of promises allowed to be "in flight" at any given moment.
    constructor(max=10000) {
        this.count = 0;
        this.max = max;
        this.resolve = null;
    }

    // After firing off a task, you should call this function with its promise,
    // so the scheduler can track its completion.
    // You should only be doing this after you have already confirmed the scheduler has room (with isReady).
    schedule(promise) {
        this.count++;
        const self = this;
        promise.then(() => {
            self.count--;
            if (self.resolve) self.resolve();
        });
    }

    // Returns a promise that you can await until the scheduler is ready for a new task.
    isReady() {
        const self = this;
        return new Promise((resolve, reject) => {
            if (self.count <= self.max) {
                resolve();
            } else {
                self.resolve = resolve;
            }
        });
    }

    // Checks if all tasks' promises are done.
    // You should only call this after you're done firing off and scheduling new tasks,
    // and won't be calling isReady anymore.
    isDone() {
        const self = this;
        return new Promise((resolve, reject) => {
            if (self.count == 0) {
                resolve();
            } else {
                self.resolve = () => { if (self.count == 0) resolve(); }
            }
        });
    }
};

module.exports = {
    Scheduler: Scheduler
}