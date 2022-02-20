// Number of mons you want displayed in lists
const numMons = 50;


const {Dex} = require('./pokemon-showdown');
const fs = require('fs');
const columnify = require('columnify');
const chalk = require('chalk');
const {colorize} = require('./util/output')


// All moves that can be drawn by metronome
const moves = fs.readFileSync("metronome_moves.txt").toString().replace(/\r/g, "").split("\n");
// All pokemon that can be used
const legalMons = Dex.species.all().filter(s => !s.types.includes('Steel') && s.bst <= 625 && s.name != "Pokestar Spirit")



const typeDict = {};
const typePower = {};
const physSpecDict = {'Physical': {num: 0, numPower: 0, totalPower: 0, totalAcc: 0, contact: 0},
						'Special': {num: 0, numPower: 0, totalPower: 0, totalAcc: 0, contact: 0}}
let zPower = 0;

for (const move of moves) {
	const m = Dex.moves.get(move);
	if (!m.exists) {
		console.log(move);
		throw new Error();
	}

	// Only moves that target enemies
	if (['normal', 'allAdjacentFoes', 'any', 'allAdjacent'].includes(m.target)) {
		if (!(m.type in typeDict)) {
			typeDict[m.type] = []
		}
		typeDict[m.type].push(move)

		if (['Physical', 'Special'].includes(m.category)) {
			physSpecDict[m.category].num++
			physSpecDict[m.category].totalAcc += (m.accuracy == true ? 100 : m.accuracy)
			physSpecDict[m.category].contact += (m.flags.contact ? 1 : 0)

			// Ignore variable-BP moves like Grass Knot since we can't really calculate their average power
			if (m.basePower == 0) {
				continue
			}

			let power = m.basePower;
			if (m.accuracy != true && m.accuracy != 100) {
				power *= m.accuracy / 100;
			}
			
			// Triple Kick and Triple Axel
			if (m.multiaccuracy) {
				power = 0;
				const a = m.accuracy / 100;
				let totalP = 0;
				for (let h = 1; h <= m.multihit; h++) {
					totalP += m.basePowerCallback(null, null, {hit: h});
					power += Math.pow(a, h) * (h == m.multihit ? 1 : 1 - a) * totalP
				}
			}
			// Constant multihit
			else if (typeof m.multihit == 'number') {
				power *= m.multihit
			}
			// Variable multihit (all are 2-5, with 35% chance for 2 or 3 and 15% chance for 4 or 5)
			else if (typeof m.multihit == 'object') {
				power *= 2 * 0.35 + 3 * 0.35 + 4 * 0.15 + 5 * 0.15
			}

			// Always crit
			if (m.willCrit) {
				power *= 1.5 // Technically not exact but shush
			}

			if (!(m.type in typePower)) {
				typePower[m.type] = [0, 0]
			}
			typePower[m.type][0] += power;
			typePower[m.type][1]++;

			physSpecDict[m.category].numPower++
			physSpecDict[m.category].totalPower += power

			if ("zMove" in m && "basePower" in m.zMove) {
				zPower += m.zMove.basePower - power
			}
		}
	}
}


console.log("The most common move types that target enemies are: ");
const typeDictData = Object.keys(typeDict)
	.sort((a, b) => typeDict[b].length - typeDict[a].length)
	.map((t, i) => ({place: '#'+(i+1), type: t, count: typeDict[t].length, "%": `${Math.round(typeDict[t].length/moves.length*100)}%`}))
console.log(columnify(typeDictData, {showHeaders: false, minWidth: 5, dataTransform: (cell, _, i) => colorize(cell, typeDictData[i].type)}))
console.log()


console.log("The types with the most powerful attacks (accuracy-adjusted) on average are:");
const typePowerData = Object.keys(typePower)
	.sort((a, b) => typePower[b][0]/typePower[b][1] - typePower[a][0]/typePower[a][1])
	.map((t, i) => ({place: '#'+(i+1), type: t, power: Math.round(typePower[t][0]/typePower[t][1])}))
console.log(columnify(typePowerData, {showHeaders: false, minWidth: 5, dataTransform: (cell, _, i) => colorize(cell, typePowerData[i].type)}))
console.log("(Doesn't include moves with no standard base power like Grass Knot. Does include some moves that vary in unpredictable ways, like Round, Rollout, Stored Power, Water Spout etc. so the analysis is imperfect)");
console.log()


console.log("The total power offered by each type (average power times number of moves):");
const typeOverallData = Object.keys(typePower)
	.sort((a, b) => typePower[b][0] - typePower[a][0])
	.map((t, i) => ({place: '#'+(i+1), type: t, power: Math.round(typePower[t][0])}))
console.log(columnify(typeOverallData, {showHeaders: false, minWidth: 5, dataTransform: (cell, _, i) => colorize(cell, typeOverallData[i].type)}))
console.log("(Same disclaimer as the last table.)");
console.log()


console.log("Breakdown of average physical vs. special attacks:");
console.log(columnify(
	["Physical", "Special"].map(cat => ({
		"": cat, "count": physSpecDict[cat].num + " (" + Math.round(physSpecDict[cat].num/moves.length*100) + "%)",
		"power": Math.round(physSpecDict[cat].totalPower/physSpecDict[cat].numPower),
		"acc": Math.round(physSpecDict[cat].totalAcc/physSpecDict[cat].num),
		"contact": Math.round(physSpecDict[cat].contact/physSpecDict[cat].num*100) + "%"
	})), {minWidth: 5, dataTransform: (cell, _, i) => colorize(cell, ["Physical", "Special"][i])}))
console.log("(Average power doesn't include moves excluded from the last table, but everything else does.)");
console.log(`Special moves that make contact: ${
	moves.map(m => Dex.moves.get(m))
	.filter(m => m.flags.contact && m.category == 'Special')
	.map(m => colorize(m.name)).join(", ")
}`)
console.log()


console.log(`The top ${numMons} defensive type-combos (the ones which resist the most total power) are:`);
const defensiveTypeData = legalMons.reduce((dict, s) => {
	const key = [...s.types].sort().join("/");
	if (!(key in dict)) {
		dict[key] = {
			type: key,
			typeF: [...s.types].sort().map(colorize).join("/"),
			pokemon: legalMons.reduce((a, b) => [...b.types].sort().join("/") == key && b.bst > a.bst ? b : a, {bst: -Infinity}),
			total: 0
		};
		for (const t of Object.keys(typePower)) {
			let damageMult = 1;
			for (const type of s.types) {
				const cat = Dex.types.get(type).damageTaken[t];
				if (cat == 1) {
					damageMult *= 2;
				} else if (cat == 2) {
					damageMult /= 2;
				} else if (cat == 3) {
					damageMult *= 0;
				}
			}
			dict[key].total += typePower[t][0] * damageMult;
		}
		dict[key].total = Math.round(dict[key].total);
	}
	return dict;
}, {});
console.log(columnify(
	Object.values(defensiveTypeData)
	.sort((a, b) => a.total - b.total)
	.slice(0, numMons)
	.map((r, i) => {r.place = '#'+(i+1); return r})
, {showHeaders: false, minWidth: 5, columns: ['place', 'typeF', 'total', 'pokemon']}))
console.log("(The pokemon listed are the highest-BST legal pokemon of the given type combo)");
console.log()


// console.log("The top 20 offensive type-combos (the ones whose STABs boost the most total power) are:");
// const offensiveTypeData = legalMons.reduce((dict, s) => {
// 	const key = [...s.types].sort().join("/");
// 	if (!(key in dict)) {
// 		dict[key] = {
// 			type: key,
// 			typeF: [...s.types].sort().map(colorize).join("/"),
// 			pokemon: legalMons.reduce((a, b) => [...b.types].sort().join("/") == key && b.bst > a.bst ? b : a, {bst: -Infinity}),
// 			total: Math.round(s.types.reduce((n, t) => n + (t in typePower ? typePower[t][0] : 0), 0)) // Shim for MissingNo (since there are no Bird-type moves)
// 		};
// 	}
// 	return dict;
// }, {});
// console.log(columnify(
// 	Object.values(offensiveTypeData)
// 	.sort((a, b) => b.total - a.total)
// 	.slice(0, 20)
// 	.map((r, i) => {r.place = '#'+(i+1); return r})
// , {showHeaders: false, minWidth: 5, columns: ['place', 'typeF', 'total', 'pokemon']}))
// console.log("(This does not factor in the fact that enemy pokemon may be commonly immune or resistant to your STABs, which gives Normal a huge advantage.)");
// console.log("(Also, STAB barely matters. So you should probably just ignore this table.)");
// console.log()


const moveImmunities = {}
for (const type of Dex.types.all()) {
	// Skip steels since they're banned
	if (type.name == "Steel") {
		continue
	}

	const immuneTypes = Object.keys(type.damageTaken).filter(t => type.damageTaken[t] == 3 && Dex.types.get(t).exists)

	if (immuneTypes.length > 0) {
		const immuneMoves = moves.filter(move => {
			let m = Dex.moves.get(move);
			return (
				immuneTypes.includes(m.type) &&
				['normal', 'allAdjacentFoes', 'any', 'allAdjacent'].includes(m.target) &&
				(!m.ignoreImmunity || m.id == "octolock") // For some reason octolock is marked as ignoring immunities but still fails against ghost types (maybe because it's a trapping move)
			);
		})

		moveImmunities[type.name] = immuneMoves
	}
}
Object.keys(moveImmunities)
	.sort((a, b) => moveImmunities[b].length - moveImmunities[a].length)
	.forEach(type => {
		console.log(`${colorize(type)} types are immune to ${moveImmunities[type].length}/${moves.length} moves (${Math.round(moveImmunities[type].length/moves.length*100)}%):`);
		console.log(moveImmunities[type].map(colorize).join(", "))
	});
console.log()


const statData = legalMons
	.map(name => Dex.species.get(name))
	.map(p => ({
		name: p.name, type: p.types.map(colorize).join("/"),
		hp: p.baseStats.hp, def: p.baseStats.def, spd: p.baseStats.spd, atk: p.baseStats.atk, spa: p.baseStats.spa,
		totalDef: p.baseStats.hp + p.baseStats.def + p.baseStats.spd,
		totalAtk: p.baseStats.atk + p.baseStats.spa,
		total: p.bst - p.baseStats.spe,
		totalPhys: p.baseStats.hp + p.baseStats.def + p.baseStats.atk,
		totalCustom: p.baseStats.hp + p.baseStats.def + p.baseStats.atk + p.baseStats.spd
	}));


console.log(`The top ${numMons} defensive stat pokemon (the ones with the highest sum of defensive stats) are:`);
console.log(columnify(statData
	.sort((a, b) => b.totalDef - a.totalDef)
	.slice(0, numMons)
	.map((r, i) => {r.place = '#'+(i+1); return r})
, {minWidth: 5, columns: ['place', 'name', 'type', 'hp', 'def', 'spd', 'totalDef']}));
console.log()

console.log(`The top ${numMons} offensive stat pokemon (the ones with the highest sum of offensive stats) are:`);
console.log(columnify(statData
	.sort((a, b) => b.totalAtk - a.totalAtk)
	.slice(0, numMons)
	.map((r, i) => {r.place = '#'+(i+1); return r})
, {minWidth: 5, columns: ['place', 'name', 'type', 'atk', 'spa', 'totalAtk']}));
console.log()

console.log(`The top ${numMons} overall stat pokemon (the ones with the highest sum of non-speed stats) are:`);
console.log(columnify(statData
	.sort((a, b) => b.total - a.total)
	.slice(0, numMons)
	.map((r, i) => {r.place = '#'+(i+1); return r})
, {minWidth: 5, columns: ['place', 'name', 'type', 'hp', 'atk', 'def', 'spa', 'spd', 'total']}));
console.log()

console.log(`The top ${numMons} physical stat pokemon are:`);
console.log(columnify(statData
	.sort((a, b) => b.totalPhys - a.totalPhys)
	.slice(0, numMons)
	.map((r, i) => {r.place = '#'+(i+1); r.typeDef = defensiveTypeData[[...Dex.species.get(r.name).types].sort().join("/")].total; return r})
, {minWidth: 5, columns: ['place', 'name', 'type', 'hp', 'atk', 'def', 'totalPhys', 'typeDef']}));
console.log()

console.log(`The top ${numMons} custom search pokemon are:`);
console.log(columnify(statData
	.sort((a, b) => b.totalCustom - a.totalCustom)
	.slice(0, numMons)
	.map((r, i) => {r.place = '#'+(i+1); r.typeDef = defensiveTypeData[[...Dex.species.get(r.name).types].sort().join("/")].total; return r})
, {minWidth: 5, columns: ['place', 'name', 'type', 'hp', 'atk', 'def', 'spa', 'spd', 'spe', 'totalCustom', 'typeDef']}));
console.log()

console.log(`Using a Z-crystal on a move increases its power on average by ${(zPower / moves.length).toFixed(1)}
(This accounts for the many status moves that get no boost whatsoever)`)
console.log()