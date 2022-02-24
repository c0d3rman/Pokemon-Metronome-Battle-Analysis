const {Dex, Teams} = require("./pokemon-showdown");
const fs = require('fs')

// Parse command line args
let species;
try {
    args = process.argv.slice(2)
    if (args.length < 1 || args.length > 2) {
        throw new Error("Incorrect number of arguments");
    }
	
	if (args.length == 1)
	{
	  species = 'Regirock';
	}
	else
	{
	  species = args[1].toString();
	}

} catch (e) {
    console.log(e)
    console.log(`Example usage:
\t\tnode set_generator.js test_teams.txt Cresselia
`);
    process.exit();
}

let items = [
  'Weakness Policy', // +2 SpA + Atk when hit SE
  'Choice Band', // x1.5 Atk
  'Choice Specs', // x1.5 SpA
  'Kee Berry', // +1 Def
  'Eviolite', // x1.5 Def + SpD if NFE
  'Leppa Berry', // +5 PP
  'Bright Powder', // Opponents 0.9x Acc
  'Lum Berry', // Cure any status
  'Razor Claw', // +1 Crit Chance
  'Safety Goggles', // Immune to weather damage and powder moves
  'Life Orb', // x1.3 Dmg, -10% HP per attack
  'Wide Lens', // 1.3x Acc
  'Rowap Berry', // -1/8 enemy HP when hit physically
  'Jaboca Berry', // -1/8 enemy HP when hit specially
  'Kings Rock', // 10% flinch chance
  'No Item'
]

let abilities = [
  //
  //S-Tier 
  //
  'Comatose', // immune to status, considered asleep
  'Competitive', // +2 SpA on stat drop
  'Defiant', // +2 Atk on stat drop
  'Flower Veil', // grass types are immune to stat drops and status
  'Intrepid Sword', // +1 Atk on switch-in
  'Magic Bounce', // most status moves "bounce" off and hit user
  'Magic Guard', // immune to indirect Dmg
  'Mold Breaker', // moves ignore abilities
  'Prism Armor', // take 0.75x Dmg from SE attacks, ignores Mold Breaker
  'Tinted Lens', // NVE attacks do 2x Dmg
  'Unaware', // ignore opponents stat changes during attacks
  'Water Bubble', // water attacks do 2x Dmg, you resist fire and are immune to burn
  
  //
  //A-Tier
  //
  'Aerilate', // normal moves are now flying type and 1.2x power
  'As One(Glastrier)', // opponent cannot use berries, +1 Atk on KO
  'As One(Spectrier)', // opponent cannot use berries, +1 SpA on KO
  'Dauntless Shield', // +1 Def on switch-in
  'Delta Stream', // overrides all weather, flying type weaknesses are ignored
  'Desolate Land', // permanent sun, water attacks fail
  'Download', // +1 Atk or SpA, depending on opponents defensive stats
  'Flash Fire', // immunity to fire, fire moves 1.5x power when hit by a fire move
  'Fluffy', // 2x Def, weak to fire
  'Friend Guard', // Ally takes 0.75x Dmg
  'Ice Scales', // 2x SpD
  'Imposter', // transform into opposing pokemon on switch-in
  'Lightning Rod', // immune to electric, +1 SpA when an electric attack is used
  'Misty Surge', // misty terrain on switch-in
  'Pixilate', // normal moves are now fairy type and 1.2x power 
  'Plus', // if ally is Plus, 1.5x SpA
  'Primordial Sea', // permanent rain, fire type attacks fail
  'Refrigerate', // normal moves are now ice type and 1.2x power
  'Serene Grace', // secondary effects are twice as likely
  'Simple', // stat changes are doubled
  'Storm Drain', // immune to water, +1 SpA when a water attack is used
  'Thick Fat', // resist fire and ice
  
  //
  //B-Tier and lower
  //
  'Air Lock', // removes all weather effects
  'Bulletproof', // immune to all ballistic moves
  'Compound Eyes', // 1.3x Acc
  'Cute Charm', // if opposite gender, 30% chance of causing infatuation when hit by a contact move
  'Effect Spore', // 30% chance of random status when hit by a contact move
  'Electric Surge', // electric terrain on switch-in
  'Flame Body', // 30% chance of burn when hit by a contact move
  'Full Metal Body', // immune to stat drops by other pokemon
  'Galvanize', // normal moves are now electric type and 1.2x power
  'Harvest', // 50% chance to restore a used berry, 100% in sun
  'Infiltrator', // ignores mist, safeguard, sub and screens
  'Intimidate', // -1 Opponents Atk on switch-in
  'Levitate', // immune to ground moves
  'Long Reach', // contact moves no longer make contact
  'Magician', // if no item, steal opponents on contact
  'Neuroforce', // SE attacks 1.25x power
  'No Guard', // moves cannot miss, enemies cannot miss you
  'Normalize', // all moves are normal type, 1.2x power if type was changed
  'Overcoat', // immune to weather damage and powder moves
  'Pickpocket', // if no item, steal opponents when they make contact
  'Pickup', // if no item, picks up one used by ally
  'Poison Point', // 30% chance of poisoning enemy when hit by a contact move
  'Poison Touch', // 30% chance of poisoning enemy on contact
  'Power Spot', // ally has 1.3x power
  'Punk Rock', // recieve 0.5x Dmg from sound moves, deal 1.3x Dmg with sound moves
  'Sap Sipper', // immune to grass, +1 Atk when hit by a grass attack
  'Scrappy', // can hit ghosts with normal and fighting type attacks
  'Shed Skin', // 33% chance of curing status every turn
  'Shield Dust', // immune to secondary effects
  'Sniper', // crits do 1.5x usual Dmg
  'Soul Heart', // when a mon faints, +1 SpA
  'Soundproof', // immune to sound moves
  'Steely Spirit', // this pokemon and its ally do 1.5x Dmg with steel type moves
  'Stench', // 10% flinch chance
  'Super Luck', // +1 crit chance
  'Synchronize', // when statused, opponent is too
  'Wonder Skin' // status moves have 50% accuracy against you
]

let natures = [
  'Adamant', // +Atk -SpA
  'Brave', // +Atk - Spe
  'Quiet', // +SpA -Spe
  'Relaxed', // +Def - Spe
  'Sassy' // +SpD -Spe
]

let speeds = [
  '0', // min
  '252' // max
]


function isWeak(mon, type) {
  let damageMult = 1;
  for (const t of mon.types) {
    const cat = Dex.types.get(t).damageTaken[type];
    if (cat == 1) {
      damageMult *= 2;
    } else if (cat == 2) {
      damageMult /= 2;
    } else if (cat == 3) {
      damageMult *= 0;
    }
  }
  return damageMult > 1
}


function validateSet(set) {
  const mon = Dex.species.get(set.species)
  const item = Dex.items.get(set.item)
  
  return !(
  
	//
	// Requires A Particular Type
	//
	
	// Flower Veil should only be run on grass types
    (set.ability == "Flower Veil" && !mon.types.includes("Grass"))
	// Pixilate should only be run on fairy types
	|| (set.ability == "Pixilate" && !mon.types.includes("Fairy"))
	// Refrigerate should only be run on ice types
	|| (set.ability == "Refrigerate" && !mon.types.includes("Ice"))
	// Galvanize should only be run on electric types
	|| (set.ability == "Galvanize" && !mon.types.includes("Electric"))
	// Normalize should only be run on normal types
	|| (set.ability == "Normalize" && !mon.types.includes("Normal"))
	// Aerilate and Delta Stream should only be run on flying types
    || ((set.ability == "Aerilate" || set.ability == "Delta Stream") && !mon.types.includes("Flying"))
	
	//
	// Requires A Particular Type Or Weakness
	//
	
	// Water Bubble and Primordial Sea should only be run on water types, or mons weak to fire
    || ((set.ability == "Water Bubble" || set.ability == "Primordial Sea") && !mon.types.includes("Water") && !isWeak(mon, "Fire"))
	// Desolate Land should only be run on fire types, or mons weak to water
    || (set.ability == "Desolate Land" && !mon.types.includes("Fire") && !isWeak(mon, "Water"))
	
	//
	// Requires A Particular Weakness
	//
	
	// Flash Fire should only be run on mons weak to fire
	|| (set.ability == "Flash Fire" && !isWeak(mon, "Fire"))
	// Levitate should only be run on mons weak to ground
	|| (set.ability == "Levitate" && !isWeak(mon, "ground"))
	// Sap Sipper should only be run on mons weak to grass
	|| (set.ability == "Sap Sipper" && !isWeak(mon, "Grass"))
	
	//
	// Requires A Particular Weakness, Or Special Attack Stat
	//
	
	// Lightning Rod should only be run on mons weak to electric, or if SpA > Atk
	|| (set.ability == "Lightning Rod" && !isWeak(mon, "Electric") && mon.baseStats.atk > 1.25 * mon.baseStats.spa)
	// Storm Drain should only be run on mons weak to water, or if SpA > Atk
	|| (set.ability == "Storm Drain" && !isWeak(mon, "Water") && mon.baseStats.atk > 1.25 * mon.baseStats.spa)
	
	//
	// Outclassed/Redundant Abilities
	//
	
	// grass types should not use abilities that are a worse flower veil
	|| (mon.types.includes("Grass") && (set.ability == "Overcoat" || set.ability == "Shed Skin" || set.ability == "Shield Dust"))
	
	//
	// Special Item Clauses
	//
	
	// If the item only works for certain Pokemon (e.g. Light Ball) then we should be using one of those
    || (item.itemUser && !item.itemUser.includes(mon.name))
    // Eviolite should only be used on NFEs
    || (item.name == "Eviolite" && !mon.nfe)
    // You shouldn't run an NFE unless you're using Eviolite or Light Ball, unless its Scyther
    || ((set.species != "Scyther" && !["Eviolite", "Light Ball"].includes(item.name)) && mon.nfe)
	
	//
	// Life Orb + Magic Guard
	//
	
	// Don't use life orb without magic guard
    || (set.item == "Life Orb" && set.ability != "Magic Guard")
	
	//
	// Stench + King's Rock
	//
	
	// Stench and King's Rock do not stack
	|| (set.item == "Kings Rock" && set.ability == "Stench")
	
	//
	// Berries etc
	//
	
    // Leppa berry is only viable on imposter
    || (set.item == "Leppa Berry" && set.ability != "Imposter")
	// Harvest should only be run with a berry
	|| (set.ability == "Harvest" && item.isBerry != true)
	// Magician should only be run with WP, no item or a berry
	|| ((set.ability == "Magician" || set.ability == "Pickpocket") && set.item != "Weakness Policy" && item.isBerry != true && set.item != "No Item")
	// Pickup should only be run with WP or a berry
	|| (set.ability == "Pickup" && set.item != "Weakness Policy" && item.isBerry != true)
	// No Item should only be run with Magician and Pickpocket
	|| (set.item == "No Item" && set.ability != "Magician" && set.ability != "Pickpocket")
	
	//
	// Abilities Dependent On Stats
	//
	
	// Choice Specs, As One(Spectrier), Competitive, Download, Plus and Soul Heart should not be run if Atk > SpA
    || ((set.item == "Choice Specs" || set.ability == "Competitive" || set.ability == "As One(Spectrier)" || set.ability == "Download" || set.ability == "Plus" || set.ability == "Soul Heart") && mon.baseStats.atk > 1.25 * mon.baseStats.spa)
	// Choice Band, As One(Glastrier), Defiant and Intrepid Sword should not be run if SpA >>> Atk
	|| ((set.item == "Choice Band" || set.ability == "As One(Glastrier)" || set.ability == "Defiant" || set.ability == "Intrepid Sword") && mon.baseStats.spa >= 1.5 * mon.baseStats.atk)
	
	//
	// Nature Don't Make Sense
	//
	
	// If Atk >>> SpA, dont run Quiet
	|| (mon.baseStats.atk >= 1.5 * mon.baseStats.spa && set.nature == "Quiet" )
	// If SpA >>> Atk, dont run Adamant
	|| (mon.baseStats.spa >= 1.5 * mon.baseStats.atk && set.nature == "Adamant" )
	
	//
	// EVs Don't Make Sense
	//
	
	// If Spe >= 100, dont run min speed
	|| (mon.baseStats.spe >= 100 && set.evs.spe == 0)
	// If Spe <= 60, dont run max speed
	|| (mon.baseStats.spe <= 60 && set.evs.spe != 0)
	
	//
	// Banned Combos
	//
	|| (set.ability == "Harvest" && (set.item == "Jaboca Berry" || set.item == "Rowap Berry"))
	
	//
	// Other
	//
	
    // Imposter should either be run on Blissey or with a species-unique item
    || (set.ability == "Imposter" && set.species != "Blissey" && !["Thick Club", "Light Ball", "Leek", "Stick", "Eviolite"].includes(item.name))
  )
}

// If we're being run directly (as opposed to imported)
if (typeof require !== 'undefined' && require.main === module) {
  let sets = []
  
  // if the species isnt valid, sub in a placeholder mon
  if (!Dex.species.get(species).exists)
  {
	console.log('Invalid Pokemon name, using Regirock instead')
	species = 'Regirock'
  }
  
  // this was moved here so its only done once, its a const anyways
  const mon = Dex.species.get(species)
  
  for (const item of items) {
    for (const ability of abilities) {
      for (const nature of natures) {
        for (const speed of speeds) {
		  
          const set = {
            species: mon.name,
            item: item,
            ability: ability,
            nature: nature,
            evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (speed == "0" ? 0 : 252) },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: (speed == "0" ? 0 : 31) },
            moves: ['Metronome']
          }

          if (validateSet(set)) {
            sets.push(set)
          }        
        }
      }
    }
  }

  console.log(`Generated ${sets.length} sets`);
  fs.writeFile(process.argv[2], sets.map(set => {
    return "=== [gen8metronomebattle] " + 
    `${set.species}, ${set.ability}, ${set.item}, ${set.nature}, ${(set.ivs.spe == 0 ? "min" : "neut")}-speed ===\n\n` +
    Teams.export([set, set]) + "\n\n"
  }).join(""), () => {})
}

module.exports = {items: items, abilities: abilities, natures: natures, speeds: speeds, validateSet: validateSet}
