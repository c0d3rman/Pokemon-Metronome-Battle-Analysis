const { Dex, Teams } = require("./pokemon-showdown");
const {loadFile, Scheduler} = require('./util');
const cliProgress = require('cli-progress');
const workerpool = require('workerpool');


// Parse command line args
if (process.argv.length - 2 != 2) {
    console.log(
        `Example usage:
        node move_counter.js gen8metronomebattle-0.json 1000
        `);
    process.exit();
}
let trials = process.argv[3];
if (trials.match(/\D/) || parseInt(trials) <= 0) {
    console.log("Invalid number of trials");
    process.exit();
}
trials = parseInt(trials)


// Import data about meta to generate  teams
const rawMetaObj = JSON.parse(loadFile(process.argv[2]));

// Process raw meta file
const metaObj = {data: new Map()}
for (const name in rawMetaObj.data) {
    // Process spreads into natures and speeds
    const natures = new Map()
    const speeds = new Map([["0", 0], ["252", 0]])
    Object.keys(rawMetaObj.data[name]['Spreads']).forEach(spread => {
        let [nature, speed] = spread.match(/^(\w+):.+\/(\d+)$/).slice(1, 3);
        speed = speed == "0" ? "0" : "252";
        natures.set(nature, (natures.get(nature) || 0) + rawMetaObj.data[name]['Spreads'][spread]);
        speeds.set(speed, (speeds.get(speed) || 0) + rawMetaObj.data[name]['Spreads'][spread]);
    })

    metaObj.data.set(Dex.species.get(name).name, new Map([
        ["count", rawMetaObj.data[name]['Raw count']],
        ["Speeds", speeds],
        ["Natures", natures],
        ["Abilities", new Map(Object.entries(rawMetaObj.data[name]['Abilities']).map(l => [Dex.abilities.get(l[0]).name, l[1]]))],
        ["Items", new Map(Object.entries(rawMetaObj.data[name]['Items']).map(l => [Dex.items.get(l[0]).name, l[1]]))],
        // For teammates, delete weirdness (and 'empty'), and do a name correction to fix things like "Sirfetch'd" => "Sirfetch’d"
        ["Teammates", new Map(Object.entries(rawMetaObj.data[name]['Teammates'])
            .map(l => [Dex.species.get(l[0]).name, l[1]])
            .filter(l => l[0] in rawMetaObj.data))] 
        ]))
}


// Choose a random key from a map weighted by its values
// Alias-based, adapted from addendum code in https://blog.bruce-hill.com/a-faster-weighted-random-choice
function prepareChooseRand(map, accessor) {
    if (typeof accessor === 'undefined') {
        accessor = v => v
    }

    const keys = [...map.keys()]
    const N = map.size
    const total = keys.reduce((sum, k) => sum + accessor(map.get(k)), 0)
    const avg = total / N
    map._aliases = Array(N).fill().map(_ => [1, null])

    let small_i = 0
    while (small_i < N && map.get(keys[small_i]) >= avg) small_i++;

    if (small_i == N) return; // If all weights are the same, nothing to do

    let small = [small_i, map.get(keys[small_i]) / avg]
    let big_i = 0
    while (big_i < N && map.get(keys[big_i]) < avg) big_i++;
    big = [big_i, map.get(keys[big_i]) / avg]

    while (big && small) {
        map._aliases[small[0]] = [small[1], big[0]]
        big = [big[0], big[1] - (1 - small[1])]
        if (big[1] < 1) {
            small = big
            do { big_i++ } while (big_i < N && map.get(keys[big_i]) < avg);
            if (big_i >= N) break;
            big = [big_i, map.get(keys[big_i]) / avg]
        } else {
            do { small_i++ } while (small_i < N && map.get(keys[small_i]) >= avg);
            if (small_i >= N) break;
            small = [small_i, map.get(keys[small_i]) / avg]
        }
    }

    map._lastAliasUpdate = currAliasVer
}
let currAliasVer = 0;
function chooseRand(map, accessor) {
    if (map._lastAliasUpdate != currAliasVer) {
        prepareChooseRand(map, accessor)
    }

    const r = Math.random() * map.size
    const i = Math.floor(r)
    const [odds, alias] = map._aliases[i]
    return [...map.keys()][(r - i) > odds ? alias : i]
}

// Choose a random set for a given pokemon
function chooseSet(name, obj) {
    const speed = chooseRand(obj.data.get(name).get("Speeds"), v => v);
    return {
        species: name,
        item: chooseRand(obj.data.get(name).get("Items"), v => v),
        ability: chooseRand(obj.data.get(name).get("Abilities"), v => v),
        nature: chooseRand(obj.data.get(name).get("Natures"), v => v),
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (speed == "0" ? 0 : 252) },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: (speed == "0" ? 0 : 31) },
        moves: ['Metronome']
    }
}


// Choose a random team of 2 pokemon
function chooseTeam(obj) {
    const mon1 = chooseRand(obj.data, v => v.has('winrate') ? v.get('winrate').getP() : v.get('count'))
    const set1 = chooseSet(mon1, obj)
    let teammates = obj.data.get(mon1).get("Teammates");
    if (teammates.size == 0) teammates = new Map([...obj.data.keys()].map(k => [k, 1]))
        const mon2 = chooseRand(teammates, v => v)
    const set2 = chooseSet(mon2, obj)
    return [set1, set2]
}


// Progress bar
const pbar = new cliProgress.SingleBar({ format: '[{bar}] {percentage}% | Time: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}' });
pbar.start(trials, 0);

// Worker pool for multithreading
const pool = workerpool.pool(__dirname + '/simWorkerMoveCount.js');
const scheduler = new Scheduler(); // Scheduler to make sure we don't have too many promises "in flight" at once, to avoid memory issues
const moveDict = {};


(async () => {
    // The simulation dispatcher (see the actual battle code in simWorker.js)
    for (let trial = 0; trial < trials; trial++) {
        const team1 = Teams.pack(chooseTeam(metaObj));
        const team2 = Teams.pack(chooseTeam(metaObj));
        
        await scheduler.isReady(); // Make sure we don't have too many promises in flight

        scheduler.schedule(pool.exec('simBattle', [team1, team2]).then((moves) => {
            for (const move in moves) {
                if (!(move in moveDict)) {
                    moveDict[move] = 0;
                }
                moveDict[move] += moves[move]
            }
            pbar.increment();
        }));
    }
})()
// At this point we are done scheduling sims but not necessarily running them
.then(() => {
    // After all sims are done running, calculate and display results
    scheduler.isDone().then(() => {
        pbar.stop();

        console.log(new Map([...Object.entries(moveDict)].sort((a, b) => b[1] - a[1])));

        // Work is done, kill our worker pool
        pool.terminate();
    });
});

