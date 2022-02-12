const allowIllegalTeams = true;
// Turn this on to treat the first team as the "challenger" and only have it battle other teams instead of having every pair battle
// Useful for testing a team concept against a collection of common teams
const challengerMode = true;



const {Teams, TeamValidator} = require('./pokemon-showdown');
const fs = require('fs');
const cliProgress = require('cli-progress');
const chalk = require('chalk');
const workerpool = require('workerpool');


// Parse args
let file, trials;
try {
    file = fs.readFileSync(process.argv[2]).toString().replace(/\r/g, "");
    trials = parseInt(process.argv[3]);
    if (process.argv.length != 4 || Number.isNaN(trials) || trials <= 0) {
        throw new Error();
    }
} catch {
    console.log("Example usage: node sim.js sample_teams.txt 100");
    process.exit();
}

const validator = new TeamValidator('gen8metronomebattle');

// Load all teams
const teams = [...file
    .matchAll(/^=== \[gen8metronomebattle\] ([^\n]*?) ===\n(.+?)\n\n\n/gms)]
    .reduce((dict, match) => {
        const team = Teams.import(match[2]);
        let name = match[1];
        const m = name.match(/^(.+?)\/(.+?)$/);
        if (m) {
            name = m[2];
        }
        if (allowIllegalTeams || validator.validateTeam(team) === null) {
            dict[name] = Teams.pack(team)
        } else {
            console.log(`${name}: illegal team for metronome battle`)
        }
        return dict
    }, {})

const teamNames = Object.keys(teams);
const promises = [];
let winMatrix = Array(teamNames.length).fill().map(()=>Array(teamNames.length).fill(0));
let totalTrials;

if (challengerMode) {
    console.log(`Beginning simulation of one team challenging all ${teamNames.length - 1} opponents ${trials} times each`);
    console.log(`Challenger:\t${teamNames[0]}`)
    console.log(`Teams:`);
    teamNames.slice(1).forEach((x, i) => console.log(`  ${i+1}\t${x}`));
    totalTrials = trials * (teamNames.length - 1);
} else {
    console.log(`Beginning tournament of ${teamNames.length} teams with each pair facing off ${trials} times`);
    console.log(`Teams:`);
    teamNames.forEach((x, i) => console.log(`  ${i+1}\t${x}`));
    totalTrials = trials * (teamNames.length * (teamNames.length - 1) / 2);
}

const pbar = new cliProgress.SingleBar({format: '[{bar}] {percentage}% | Time: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}'});
pbar.start(totalTrials, 0);

const pool = workerpool.pool(__dirname + '/simWorker.js');

promises.push((async () => {
    for (let trial = 0; trial < trials; trial++) {
        const promisesRound = []; 

        const maxI = challengerMode ? 0 : teamNames.length - 1;
        for (let i = 0; i <= maxI; i++) {
            for (let j = i + 1; j < teamNames.length; j++) {
                let promise = pool.exec('simBattle', [teams[teamNames[i]], teams[teamNames[j]]])
                promise.then((winner) => {
                    if (winner == "P1") {
                        winMatrix[j][i]++
                    } else {
                        winMatrix[i][j]++
                    }
                    pbar.increment();
                });
                promises.push(promise)
                promisesRound.push(promise)
            }
        }
    }
})());

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

Promise.all(promises).then(() => {
    pbar.stop();

    winMatrix = winMatrix.map((row) => row.map((x) => (x / trials * 100)))

    const strWinMatrix = winMatrix.map((row) => row.map((x) => x.toFixed(1)))
    for (let i = 0; i < teamNames.length; i++) {
        strWinMatrix[i][i] = "-"
        strWinMatrix[i].unshift(i + (challengerMode ? 0 : 1)) // Add labels
    }
    strWinMatrix.unshift(Array.from(Array(teamNames.length + 1).keys())) // Add labels
    strWinMatrix[0][0] = "" // Fix corner

    if (challengerMode) {
        let minVal = Math.min(
            Math.min(...strWinMatrix.slice(2).map(row => row[1])),
            Math.min(...strWinMatrix[1].slice(2))
        )
        let maxVal = Math.max(
            Math.max(...strWinMatrix.slice(2).map(row => row[1])),
            Math.max(...strWinMatrix[1].slice(2))
        )

        console.log("Winrate for challenger:")
        let cutMat = strWinMatrix.slice(2).map((row, i) => row.slice(0, 2).concat(teamNames[i+1]));
        cutMat.unshift(["", "", ""]) // Dummy label
        matprint(cutMat, minVal, maxVal);
    } else {
        let minVal = Math.max(2 * Math.min(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat()) - 50, 0);
        let maxVal = Math.min(2 * Math.max(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat()) - 50, 100);

        console.log("Winrate of player (in row) vs opponent (in column)")
        console.log("E.g. top right cell is winrate of ")
        matprint(strWinMatrix, minVal, maxVal);

        console.log("\n\nOverall winrates:\n")

        const avgRates = teamNames.map((name, i) => [name, winMatrix.reduce((sum, row, j) => i == j ? sum : sum + row[i], 0) / (winMatrix.length - 1)]).sort((a, b) => b[1]- a[1])
        avgRates.forEach((pair, i) => console.log("   #" + (i+1) + "\t| " + getColor(pair[1], avgRates[avgRates.length-1][1], avgRates[0][1])(pair[1].toFixed(1)) + " | " + pair[0]))
    }

    pool.terminate();
});