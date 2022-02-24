const {loadTeams, loadFile, parseArgs} = require('./util/input')
const {matprint, colorizeN} = require('./util/output')
const {Scheduler} = require('./util/misc')
const cliProgress = require('cli-progress');
const workerpool = require('workerpool');


// Parse command line args
const [oppFile, challFile, trials] = parseArgs("node sim.js opponent_teams.txt [challenger_teams.txt] 1000")
const isChallengerMode = (typeof challFile !== 'undefined');

// Load all teams
const oppTeams = loadTeams(oppFile)
const challTeams = (isChallengerMode ? loadTeams(challFile) : oppTeams)

// Ensure a consistent ordering of keys by just saving them
const oppNames = Object.keys(oppTeams);
const challNames = Object.keys(challTeams);

// Preamble
if (isChallengerMode) {
    console.log(
`${challNames.length} challengers each facing off against all ${oppNames.length} opponents ${trials} times
Challengers:
${challNames.map((x, i) => `  ${i+1}\t${x}`).join("\n")}
Opponents:
${oppNames.map((x, i) => `  ${i+1}\t${x}`).join("\n")}`
    );
} else {
    console.log(
`Round robin of ${oppNames.length} teams with each pair facing off ${trials} times
Teams:
${oppNames.map((x, i) => `  ${i+1}\t${x}`).join("\n")}`
    );
}

// Preliminary setup
const pbar = new cliProgress.SingleBar({format: '[{bar}] {percentage}% | Time: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}', etaBuffer: 100}, cliProgress.Presets.shades_classic);
const totalTrials = trials * oppNames.length * (isChallengerMode ? challNames.length : (challNames.length - 1) / 2);
pbar.start(totalTrials, 0);

let winMatrix = Array(oppNames.length).fill().map(()=>Array(challNames.length).fill(0));

const pool = workerpool.pool(__dirname + '/simWorker.js'); // Worker pool for multithreading
const scheduler = new Scheduler(); // Scheduler to make sure we don't have too many promises "in flight" at once, to avoid memory issues

// The simulation dispatcher (see simWorker.js for the actual battle code)
(async () => {
    for (let trial = 0; trial < trials; trial++) {
        for (let i = 0; i < oppNames.length; i++) {
            let opponent = oppTeams[oppNames[i]]
            for (let j = (isChallengerMode ? 0 : i + 1); j < challNames.length; j++) { // In round-robin, we avoid duplicate battles (where we have both A vs B and B vs A)
                let challenger = challTeams[challNames[j]]

                await scheduler.isReady(); // Make sure we don't have too many promises in flight

                scheduler.schedule(pool.exec('simBattle', [challenger, opponent]).then((winner) => {
                    if (winner == "P1") {
                        winMatrix[i][j]++
                    } else if (!isChallengerMode) {
                        winMatrix[j][i]++
                    }
                    pbar.increment();
                }).catch(function (err) {
                  console.log(err);
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

        // Convert win matrix to percentages
        winMatrix = winMatrix.map((row) => row.map((x) => (x / trials * 100)))

        // Calculate min and max vals for red-green coloring
        let minVal = Math.min(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat())
        let maxVal = Math.max(...winMatrix.map((row, i) => row.filter((_, j) => j != i)).flat())
        minVal = Math.min(minVal, 100 - maxVal)
        maxVal = Math.max(maxVal, 100 - minVal)

        // Blank out diagonals in round robin mode
        if (!isChallengerMode) {
            winMatrix.forEach((row, i) => { if (i < row.length) row[i] = "-"; })
        }

        // Add row and column labels
        const strWinMatrix = winMatrix.map((row) => row.map((x) => typeof x === "number" ? x.toFixed(1) : x))
        strWinMatrix.forEach((row, i) => row.unshift(i + 1))
        strWinMatrix.unshift(Array.from(Array(challNames.length + 1).keys()))
        strWinMatrix[0][0] = "" // Fix corner

        // Print the matchup matrix
        console.log("Winrate for challenger (column) vs opponent (row):")
        console.log(`E.g. top right cell is how often challenger #${challNames.length} beats opponent #1`)
        matprint(strWinMatrix, (val, i, j) => {
            let n = parseFloat(val);
            return (Number.isNaN(n) || i == 0 || j == 0) ? val : colorizeN(n, minVal, maxVal)(val);
        });

        // Print the overall rankings
        console.log("\n\nOverall winrates:\n")
        challNames.map((name, i) => {
            let l = winMatrix.map(row => row[i]).filter(n => typeof n === "number");
            return [name, l.reduce((sum, n) => sum + n, 0) / l.length];
        }).sort((a, b) => b[1]- a[1])
        .forEach((pair, i) => console.log("   #" + (i+1) + "\t| " + colorizeN(pair[1], minVal, maxVal)(pair[1].toFixed(1)) + " | " + pair[0]))

        // Work is done, kill our worker pool
        pool.terminate();
    });
});