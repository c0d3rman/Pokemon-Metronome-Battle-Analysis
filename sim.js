const {matprint, getColor} = require('./util')
const {Teams, TeamValidator} = require('./pokemon-showdown');
const fs = require('fs');
const cliProgress = require('cli-progress');
const workerpool = require('workerpool');



// Parse command line args
let opponentsFile, challengersFile, trials, isChallengerMode;
try {
    args = process.argv.slice(2)
    if (args.length < 2 || args.length > 3) {
        throw new Error("Too many or too few arguments");
    }

    opponentsFile = fs.readFileSync(args[0]).toString().replace(/\r/g, "");
    isChallengerMode = (args.length == 3);
    if (isChallengerMode) {
        trials = args[2];
        challengersFile = fs.readFileSync(args[1]).toString().replace(/\r/g, "");
    } else {
        trials = args[1];
    }

    if (trials.match(/\D/) || parseInt(trials) <= 0) {
        throw new Error("Invalid number of trials");
    }
    trials = parseInt(trials)
} catch (e) {
    console.log(e)
    console.log(`Example usage:
Round robin:\t\tnode sim.js meta_teams.txt 100
Challenger mode:\tnode sim.js meta_teams.txt sample_teams.txt 10
`);
    process.exit();
}

// Load all teams
const validator = new TeamValidator('gen8metronomebattle');
function loadTeams(file) {
    file = file.trim() + "\n\n\n";

    if (file.match(/(^=== \[gen8metronomebattle\] ([^\n]*?) ===\n(.+?)\n\n\n)*/gms)[0] != file) {
        console.log("*** WARNING: a teams file seems to be invalid\n")
    }

    return [...file
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
        if (i > 1) {
            console.log(`Warning: duplicate team name ${name} (numbering)`)
        }

        dict[fullName] = Teams.pack(team)

        // Warn if team is illegal
        const issues = validator.validateTeam(team)
        if (issues !== null) {
            console.log(`Warning: team "${fullName}" is illegal for metronome battle:\n${issues}`)
        }
        return dict
    }, {})
}
const oppTeams = loadTeams(opponentsFile)
const challTeams = (isChallengerMode ? loadTeams(challengersFile) : oppTeams)

// Simulation preamble and setup
const oppNames = Object.keys(oppTeams); // Ensure a consistent ordering of keys by just saving them
const challNames = Object.keys(challTeams);
let winMatrix = Array(oppNames.length).fill().map(()=>Array(challNames.length).fill(0));

if (isChallengerMode) {
    console.log(`${challNames.length} challengers each facing off against all ${oppNames.length} opponents ${trials} times`);
    console.log(`Challengers:`)
    challNames.forEach((x, i) => console.log(`  ${i+1}\t${x}`));
    console.log(`Opponents:`);
    oppNames.forEach((x, i) => console.log(`  ${i+1}\t${x}`));
} else {
    console.log(`Round robin of ${oppNames.length} teams with each pair facing off ${trials} times`);
    console.log(`Teams:`);
    oppNames.forEach((x, i) => console.log(`  ${i+1}\t${x}`));
}

// Progress bar
const pbar = new cliProgress.SingleBar({format: '[{bar}] {percentage}% | Time: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}'});
pbar.start(trials * oppNames.length * (isChallengerMode ? challNames.length : (challNames.length - 1) / 2), 0);

// Worker pool for multithreading
const pool = workerpool.pool(__dirname + '/simWorker.js');

// This scheduler makes sure we don't fire off more than 10,000 promises at a time to avoid memory issues
// If too many promises are "in flight", the loop that fires them will simply wait
// It's very fragile and not resilient to multiple consumers calling isReady and isDone so be careful
const scheduler = {
    count: 0,
    max: 10000,
    resolve: null,
    schedule: function(promise) {
        this.count++;
        const self = this;
        promise.then(() => {
            self.count--;
            if (self.resolve) self.resolve();
        });
    },
    isReady: function() {
        const self = this;
        return new Promise((resolve, reject) => {
            if (self.count <= self.max) {
                resolve();
            } else {
                self.resolve = resolve;
            }
        });
    },
    isDone: function() {
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

// The simulation dispatcher (see the actual battle code in simWorker.js)
(async () => {
    for (let trial = 0; trial < trials; trial++) {
        for (let i = 0; i < oppNames.length; i++) {
            let opponent = oppTeams[oppNames[i]]
            for (let j = (isChallengerMode ? 0 : i + 1); j < challNames.length; j++) {
                let challenger = challTeams[challNames[j]]

                await scheduler.isReady();

                scheduler.schedule(pool.exec('simBattle', [challenger, opponent]).then((winner) => {
                    if (winner == "P1") {
                        winMatrix[i][j]++
                    } else if (!isChallengerMode) {
                        winMatrix[j][i]++
                    }
                    pbar.increment();
                }));
            }
        }
    }
})()
// At this point we are done scheduling sims but not necessarily running them
.then(() => {
    // After all sims are done running, calculate and display results
    scheduler.isDone().then(() => {
        pbar.stop();

        winMatrix = winMatrix.map((row) => row.map((x) => (x / trials * 100)))

        // Calculate min and max vals for red-green coloring
        let minVal = Math.min(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat())
        let maxVal = Math.max(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat())
        minVal = Math.min(minVal, 100 - maxVal)
        maxVal = Math.max(maxVal, 100 - minVal)

        // Blank out diagonals in round robin
        if (!isChallengerMode) {
            winMatrix.forEach((row, i) => { if (i < row.length) row[i] = "-"; })
        }

        // Add labels
        const strWinMatrix = winMatrix.map((row) => row.map((x) => typeof x === "number" ? x.toFixed(1) : x))
        strWinMatrix.forEach((row, i) => row.unshift(i + 1))
        strWinMatrix.unshift(Array.from(Array(challNames.length + 1).keys()))
        strWinMatrix[0][0] = "" // Fix corner

        // Print the matchup matrix
        console.log("Winrate for challenger (column) vs opponent (row):")
        console.log(`E.g. top right cell is how often challenger #${challNames.length} beats opponent #1`)
        matprint(strWinMatrix, (val, i, j) => {
            let n = parseFloat(val);
            return (Number.isNaN(n) || i == 0 || j == 0) ? val : getColor(n, minVal, maxVal)(val);
        });

        // Print the overall rankings
        console.log("\n\nOverall winrates:\n")
        challNames.map((name, i) => {
            let l = winMatrix.map(row => row[i]).filter(n => typeof n === "number");
            return [name, l.reduce((sum, n) => sum + n, 0) / l.length];
        }).sort((a, b) => b[1]- a[1])
        .forEach((pair, i) => console.log("   #" + (i+1) + "\t| " + getColor(pair[1], minVal, maxVal)(pair[1].toFixed(1)) + " | " + pair[0]))

        // Work is done, kill our worker pool
        pool.terminate();
    });
});