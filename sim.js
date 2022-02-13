const {Teams, TeamValidator} = require('./pokemon-showdown');
const fs = require('fs');
const cliProgress = require('cli-progress');
const chalk = require('chalk');
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
const oppNames = Object.keys(oppTeams);
const challNames = Object.keys(challTeams);
const promises = [];
let winMatrix = Array(oppNames.length).fill().map(()=>Array(challNames.length).fill(0));
const totalTrials = trials * oppNames.length * (isChallengerMode ? challNames.length : (challNames.length - 1) / 2)

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
pbar.start(totalTrials, 0);

// Worker pool for multithreading
const pool = workerpool.pool(__dirname + '/simWorker.js');

// The simulation dispatcher (see the actual battle code in simWorker.js)
promises.push((async () => {
    for (let trial = 0; trial < trials; trial++) {
        for (let i = 0; i < oppNames.length; i++) {
            let opponent = oppTeams[oppNames[i]]
            for (let j = (isChallengerMode ? 0 : i + 1); j < challNames.length; j++) {
                let challenger = challTeams[challNames[j]]
                let promise = pool.exec('simBattle', [challenger, opponent])
                promise.then((winner) => {
                    if (winner == "P1") {
                        winMatrix[i][j]++
                    } else if (!isChallengerMode) {
                        winMatrix[j][i]++
                    }
                    pbar.increment();
                });
                promises.push(promise)
            }
        }
    }
})());

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
function matprint(mat, min, max) {
    let shape = [mat.length, mat[0].length];
    function col(mat, i) {
        return mat.map(row => row[i]);
    }
    let colMaxes = [];
    for (let i = 0; i < shape[1]; i++) {
        colMaxes.push(Math.max.apply(null, col(mat, i).map(n => n.toString().length)));
    }

    mat.forEach((row, i) => {
        console.log.apply(null, row.map((val, j) => {
            let n = parseFloat(val.toString());
            return new Array(colMaxes[j]-val.toString().length+1).join(" ") +
                ((Number.isNaN(n) || i == 0 || j == 0) ? val.toString() : getColor(n, min, max)(val.toString()))
            + "  ";
        }));
    });
}

// After all sims are done, calculate and display results
Promise.all(promises).then(() => {
    pbar.stop();

    winMatrix = winMatrix.map((row) => row.map((x) => (x / trials * 100)))

    let minVal = Math.max(2 * Math.min(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat()) - 50, 0);
    let maxVal = Math.min(2 * Math.max(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat()) - 50, 100);

    const strWinMatrix = winMatrix.map((row) => row.map((x) => x.toFixed(1)))    
    
    // Blank out diagonals in round robin
    if (!isChallengerMode) {
        strWinMatrix.forEach((row, i) => {
            if (i < row.length) {
                row[i] = "-"
            }
        })
    }
    
    // Add labels
    strWinMatrix.forEach((row, i) => row.unshift(i + 1))
    strWinMatrix.unshift(Array.from(Array(challNames.length + 1).keys()))
    strWinMatrix[0][0] = "" // Fix corner

    console.log("Winrate for challenger (column) vs opponent (row):")
    console.log(`E.g. top right cell is how often challenger #${challNames.length} beats opponent #1`)
    matprint(strWinMatrix, minVal, maxVal);

    console.log("\n\nOverall winrates:\n")
    const avgRates = challNames.map((name, i) => [name, winMatrix.reduce((sum, row, j) => i == j ? sum : sum + row[i], 0) / (winMatrix.length - 1)]).sort((a, b) => b[1]- a[1])
    avgRates.forEach((pair, i) => console.log("   #" + (i+1) + "\t| " + getColor(pair[1], avgRates[avgRates.length-1][1], avgRates[0][1])(pair[1].toFixed(1)) + " | " + pair[0]))

    pool.terminate();
});