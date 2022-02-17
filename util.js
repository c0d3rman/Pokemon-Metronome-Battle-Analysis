const fs = require('fs');
const chalk = require('chalk');
const {Teams, TeamValidator} = require('./pokemon-showdown');

// Function to colorize numbers from red to green
function getColor(n, min, max) {
    if (n < min || n > max) {
        return chalk.yellow;
    }
    if (min == max) {
        return chalk.white;
    }

    n = (n - min) / (max - min);

    if (n < 0.5) {
        return chalk.rgb(255, Math.round(255 * n * 2), Math.round(255 * n * 2));
    } else {
        return chalk.rgb(Math.round(255 * (1 - n) * 2), 255, Math.round(255 * (1 - n) * 2));
    }
}

// Function for pretty-printing matrices
// Modified from https://gist.github.com/lbn/3d6963731261f76330af
function matprint(mat, stringifier) {
    let shape = [mat.length, mat[0].length];
    function col(mat, i) {
        return mat.map(row => row[i]);
    }
    let colMaxes = [];
    for (let i = 0; i < shape[1]; i++) {
        colMaxes.push(Math.max.apply(null, col(mat, i).map(n => n.toString().length)));
    }

    mat.forEach((row, i) => {
        console.log.apply(null,row.map((val, j) => new Array(colMaxes[j]-val.toString().length+1).join(" ") + (stringifier ? stringifier(val.toString(), i, j) : val.toString()) + "  "));
    });
}


// Function to load Showdown-format teams from a provided string (presumably loaded from a file)
const validator = new TeamValidator('gen8metronomebattle');
function loadTeams(str) {
    str = str.trim() + "\n\n\n";

    if (str.match(/(^=== \[gen8metronomebattle\] ([^\n]*?) ===\n(.+?)\n\n\n)*/gms)[0] != str) {
        console.log("*** WARNING: a teams str seems to be invalid\n")
    }

    return [...str
    .matchAll(/^=== \[gen8metronomebattle\] ([^\n]*?) ===\n(.+?)\n\n\n/gms)]
    .reduce((dict, match) => {
        const team = Teams.import(match[2]);
        let name = match[1];
        const m = name.match(/^(.+?)\/(.+?)$/);
        if (m) {
            name = m[2];
        }

        // Handle duplicate team names
        fullName = name
        i = 1
        while (fullName in dict) {
            i++
            fullName = `${name} [${i}]`
        }
        if (i > 1) console.log(`Warning: duplicate team name ${name} (numbering)`)

        dict[fullName] = Teams.pack(team)

        // Warn if team is illegal
        const issues = validator.validateTeam(team)
        if (issues !== null) {
            console.log(`Warning: team "${fullName}" is illegal for metronome battle:\n${issues}`)
        }
        return dict
    }, {})
}

// Function to load a file
// Handles windows newlines
function loadFile(filename) {
    try {
        return fs.readFileSync(filename).toString().replace(/\r/g, "");
    } catch {
        console.log(`Could not load file '${filename}'`)
        process.exit()
    }
}

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
    matprint: matprint,
    getColor: getColor,
    loadTeams: loadTeams,
    loadFile: loadFile,
    Scheduler: Scheduler
}