const { Dex, Teams } = require("./pokemon-showdown");
const fs = require('fs');
const cliProgress = require('cli-progress');
const workerpool = require('workerpool');
const setGen = require("./set_generator");

// Import data about meta to generate enemy teams
// const metaObj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

class Beta extends Array {
	constructor() {
		super(1, 1)
	}

	getP() {
		return this[0] / (this[0] + this[1])
	}

	toString() {
		return super.toString() + " (" + this.getP() + ")"
	}
}


// Create output object
const legalMons = Dex.species.all().filter(s => !s.types.includes('Steel') && s.bst <= 625 && s.name != "Pokestar Spirit").map(m => m.name).sort()
let obj = {
	info: { sim_battles: 0 },
	data: legalMons.reduce((map, mon) => map.set(mon, new Map([
		["winrate", new Beta()],
		["Speeds", setGen.speeds.reduce((m, k) => m.set(k, new Beta()), new Map())],
		["Abilities", setGen.abilities.reduce((m, k) => m.set(k, new Beta()), new Map())],
		["Items", setGen.items.reduce((m, k) => m.set(k, new Beta()), new Map())],
		["Natures", setGen.natures.reduce((m, k) => m.set(k, new Beta()), new Map())],
		["Teammates", legalMons.reduce((m, k) => m.set(k, new Beta()), new Map())]
	])), new Map())
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
			return "  " + val.toString() + new Array(colMaxes[j] - val.toString().length + 1).join(" ");
		}));
	});
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
function chooseSet(name) {
	const speed = chooseRand(obj.data.get(name).get("Speeds"), v => v.getP());
	// speed = "0";
	return {
		species: name,
		item: chooseRand(obj.data.get(name).get("Items"), v => v.getP()),
		ability: chooseRand(obj.data.get(name).get("Abilities"), v => v.getP()),
		nature: chooseRand(obj.data.get(name).get("Natures"), v => v.getP()),
		// item: "Bright Powder", ability: "Intrepid Sword", nature: "Brave",
		evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (speed == "0" ? 0 : 252) },
		ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: (speed == "0" ? 0 : 31) },
		moves: ['Metronome']
	}
}

let tempSet = chooseSet("Bulbasaur")

// Choose a random team of 2 pokemon
function chooseTeam() {
	const mon1 = chooseRand(obj.data, v => v.get('winrate').getP())
	const set1 = chooseSet(mon1)
	const mon2 = chooseRand(obj.data.get(mon1).get("Teammates"), v => v.getP())
	// const mon2 = chooseRand(obj.data, v => v['winrate'].getP())
	const set2 = chooseSet(mon2)
	return [set1, set2]
	// return [tempSet, tempSet]
}




const trialsPerBatch = 10000;

// Worker pool for multithreading
const pool = workerpool.pool(__dirname + '/simWorker.js');

let counter = 0;

(async () => {
	while (true) {
		// Progress bar
		const pbar = new cliProgress.SingleBar({ format: '[{bar}] {percentage}% | Time: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}' });
		pbar.start(trialsPerBatch, 0);

		const promises = [];

		const toInc = []

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
							toInc.push([obj.data.get(set.species).get("winrate"), i])
							toInc.push([obj.data.get(set.species).get("Items").get(set.item), i])
							toInc.push([obj.data.get(set.species).get("Abilities").get(set.ability), i])
							toInc.push([obj.data.get(set.species).get("Natures").get(set.nature), i])
							toInc.push([obj.data.get(set.species).get("Speeds").get(set.evs.spe == 0 ? "0" : "252"), i])
							// if (!(teammate.species in obj.data[set.species].Teammates)) {
							// 	obj.data[set.species].Teammates[teammate.species] = new Beta()
							// }
							toInc.push([obj.data.get(set.species).get("Teammates").get(teammate.species), i])
						}
					}
					obj.info["sim_battles"]++
					pbar.increment();
				});
				// pbar.increment();
				promises.push(promise)
			}
		})());

		await Promise.all(promises);

		for (const [target, i] of toInc) {
			target[i]++;
		}

		pbar.stop();
		currAliasVer++
		fs.writeFile(process.argv[3], JSON.stringify(obj, (k, v) => v instanceof Map ? { dataType: 'Map', value: [...v] } : v), () => { })

		matprint([...obj.data.keys()]
			.map(k => [k, obj.data.get(k).get("winrate").getP()])
			.sort((a, b) => b[1] - a[1])
			.slice(0, 20)
			.map((l, i) => ["#" + (i + 1), l[0], l[1].toFixed(5)])
		)
	}
})();



