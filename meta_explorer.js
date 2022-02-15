const {Dex, Teams} = require("./pokemon-showdown");
const fs = require('fs');
const cliProgress = require('cli-progress');
const workerpool = require('workerpool');


let obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));


// class Beta extends Array {
//     constructor() {
// 		super(1, 1)
// 	}

// 	getP() {
// 		return this[0] / (this[0] + this[1])
// 	}

// 	toString() {
// 		return super.toString() + " (" + this.getP() + ")"
// 	}
// }

function getP(l) {
	return l[0] / (l[0] + l[1])
}


// If the input is a raw data file, pre-process it into the dict containing just the stuff we need
if ("cutoff" in obj.info) {
	obj = {
		info: {sim_battles: 0},
		data: Object.keys(obj.data).reduce((dict, name) => {
			dict[name] = {
				winrate: [1, 1],
				Speeds: {"0": [1, 1], "252": [1, 1]},
				Abilities: Object.keys(obj.data[name].Abilities)
					.reduce((d, k) => { d[Dex.abilities.get(k).name] = [1, 1]; return d }, {}),
				Items: Object.keys(obj.data[name].Items)
					.reduce((d, k) => { d[Dex.items.get(k).name] = [1, 1]; return d }, {}),
				Natures: Object.keys(obj.data[name].Spreads)
					.reduce((d, k) => { d[k.match(/^(\w+):/)[1]] = [1, 1]; return d }, {})
				// TBD Teammates
			}

			return dict
		}, {})
	}
}

// Choose a random key from a dict weighted by its values
function chooseRand(dict, opts={}) {
	let z = 'key' in opts

	// if ('defaults' in opts) {
	// 	for (const def of opts.defaults) {
	// 		if (!(def in dict) && def != "_total") {
	// 			z ? dict[def][opts.key] = 1 : dict[def] = 1
	// 		}
	// 	}
	// }


	// return Object.keys(dict)[Math.floor(Math.random() * Object.keys(dict).length)]
	let total = Object.keys(dict).reduce((sum, k) => sum + getP(z ? dict[k][opts.key] : dict[k]), 0)
	let x = Math.random() * total;
	let runningSum = 0;
	let keys = Object.keys(dict);
	for (const k of keys) {
		runningSum += getP(z ? dict[k][opts['key']] : dict[k]);
		if (runningSum >= x) {
			return k;
		}
	}
	return keys[keys.length - 1]
}

// Choose a random set for a given pokemon
function chooseSet(name) {
	let minSpeed = chooseRand(obj.data[name].Speeds, {defaults: ["0", "252"]}) == "0";
	return {
          species: name,
          item: chooseRand(obj.data[name].Items),
          ability: chooseRand(obj.data[name].Abilities),
          nature: chooseRand(obj.data[name].Natures, {defaults: ["Brave", "Quiet", "Relaxed"]}),
          evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (minSpeed ? 0 : 252) },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: (minSpeed ? 0 : 31) },
          moves: ['Metronome']
        }
}

// Choose a random team of 2 pokemon
function chooseTeam() {
	const mon1 = chooseRand(obj.data, {key: 'winrate'})
	const set1 = chooseSet(mon1)
	// const mon2 = chooseRand(obj.data[mon1].Teammates, {defaults: Object.keys(obj.data)})
	const mon2 = chooseRand(obj.data)
	const set2 = chooseSet(mon2)
	return [set1, set2]
}


const trialsPerBatch = 10000;

// Worker pool for multithreading
const pool = workerpool.pool(__dirname + '/simWorker.js');

let first = true;

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
								const i = team === teamW ? 0 : 1;
								for (const [set, teammate] of [team, [team[1], team[0]]]) {
									obj.data[set.species].winrate[i]++
									obj.data[set.species].Items[set.item][i]++
									obj.data[set.species].Abilities[set.ability][i]++
									obj.data[set.species].Natures[set.nature][i]++
									obj.data[set.species].Speeds[set.evs.spe == 0 ? "0" : "252"][i]++
									// obj.data[set.species].Teammates[teammate.species][i]++
								}
							}
							obj.info["sim_battles"]++
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


// Modified from https://gist.github.com/lbn/3d6963731261f76330af
// function matprint(mat) {
//     let shape = [mat.length, mat[0].length];
//     function col(mat, i) {
//         return mat.map(row => row[i]);
//     }
//     let colMaxes = [];
//     for (let i = 0; i < shape[1]; i++) {
//         colMaxes.push(Math.max.apply(null, col(mat, i).map(n => n.toString().length)));
//     }

//     mat.forEach(row => {
//         console.log.apply(null, row.map((val, j) => {
//             return "  " + val.toString() + new Array(colMaxes[j]-val.toString().length+1).join(" ");
//         }));
//     });
// }

// matprint(Object.keys(names)
// 	.sort((a, b) => names[b] - names[a])
// 	.map((n, i) => ["#" + (i+1), n, (names[n]/trials).toFixed(5), (obj.data[n]['Raw count']/obj.data._total).toFixed(5)])
// )



