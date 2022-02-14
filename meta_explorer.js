const {Dex, Teams} = require("./pokemon-showdown");
const fs = require('fs');
const cliProgress = require('cli-progress');
const workerpool = require('workerpool');


const obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));


function inc(dict, key, amount=1) {
	if (!(key in dict)) {
		dict[key] = 0;
	}
	dict[key] += amount;
}

for (const name in obj.data) {
	if (name == "_total") {
		continue
	}

	// Process spreads into natures and speeds
	obj.data[name]['Natures'] = {}
	obj.data[name]['Speeds'] = {}
	Object.keys(obj.data[name]['Spreads']).forEach(spread => {
		const [nature, speed] = spread.match(/^(\w+):.+\/(\d+)$/).slice(1, 3);
		inc(obj.data[name]['Natures'], nature, obj.data[name]['Spreads'][spread]);
		inc(obj.data[name]['Speeds'], speed, obj.data[name]['Spreads'][spread]);
	})

	// Delete weirdness (and 'empty') from teammates
	for (const teammate in obj.data[name].Teammates) {
		if (!(teammate in obj.data)) {
			delete obj.data[name].Teammates[teammate]
		}
	}
}


// Modified from https://gist.github.com/lbn/3d6963731261f76330af
function matprint(mat) {
    let shape = [mat.length, mat[0].length];
    function col(mat, i) {
        return mat.map(row => row[i]);
    }
    let colMaxes = [];
    for (let i = 0; i < shape[1]; i++) {
        colMaxes.push(Math.max.apply(null, col(mat, i).map(n => n.toString().length)));
    }

    mat.forEach(row => {
        console.log.apply(null, row.map((val, j) => {
            return "  " + val.toString() + new Array(colMaxes[j]-val.toString().length+1).join(" ");
        }));
    });
}


function chooseRand(dict, opts={}) {
	let z = 'key' in opts

	if ('defaults' in opts) {
		for (const def of opts.defaults) {
			if (!(def in dict) && def != "_total") {
				z ? dict[def][opts.key] = 1 : dict[def] = 1
			}
		}
	}

	if (!('_total' in dict)) {
		dict["_total"] = Object.keys(dict).reduce((sum, k) => sum + (z ? dict[k][opts.key] : dict[k]), 0)
	}

	let x = Math.random() * dict["_total"];
	return Object.keys(dict)
		.reduce((tot, k) => {
			if (typeof tot != 'number') {
				return tot;
			}
			let newTot = tot + (z ? dict[k][opts.key] : dict[k]);
			return newTot >= x ? k : newTot
		}, 0)
}

function chooseSet(name) {
	let minSpeed = chooseRand(obj.data[name].Speeds, {defaults: ["0", "252"]}) == "0";
	return {
          species: name,
          item: Dex.items.get(chooseRand(obj.data[name].Items)).name,
          ability: Dex.abilities.get(chooseRand(obj.data[name].Abilities)).name,
          nature: chooseRand(obj.data[name].Natures, {defaults: ["Brave", "Quiet", "Relaxed"]}),
          evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (minSpeed ? 0 : 255) },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: (minSpeed ? 0 : 31) },
          moves: ['Metronome']
        }
}

function chooseTeam() {
	const mon1 = chooseRand(obj.data, {key: 'Raw count'})
	const set1 = chooseSet(mon1)
	const mon2 = chooseRand(obj.data[mon1].Teammates, {defaults: Object.keys(obj.data)})
	const set2 = chooseSet(mon2)
	return [set1, set2]
}

const trialsPerBatch = 10000;

// Worker pool for multithreading
const pool = workerpool.pool(__dirname + '/simWorker.js');

(async () => {
	while (true) {
		// Progress bar
		const pbar = new cliProgress.SingleBar({format: '[{bar}] {percentage}% | Time: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}'});
		pbar.start(trialsPerBatch, 0);

		const promises = [];

		// The simulation dispatcher (see the actual battle code in simWorker.js)
		promises.push((async () => {
	    		for (let trial = 0; trial < trialsPerBatch; trial++) {
	    			const team1 = chooseTeam();
	    			const team2 = chooseTeam();
	    			const promise = pool.exec('simBattle', [Teams.pack(team1), Teams.pack(team2)])
	    			promise.then((winner) => {
							const teamW = (winner == "P1" ? team1 : team2)
							for (const team of [team1, team2]) {
								const n = team === teamW ? 1 : -1;
								for (const [set, teammate] of [team, [team[1], team[0]]]) {
									inc(obj.data[set.species], 'Raw count', n);
									inc(obj.data[set.species]['Items'], set.item, n);
									inc(obj.data[set.species]['Abilities'], set.ability, n);
									inc(obj.data[set.species]['Natures'], set.nature, n);
									inc(obj.data[set.species]['Speeds'], set.evs.spe == 0 ? "0" : "252", n);
									inc(obj.data[set.species]['Teammates'], teammate.species, n);
								}
							}
							inc(obj.info, "sim_battles");
							pbar.increment();
	        		});
		       	 	promises.push(promise)
	   		 }
		})());

		await Promise.all(promises);

		pbar.stop();
		fs.writeFile(process.argv[3], JSON.stringify(obj), () => {})
	}
})();

// for (let i = 0; i < 5; i++) {
// 	const mon1 = chooseRand(obj.data, {key: 'Raw count'})
// 	const set1 = chooseSet(mon1)
// 	const mon2 = chooseRand(obj.data[mon1].Teammates, {defaults: Object.keys(obj.data)})
// 	const set2 = chooseSet(mon2)

// 	console.log(`=== [gen8metronomebattle] ${set1.item} ${set1.ability} ${set1.species} + ${set2.item} ${set2.ability} ${set2.species} ===\n\n` + Teams.export([set1, set2]))
// }



// matprint(Object.keys(names)
// 	.sort((a, b) => names[b] - names[a])
// 	.map((n, i) => ["#" + (i+1), n, (names[n]/trials).toFixed(5), (obj.data[n]['Raw count']/obj.data._total).toFixed(5)])
// )

