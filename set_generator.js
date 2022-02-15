const {Dex, Teams} = require("./pokemon-showdown");
const fs = require('fs')


let species = 'Dusclops';

let items = [
  'Weakness Policy',
  'Choice Band',
  'Choice Specs',
  'Kee Berry',
  'Eviolite',
  'Leppa Berry',
  'Bright Powder',
  'Lum Berry',
  'Razor Claw',
  'Safety Goggles',
  'Life Orb',
  'Wide Lens',
  'Rowap Berry',
  'Jaboca Berry',
  'Kings Rock',
  'No Item'
]

let abilities = [
  //
  //S-Tier 
  //
  'Comatose',
  'Competitive',
  'Defiant',
  'Flower Veil',
  'Intrepid Sword',
  'Magic Bounce',
  'Magic Guard',
  'Mold Breaker',
  'Prism Armor',
  'Tinted Lens',
  'Unaware',
  'Water Bubble',
  
  //
  //A-Tier
  //
  'Aerilate',
  'As One(Glastrier)',
  'As One(Spectrier)',
  'Analytic',
  'Dauntless Shield',
  'Delta Stream',
  'Desolate Land',
  'Download',
  'Flash Fire',
  'Friend Guard',
  'Ice Scales',
  'Imposter',
  'Lightning Rod',
  'Mirror Armor',
  'Misty Surge',
  'Mummy',
  'Pixilate',
  'Plus',
  'Primordial Sea',
  'Refrigerate',
  'Serene Grace',
  'Sheer Force',
  'Simple',
  'Storm Drain',
  'Thick Fat',
  'Trace',
  
  //
  //B-Tier and lower
  //
  'Air Lock',
  'Bulletproof',
  'Compound Eyes',
  'Cute Charm',
  'Contrary',
  'Dancer',
  'Effect Spore',
  'Electric Surge',
  'Flame Body',
  'Full Metal Body',
  'Galvanize',
  'Harvest',
  'Healer',
  //'Hydration', // TODO: only if teammate has Primordial Sea
  //'Illusion', // TODO: Slot 1 only
  //'Innards Out', // TODO: the shit chansey set only
  'Infiltrator',
  'Intimidate',
  'Levitate',
  //'Liquid Voice', // TODO: only if teammate has storm drain, yes this works for perish song btw
  'Long Reach',
  'Magician',
  'Neuroforce',
  'No Guard',
  'Normalize',
  'Overcoat',
  'Pastel Veil',
  'Pickup',
  'Poison Point',
  'Poison Touch',
  'Power Spot',
  'Punk Rock',
  'Sap Sipper',
  'Scrappy',
  'Shadow Shield',
  'Shed Skin',
  'Shield Dust',
  'Sniper',
  'Soul Heart',
  'Soundproof',
  'Steely Spirit',
  'Stench',
  'Super Luck',
  'Synchronize',
  'Truant', //one way to win the PP war, I suppose
  'Wonder Skin'
]

let natures = [
  'Brave',
  'Quiet',
  'Relaxed',
  'Sassy'
]

let speeds = [
  '0',
  '252'
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
    !mon.exists
	
	//
	// Requires A Particular Type
	//
	
	// Flower Veil should only be run on grass types
    || (set.ability == "Flower Veil" && !mon.types.includes("Grass"))
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
	|| (mon.types.includes("Grass") && (set.ability == "Healer" || set.ability == "Overcoat" || set.ability == "Shed Skin" || set.ability == "Shield Dust" || set.ability == "Pastel Veil"))
	// poison types should not use Pastel Veil
	|| (mon.types.includes("Poison") && set.ability == "Pastel Veil")
	
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
	|| (set.ability == "Magician" && set.item != "Weakness Policy" && item.isBerry != true && set.item != "No Item")
	// Pickup should only be run with WP or a berry
	|| (set.ability == "Pickup" && set.item != "Weakness Policy" && item.isBerry != true)
	// No Item should only be run with Magician or Pickup
	|| (set.item == "No Item" && set.ability != "Magician")
	
	//
	// Abilities Dependent On Stats
	//
	
    // Analytic should be run with min speed
    || (set.ability == "Analytic" && set.speed != "min")
	// As One(Spectrier), Competitive, Download, Plus and Soul Heart should not be run if Atk > SpA
    || ((set.ability == "Competitive" || set.ability == "As One(Spectrier)" || set.ability == "Download" || set.ability == "Plus" || set.ability == "Soul Heart") && mon.baseStats.atk > 1.25 * mon.baseStats.spa)
	
	//
	// Nature Doesn't Make Sense
	//
	
	// If Atk >>> SpA, dont run Quiet
	|| (mon.baseStats.atk >= 1.5 * mon.baseStats.spa && set.nature == "Quiet" )
	// If Spe >= 100, dont run min speed
	|| (mon.baseStats.spe >= 100 && set.evs.spe == 0)
	// If Spe <= 60, dont run max speed
	|| (mon.baseStats.spe <= 60 && set.evs.spe != 0)
	
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
  for (const item of items) {
    for (const ability of abilities) {
      for (const nature of natures) {
        for (const speed of speeds) {
          const mon = Dex.species.get(species)
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
