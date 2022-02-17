const { Dex, Teams } = require("./pokemon-showdown");
const fs = require('fs');
const cliProgress = require('cli-progress');
const workerpool = require('workerpool');
const setGen = require("./set_generator");



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




// Import data about meta to generate enemy teams
const rawMetaObj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// Process raw meta file
// if ('cutoff' in rawMetaObj.info) {
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
// }


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
function chooseSet(name, obj) {
	const speed = chooseRand(obj.data.get(name).get("Speeds"), v => v instanceof Beta ? v.getP() : v);
	return {
		species: name,
		item: chooseRand(obj.data.get(name).get("Items"), v => v instanceof Beta ? v.getP() : v),
		ability: chooseRand(obj.data.get(name).get("Abilities"), v => v instanceof Beta ? v.getP() : v),
		nature: chooseRand(obj.data.get(name).get("Natures"), v => v instanceof Beta ? v.getP() : v),
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
	const mon2 = chooseRand(teammates, v => v instanceof Beta ? v.getP() : v)
	const set2 = chooseSet(mon2, obj)
	return [set1, set2]
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
		for (let trial = 0; trial < trialsPerBatch; trial++) {
			const team1 = chooseTeam(obj);
			const team2 = chooseTeam(metaObj);
			const promise = pool.exec('simBattle', [Teams.pack(team1), Teams.pack(team2)])
			promise.then((winner) => {
				const teamW = (winner == "P1" ? team1 : team2)
				// for (const team of [team1, team2]) {
				let team = team1
				const i = team === teamW ? 0 : 1;
				for (const [set, teammate] of [team, [team[1], team[0]]]) {
					if (!obj.data.get(set.species).get("winrate")) {
						console.log(set.species)
					}
					toInc.push([obj.data.get(set.species).get("winrate"), i])
					toInc.push([obj.data.get(set.species).get("Items").get(set.item), i])
					toInc.push([obj.data.get(set.species).get("Abilities").get(set.ability), i])
					toInc.push([obj.data.get(set.species).get("Natures").get(set.nature), i])
					toInc.push([obj.data.get(set.species).get("Speeds").get(set.evs.spe == 0 ? "0" : "252"), i])
					toInc.push([obj.data.get(set.species).get("Teammates").get(teammate.species), i])
				}
				// }
				obj.info["sim_battles"]++
				pbar.increment();
			});
			promises.push(promise)
		}

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



