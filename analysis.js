// Number of mons you want displayed in lists
const numMons = 20;
// How much weight you want to give to power vs. bulk (1 is equal, 2 means value power 2x more)
// const powerWeight = 10;
const powerWeight = 5;
// Should we assume NFEs are holding Eviolite?
const eviolite = false;
// Should we adjust bulk for typing? (Turn this off if you're planning to Tera the mon)
const adjustBulkForTyping = true;
// Gives every mon Fluffy.
const fluffy = true;
// Gives every mon Ice Scales.
const icescales = false;
// Set this to tera all mons to a given type. (Or set to false to disable)
// const teraType = "Poison";
const teraType = false;
// Add disabled types (e.g. Fire for Primordial Sea or Electric for Lightning Rod).
const disabledTypes = ["Fire"];


const { Dex } = require('./pokemon-showdown');
const columnify = require('columnify');
const { colorize } = require('./util/output')
let { typeEffectiveness } = require('./util/misc')





// All moves that can be drawn by metronome
const noMetronome = Dex.moves.get("Metronome").noMetronome;
const moves = Dex.moves.all().filter(m => !noMetronome.includes(m.name));
// All pokemon that can be used
let legalMons = Dex.species.all().filter(s => !s.types.includes('Steel') && s.bst <= 625 && s.name != "Pokestar Spirit")
legalMons.push({ name: "Pecharunt", types: ["Poison", "Ghost"], baseStats: { hp: 88, atk: 88, def: 160, spa: 88, spd: 88, spe: 88 }, bst: 600 })
legalMons.push({ name: "Hydrapple", types: ["Grass", "Dragon"], baseStats: { hp: 106, atk: 80, def: 110, spa: 120, spd: 80, spe: 44 }, bst: 540 })

// legalMons = legalMons.filter(m => m.types.includes("Ice"))

// Adjust type effectiveness for Fluffy and immune types
if (fluffy) {
	typeEffectiveness = (function (_super) {
		return function () { return _super.apply(this, arguments) * (arguments[1].includes("Fire") ? 2 : 1) * (disabledTypes.includes(arguments[0]) ? 0 : 1); };
	})(typeEffectiveness);
}

// Adjust typing for tera
if (teraType) {
	legalMons = legalMons.map(m => {m.types = [teraType]; return m})
}

// Adapted from https://github.com/smogon/damage-calc
const NATURES = { Adamant: ['atk', 'spa'], Bashful: ['spa', 'spa'], Bold: ['def', 'atk'], Brave: ['atk', 'spe'], Calm: ['spd', 'atk'], Careful: ['spd', 'spa'], Docile: ['def', 'def'], Gentle: ['spd', 'def'], Hardy: ['atk', 'atk'], Hasty: ['spe', 'def'], Impish: ['def', 'spa'], Jolly: ['spe', 'spa'], Lax: ['def', 'spd'], Lonely: ['atk', 'def'], Mild: ['spa', 'def'], Modest: ['spa', 'atk'], Naive: ['spe', 'spd'], Naughty: ['atk', 'spd'], Quiet: ['spa', 'spe'], Quirky: ['spd', 'spd'], Rash: ['spa', 'spd'], Relaxed: ['def', 'spe'], Sassy: ['spd', 'spe'], Serious: ['spe', 'spe'], Timid: ['spe', 'atk'], };
function calcStatADV(stat, base, iv = 31, ev = 255, level = 100, nature = 'Bashful') {
	if (stat === 'hp') {
		return base === 1 ? base : Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
	}
	const mods = NATURES[nature];
	const n = mods[0] === stat && mods[1] === stat
		? 1
		: mods[0] === stat
			? 1.1
			: mods[1] === stat
				? 0.9
				: 1;
	return Math.floor((Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + 5) * n)// * (stat === 'def' ? 1.5 : 1); // Hack for snow
}


const typeDict = {};
const typePower = {};
let zPower = 0;
const moveDict = {}
const tallyDict = {
	'Physical': { num: 0, numPower: 0, totalPower: 0, totalAcc: 0, contact: 0 },
	'Special': { num: 0, numPower: 0, totalPower: 0, totalAcc: 0, contact: 0 },
	technician: { num: 0, total: 0, numApplicable: 0 },
	compoundEyes: { num: 0, total: 0, numApplicable: 0 },
};


function calc_stats(mon) {
	const stats = {};
	for (const [stat, base] of Object.entries(mon.baseStats)) {
		stats[stat] = calcStatADV(stat, base);
	}
	if (mon.nfe && eviolite) {
		stats['def'] *= 1.5;
		stats['spd'] *= 1.5;
	}
	if (icescales) {
		stats['spd'] *= 2;
	}
	// Bulks as defined in https://www.smogon.com/forums/threads/a-new-way-of-thinking-about-damage.3729061/
	stats['physBulk'] = stats.hp * stats.def / 10000;
	stats['specBulk'] = stats.hp * stats.spd / 10000;
	// Type-adjusted bulk
	stats['physBulkAdj'] = stats['physBulk'] * tallyDict['Physical'].totalPower / Object.entries(typePower).reduce((sum, [type, d]) => sum + d.totalPhys * typeEffectiveness(type, mon.types), 0)
	stats['specBulkAdj'] = stats['specBulk'] * tallyDict['Special'].totalPower / Object.entries(typePower).reduce((sum, [type, d]) => sum + d.totalSpec * typeEffectiveness(type, mon.types), 0)
	// Power based on average of all attacking Metronome moves. Does not account for STAB
	stats['physPower'] = (tallyDict["Physical"].totalPower / tallyDict["Physical"].numPower) * stats.atk * 0.714 / 10000;
	stats['specPower'] = (tallyDict["Special"].totalPower / tallyDict["Special"].numPower) * stats.spa * 0.714 / 10000;
	return stats;
}


// Iterate over all moves Metronome can pull and tally various quantities.
for (const move of moves) {
	if (!move.exists) {
		console.log(move);
		throw new Error();
	}

	// Ignore moves that don't target enemies.
	if (!['normal', 'allAdjacentFoes', 'any', 'allAdjacent'].includes(move.target)) continue;

	// Group moves by type for later reference.
	if (!(move.type in typeDict)) typeDict[move.type] = [];
	typeDict[move.type].push(move);

	// Ignore non-attacking moves for the rest of the calculations.
	if (!['Physical', 'Special'].includes(move.category)) continue;

	// Ignore moves of disabled types.
	if (disabledTypes.includes(move.type)) continue;

	// Tally physical-special quantities.
	tallyDict[move.category].num++
	tallyDict[move.category].totalAcc += (move.accuracy == true ? 100 : move.accuracy)
	tallyDict[move.category].contact += (move.flags.contact ? 1 : 0)

	// Ignore variable-BP moves like Grass Knot since we can't really calculate their average power.
	if (move.basePower == 0) continue;

	// Calculate effective power of the move (accounting for accuracy).
	function c(compoundEyes = false) {
		let power = move.basePower;
		if (move.accuracy != true && move.accuracy != 100) {
			let accuracy = move.accuracy;
			if (compoundEyes) accuracy = Math.min(accuracy * 1.3, 100);
			power *= accuracy / 100;
		}

		// Handle multihit
		// -> Triple Kick and Triple Axel (also Population Bomb but Metronome can't call it for some reason)
		if (move.multiaccuracy) {
			power = 0;
			let a = move.accuracy / 100;
			if (compoundEyes) a = Math.min(a * 1.3, 100);
			let totalP = 0;
			for (let h = 1; h <= move.multihit; h++) {
				totalP += move.basePowerCallback(null, null, { hit: h });
				power += Math.pow(a, h) * (h == move.multihit ? 1 : 1 - a) * totalP
			}
		}
		// -> Constant multihit
		else if (typeof move.multihit == 'number') {
			power *= move.multihit
		}
		//  -> Variable multihit (all are 2-5, with 35% chance for 2 or 3 and 15% chance for 4 or 5)
		else if (typeof move.multihit == 'object') {
			power *= 2 * 0.35 + 3 * 0.35 + 4 * 0.15 + 5 * 0.15
		}

		// Special case: Always crit
		if (move.willCrit) power *= 1.5; // Technically not exact but shush

		// Adjust power for Fluffy
		if (fluffy && move.flags.contact) power /= 2;

		return power;
	}
	let power = c();

	if (!(move.type in typePower)) typePower[move.type] = { "total": 0, "num": 0, "totalPhys": 0, "numPhys": 0, "totalSpec": 0, "numSpec": 0 }
	typePower[move.type].total += power;
	typePower[move.type].num++;
	if (move.category == 'Physical') {
		typePower[move.type].totalPhys += power;
		typePower[move.type].numPhys++;
	} else {
		typePower[move.type].totalSpec += power;
		typePower[move.type].numSpec++;
	}

	moveDict[move.name] = power;

	tallyDict[move.category].numPower++
	tallyDict[move.category].totalPower += power

	// If the raw BP was ≤60, account for technician boost
	tallyDict.technician.num++
	tallyDict.technician.total += power * (move.basePower <= 60 ? 1.5 : 1)
	if (move.basePower <= 60) tallyDict.technician.numApplicable++

	// Recalculate BP for Compound eyes
	const compoundEyesPower = c(true);
	tallyDict.compoundEyes.num++
	tallyDict.compoundEyes.total += compoundEyesPower;
	if (compoundEyesPower != power) tallyDict.compoundEyes.numApplicable++;

	if ("zMove" in move && "basePower" in move.zMove) zPower += move.zMove.basePower - power;
}

// tallyDict['Physical']['totalPower'] *= 1.5

console.log("The most common move types that target enemies are:");
const typeDictData = Object.keys(typeDict)
	.sort((a, b) => typeDict[b].length - typeDict[a].length)
	.map((t, i) => ({ place: '#' + (i + 1), type: t, count: typeDict[t].length, "%": `${Math.round(typeDict[t].length / moves.length * 100)}%` }))
console.log(columnify(typeDictData, { minWidth: 5, dataTransform: (cell, _, i) => colorize(cell, typeDictData[i].type) }))
console.log()

console.log("The total accuracy-adjusted power offered by each type (average power times number of moves):");
const typeOverallData = Object.keys(typePower)
	.sort((a, b) => typePower[b].total - typePower[a].total)
	.map((t, i) => ({ place: '#' + (i + 1), type: t, power: Math.round(typePower[t].total), "%phys": (typePower[t].numPhys / typePower[t].num * 100).toFixed(1), "%powerphys": (typePower[t].totalPhys / typePower[t].total * 100).toFixed(1) }))
console.log(columnify(typeOverallData, { minWidth: 5, dataTransform: (cell, _, i) => colorize(cell, typeOverallData[i].type) }))
console.log("(Doesn't include moves with no standard base power like Grass Knot. Does include some moves that vary in unpredictable ways, like Round, Rollout, Stored Power, Water Spout etc. so the analysis is imperfect)");
console.log()

console.log(`The average effectiveness coefficient offered by each type when used alone (lower is better):`);
const defensiveTypeData = Dex.types.all()
	// .filter(t => t != "Steel")
	.map(t => ({ type: t.name, coefficient: +(Object.entries(typePower).reduce((sum, [type, d]) => sum + d.total * typeEffectiveness(type, [t.name]), 0) / Object.values(typePower).reduce((sum, d) => sum + d.total, 0)).toFixed(2) }))
	.sort((a, b) => a.coefficient - b.coefficient)
	.map((r, i) => { r.place = '#' + (i + 1); return r })
console.log(columnify(defensiveTypeData, { minWidth: 5, dataTransform: (cell, _, i) => colorize(cell, defensiveTypeData[i].type) }))
console.log("(This is useful for choosing defensive Tera types, but does not account for Status moves so undervalues Ghost somewhat.)");
console.log()


console.log("Breakdown of average physical vs. special attacks:");
console.log(columnify(
	["Physical", "Special"].map(cat => ({
		"": cat, "count": tallyDict[cat].num + " (" + Math.round(tallyDict[cat].num / moves.length * 100) + "%)",
		"power": Math.round(tallyDict[cat].totalPower / tallyDict[cat].numPower),
		"acc": Math.round(tallyDict[cat].totalAcc / tallyDict[cat].num),
		"totalPower": Math.round(tallyDict[cat].totalPower),
		"contact": Math.round(tallyDict[cat].contact / tallyDict[cat].num * 100) + "%"
	})), { minWidth: 5, dataTransform: (cell, _, i) => colorize(cell, ["Physical", "Special"][i]) }))
console.log("(Average power doesn't include moves excluded from the last table, but everything else does. Power is accuracy-adjusted.)");
console.log()

const baseAvgBP = (tallyDict["Physical"].totalPower + tallyDict["Special"].totalPower) / (tallyDict["Physical"].numPower + tallyDict["Special"].numPower);
console.log(`Average overall BP (accuracy-adjusted):   \t${Math.round(baseAvgBP)}`);
const technicianAvgBP = tallyDict.technician.total / tallyDict.technician.num;
console.log(`BP with Technician (accuracy-adjusted):   \t${Math.round(technicianAvgBP)} (+${Math.round((technicianAvgBP / baseAvgBP - 1) * 100)}%) \t Applies to ${tallyDict.technician.numApplicable} moves`);
const compoundEyesAvgBP = tallyDict.compoundEyes.total / tallyDict.compoundEyes.num;
console.log(`BP with Compound Eyes (accuracy-adjusted):\t${Math.round(compoundEyesAvgBP)} (+${Math.round((compoundEyesAvgBP / baseAvgBP - 1) * 100)}%) \t Applies to ${tallyDict.compoundEyes.numApplicable} moves`);
console.log()


console.log(`The top ${numMons} defensive type-combos (the ones which resist the most total power) are:`);
const defensiveTypeComboData = legalMons.reduce((dict, s) => {
	const key = [...s.types].sort().join("/");
	if (!(key in dict)) {
		dict[key] = {
			type: key,
			typeF: [...s.types].sort().map(colorize).join("/"),
			pokemon: legalMons.reduce((a, b) => [...b.types].sort().join("/") == key && b.bst > a.bst ? b : a, { bst: -Infinity }),
			total: 0
		};
		for (const t in typePower) {
			dict[key].total += typePower[t].total * typeEffectiveness(t, s.types);
		}
		dict[key].total = Math.round(dict[key].total);
	}
	return dict;
}, {});
console.log(columnify(
	Object.values(defensiveTypeComboData)
		.sort((a, b) => a.total - b.total)
		.slice(0, numMons)
		.map((r, i) => { r.place = '#' + (i + 1); return r })
	, { showHeaders: false, minWidth: 5, columns: ['place', 'typeF', 'total', 'pokemon'] }))
console.log("(The pokemon listed are the highest-BST legal pokemon of the given type combo.)");
console.log()


console.log(`The top ${numMons} offensive type-combos (the ones whose STABs boost the most total power) are:`);
const offensiveTypeData = legalMons.reduce((dict, s) => {
	const key = [...s.types].sort().join("/");
	if (!(key in dict)) {
		dict[key] = {
			type: key,
			typeF: [...s.types].sort().map(colorize).join("/"),
			pokemon: legalMons.reduce((a, b) => [...b.types].sort().join("/") == key && b.bst > a.bst ? b : a, { bst: -Infinity }),
			total: Math.round(s.types.reduce((n, t) => n + (t in typePower ? typePower[t].total : 0), 0)) // Shim for MissingNo (since there are no Bird-type moves)
		};
	}
	return dict;
}, {});
console.log(columnify(
	Object.values(offensiveTypeData)
		.sort((a, b) => b.total - a.total)
		.slice(0, numMons)
		.map((r, i) => { r.place = '#' + (i + 1); return r })
	, { showHeaders: false, minWidth: 5, columns: ['place', 'typeF', 'total', 'pokemon'] }))
console.log("(This does not factor in the fact that enemy pokemon may be commonly immune or resistant to your STABs, which gives Normal a huge advantage.)");
console.log("(Also, STAB barely matters. So you should probably just ignore this table.)");
console.log()


const moveImmunities = {}
for (const type of Dex.types.all()) {
	// Skip steels since they're banned
	if (type.name == "Steel") continue;

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
		console.log(`${colorize(type)} types are immune to ${moveImmunities[type].length}/${moves.length} moves (${Math.round(moveImmunities[type].length / moves.length * 100)}%):`);
		console.log(moveImmunities[type].map(colorize).join(", "))
	});
console.log()


const statData = legalMons
	.map(name => Dex.species.get(name))
	.map(p => {
		const stats = calc_stats(p);
		return {
			name: p.name, type: p.types.map(colorize).join("/"),
			hp: p.baseStats.hp, def: p.baseStats.def, spd: p.baseStats.spd, atk: p.baseStats.atk, spa: p.baseStats.spa,
			physBulk: +(adjustBulkForTyping ? stats.physBulkAdj : stats.physBulk).toFixed(2),
			specBulk: +(adjustBulkForTyping ? stats.specBulkAdj : stats.specBulk).toFixed(2),
			overallBulk: +((adjustBulkForTyping ? stats.physBulkAdj : stats.physBulk) * (tallyDict["Physical"].totalPower / (tallyDict["Physical"].totalPower + tallyDict["Special"].totalPower))
				+ (adjustBulkForTyping ? stats.specBulkAdj : stats.specBulk) * (tallyDict["Special"].totalPower / (tallyDict["Physical"].totalPower + tallyDict["Special"].totalPower))).toFixed(2),
			physPower: +(stats.physPower).toFixed(2),
			specPower: +(stats.specPower).toFixed(2),
			overallPower: +(stats.physPower * (tallyDict["Physical"].totalPower / (tallyDict["Physical"].totalPower + tallyDict["Special"].totalPower))
				+ stats.specPower * (tallyDict["Special"].totalPower / (tallyDict["Physical"].totalPower + tallyDict["Special"].totalPower))).toFixed(2),
			noSpeedBST: p.bst - p.baseStats.spe,
			noSpeedTotal: stats.hp + stats.atk + stats.def + stats.spa + stats.spd,
		}
	});

console.log(`The top ${numMons} bulky pokemon (the ones with the highest physical + special bulk adjusted by ${adjustBulkForTyping ? 'type and' : ''} total physical/special BP) are:`);
console.log(columnify(statData
	.sort((a, b) => b.overallBulk - a.overallBulk)
	.slice(0, numMons)
	.map((r, i) => { r.place = '#' + (i + 1); return r })
	, { minWidth: 5, columns: ['place', 'name', 'type', 'hp', 'def', 'spd', 'physBulk', 'specBulk', 'overallBulk'] }));
console.log()

console.log(`The top ${numMons} offensive pokemon (the ones with the highest physical + special power adjusted by total physical/special BP) are:`);
console.log(columnify(statData
	.sort((a, b) => b.overallPower - a.overallPower)
	.slice(0, numMons)
	.map((r, i) => { r.place = '#' + (i + 1); return r })
	, { minWidth: 5, columns: ['place', 'name', 'type', 'atk', 'spa', 'physPower', 'specPower', 'overallPower'] }));
console.log()

console.log(`The top ${numMons} overall powerful/bulky pokemon (taking the sum of overall power and bulk, with power weighted ${powerWeight}x more) are:`);
console.log(columnify(statData
	.map(r => { r.overallHybrid = +(r.overallPower * powerWeight + r.overallBulk).toFixed(2); return r })
	.sort((a, b) => b.overallHybrid - a.overallHybrid)
	.slice(0, numMons)
	.map((r, i) => { r.place = '#' + (i + 1); return r })
	, { minWidth: 5, columns: ['place', 'name', 'type', 'overallPower', 'overallBulk', 'overallHybrid'] }));
console.log()

console.log(`The top ${numMons} overall stat pokemon (the ones with the highest sum of non-speed stats) are:`);
console.log(columnify(statData
	.sort((a, b) => b.noSpeedBST - a.noSpeedBST)
	.slice(0, numMons)
	.map((r, i) => { r.place = '#' + (i + 1); return r })
	, { minWidth: 5, columns: ['place', 'name', 'type', 'hp', 'atk', 'def', 'spa', 'spd', 'noSpeedBST', 'noSpeedTotal'] }));
console.log()

console.log(`Using a Z-crystal on a move increases its power on average by ${(zPower / moves.length).toFixed(1)}
(This accounts for the many status moves that get no boost whatsoever.)`)
console.log()

const defensiveScoreStats = [];
const RANDOM_FACTOR_AVG = (1 + .85) / 2;
const attackingStatAtk = 400;
const attackingStatSpa = 300;
for (const mon of legalMons) {
	const stats = calc_stats(mon);
	defensiveScoreStats.push({
		mon: mon, name: mon.name, type: mon.types.map(colorize).join("/"),
		defensiveScore: Object.keys(moveDict).reduce((sum, moveName) => {
			const move = Dex.moves.get(moveName);
			return sum + (((2 * 100 / 5 + 2) * moveDict[moveName] * (move.category == 'Physical' ? attackingStatAtk / stats.def : attackingStatSpa / stats.spd)) / 50 + 2) * typeEffectiveness(move.type, mon.types) * RANDOM_FACTOR_AVG;
		}, 0) * 100 / (Object.keys(moveDict).length * stats.hp)
	})
}

console.log(`The top ${numMons} defensive score pokemon are:`);
console.log(`Defensive score represents the average percent HP damage the Pokemon would take from an attacker with ${attackingStatAtk} Atk and ${attackingStatSpa} SpA that pulls a random attack from Metronome. This accounts for typing, physical vs. special attacks, and total HP. Lower is better.`)
console.log(columnify(defensiveScoreStats
	.sort((a, b) => a.defensiveScore - b.defensiveScore)
	.slice(0, numMons)
	.map((r, i) => { r.defensiveScore = r.defensiveScore.toFixed(2); r.place = '#' + (i + 1); return r })
	, { minWidth: 5, columns: ['place', 'name', 'type', 'defensiveScore'] }));
console.log()
