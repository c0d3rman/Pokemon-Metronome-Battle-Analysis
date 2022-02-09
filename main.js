const allowIllegalTeams = false;
const functionalProgressBar = true; // Turn this off to make code a little faster (experimentally 18 mins => 17 mins) but break the progress bar




import pokemonShowdown from 'pokemon-showdown';
const {BattleStream, Teams, TeamValidator} = pokemonShowdown;
import fs from 'fs';
import path from 'path';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

// Parse args
let file, trials;
try {
    file = fs.readFileSync(process.argv[2]).toString();
    trials = parseInt(process.argv[3]);
    if (process.argv.length != 4 || Number.isNaN(trials) || trials <= 0) {
        throw new Error();
    }
} catch {
    console.log("Example usage: node main.js sample_teams.txt 100");
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

async function simBattle(team1, team2, doPrint) {
    const stream = new BattleStream();

    stream.write(`>start {"formatid":"gen8metronomebattle"}`);
    stream.write(`>player p1 {"name":"P1","team":"${team1}"}`);
    stream.write(`>player p2 {"name":"P2","team":"${team2}"}`);

    let p1alive = 2;
    let p2alive = 2;

    for await (const output of stream) {
        if (doPrint) {
            console.log(output);
        }

        for (const match of output.matchAll(/\|faint\|p([12])[ab]: /g)) {
            if (match[1] == '1') {
                p1alive--;
            } else {
                p2alive--;
            }
        }

        const m = output.match(/\|win\|(P[12])/);
        if (m) {
            return m[1];
        }

        if (/\|turn\|\d+$/.test(output)) {
            if (p1alive == 2) {
                stream.write(`>p1 move 1, move 1`);
            } else {
                stream.write(`>p1 move 1`);
            }
            if (p2alive == 2) {
                stream.write(`>p2 move 1, move 1`);
            } else {
                stream.write(`>p2 move 1`);
            }
        }
    }
}

const teamNames = Object.keys(teams);
let winMatrix = Array(teamNames.length).fill().map(()=>Array(teamNames.length).fill(0));
const promises = [];

console.log(`Beginning tournament of ${teamNames.length} teams with each pair facing off ${trials} times`);
console.log(`Teams:`);
teamNames.forEach((x, i) => console.log(`  ${i+1}\t${x}`));

const pbar = new cliProgress.SingleBar({format: '[{bar}] {percentage}% | Time: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}'});
pbar.start(trials * (teamNames.length * (teamNames.length - 1) / 2), 0);

promises.push((async () => {
    for (let trial = 0; trial < trials; trial++) {
        const promisesRound = []; 
        for (let i = 0; i < teamNames.length; i++) {
            for (let j = i + 1; j < teamNames.length; j++) {
                let promise = simBattle(teams[teamNames[i]], teams[teamNames[j]])
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

        if (functionalProgressBar) {
            await Promise.all(promisesRound);
        }
    }
})());

function getColor(n, min, max) {
    if (n < min || n > max) {
        return chalk.yellow;
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

    let minVal = Math.max(2 * Math.min(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat()) - 50, 0);
    let maxVal = Math.min(2 * Math.max(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat()) - 50, 100);

    console.log("Winner in column, loser in row")
    const strWinMatrix = winMatrix.map((row) => row.map((x) => x.toFixed(1)))
    for (let i = 0; i < teamNames.length; i++) {
        strWinMatrix[i][i] = "-"
        strWinMatrix[i].unshift(i + 1) // Add labels
    }
    strWinMatrix.unshift(Array.from(Array(teamNames.length + 1).keys())) // Add labels
    strWinMatrix[0][0] = "" // Fix corner
    matprint(strWinMatrix, minVal, maxVal);

    console.log("\n\nOverall winrates:\n")

    const avgRates = teamNames.map((name, i) => [name, winMatrix.reduce((sum, row, j) => i == j ? sum : sum + row[i], 0) / (winMatrix.length - 1)]).sort((a, b) => b[1]- a[1])
    avgRates.forEach((pair, i) => console.log("   #" + (i+1) + "\t| " + getColor(pair[1], avgRates[avgRates.length-1][1], avgRates[0][1])(pair[1].toFixed(1)) + " | " + pair[0]))
});