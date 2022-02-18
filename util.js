const fs = require('fs');
const chalk = require('chalk');
const {Teams, TeamValidator, Dex} = require('./pokemon-showdown');

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
function matprint(mat, stringifier, leftAlign=false) {
    let shape = [mat.length, mat[0].length];
    function col(mat, i) {
        return mat.map(row => row[i]);
    }
    let colMaxes = [];
    for (let i = 0; i < shape[1]; i++) {
        colMaxes.push(Math.max.apply(null, col(mat, i).map(n => n.toString().length)));
    }

    mat.forEach((row, i) => {
        if (leftAlign) {
            console.log.apply(null,row.map((val, j) => "  " + (stringifier ? stringifier(val.toString(), i, j) : val.toString()) + new Array(colMaxes[j]-val.toString().length+1).join(" ") ));
        } else {
            console.log.apply(null,row.map((val, j) => new Array(colMaxes[j]-val.toString().length+1).join(" ") + (stringifier ? stringifier(val.toString(), i, j) : val.toString()) + "  "));
        }
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

// For some reason all the command line arg parsers I could find on NPM were way overcomplicated, so here's a simplified one
function parseArgs(usageStr) {
    const expectedArgs = usageStr.split(" ").slice(2)

    e = function() {
        console.log(`Usage:\n${usageStr}`)
        process.exit()
    }

    if (process.argv.length < 2 || process.argv.length > expectedArgs.length + 2) {
        e()
    }

    return process.argv.slice(2).reduce((l, arg) => {
        while (expectedArgs.length > 0) {
            let expectedArg = expectedArgs.shift();
            const optional = expectedArg.match(/^\[(.+?)\]$/)
            if (optional) {
                expectedArg = optional[1]
            }

            if (Number.isInteger(Number(expectedArg))) {
                const n = Number(arg)
                if (Number.isInteger(n) && n > 0) {
                    l.push(n)
                    return l
                }
            } else if (expectedArg.includes(".") && arg.includes(".")) {
                l.push(loadFile(arg))
                return l
            } else if (optional) {
                l.push(undefined)
                continue
            }
            break
        }

        e()
    }, [])
}


// Colors associated with the various types
const typeColors = {
    "Normal": "#A8A77A",
    "Fire": "#EE8130",
    "Water": "#6390F0",
    "Electric": "#F7D02C",
    "Grass": "#7AC74C",
    "Ice": "#96D9D6",
    "Fighting": "#C22E28",
    "Poison": "#A33EA1",
    "Ground": "#E2BF65",
    "Flying": "#A98FF3",
    "Psychic": "#F95587",
    "Bug": "#A6B91A",
    "Rock": "#B6A136",
    "Ghost": "#735797",
    "Dragon": "#6F35FC",
    "Dark": "#705746",
    "Steel": "#B7B7CE",
    "Fairy": "#D685AD",
    "Bird": "#7A9F90",
    "Physical": "#BA3423",
    "Special": "#51586E"
};
function colorize(s, type) {
    if (typeof type != 'string') {
        type = s in typeColors ? s : Dex.moves.get(s).type
    }
    return chalk.hex(typeColors[type])(s)
}







module.exports = {
    matprint: matprint,
    getColor: getColor,
    loadTeams: loadTeams,
    loadFile: loadFile,
    Scheduler: Scheduler,
    parseArgs: parseArgs,
    colorize: colorize
}