const {Dex, Teams} = require("./pokemon-showdown");
const fs = require('fs')


let species = 'Cresselia';

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
  'Kings Rock'
]

let abilities = [
  //
  //S-Tier 
  //
  'Comatose',
  'Competitive', // TODO: only if SpA > Atk
  'Defiant',
  'Flower Veil',
  'Intrepid Sword',
  'Magic Bounce',
  'Magic Guard',
  'Mold Breaker',
  'Prism Armor',
  'Tinted Lens',
  'Unaware',
  'Water Bubble', // TODO: only if water type or weak to fire
  
  //
  //A-Tier
  //
  'Aerilate', // TODO: only if flying type
  'As One(Glastrier)',
  'As One(Spectrier)', // TODO: only if SpA > Atk
  'Analytic', // TODO: probably only when slow and teammate is faster
  'Dauntless Shield',
  'Delta Stream', // TODO: only if mon is flying type
  'Desolate Land', // TODO: only if team is weak to water
  'Download', // TODO: only if SpA > Atk
  'Flash Fire', // TODO: only if mon is weak to fire
  'Friend Guard',
  'Ice Scales',
  'Imposter', // TODO: only leppa blissey or light ball pikachu or thick club marowak/marowak-a
  'Lightning Rod', // TODO: only if mon is weak to electric, or SpA > Atk
  'Mirror Armor',
  'Misty Surge',
  'Mummy',
  'Pixilate', // TODO: only if mon is a fairy
  'Plus', // TODO: both mons, and only if SpA > Atk
  'Primordial Sea', // TODO: only if mon is weak to fire or a water type
  'Refrigerate', // TODO: only if mon is ice type
  'Serene Grace',
  'Sheer Force',
  'Simple',
  'Storm Drain', // TODO: only if mon is weak to water, or SpA > Atk
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
  'Electric Surge', // TODO: only if the mon is electric type
  'Flame Body',
  'Full Metal Body',
  'Galvanize', // TODO: only if mon is electric type
  'Harvest', // TODO: only if mon is holding a berry
  'Healer', // TODO: not a grass type, they have veil
  'Hydration', // TODO: only if teammate has Primordial Sea
  'Illusion', // TODO: Slot 1 only
  'Innards Out', // TODO: the shit chansey set only
  'Infiltrator',
  'Intimidate',
  'Levitate', // TODO: only if mon is weak to ground
  'Liquid Voice', // TODO: only if teammate has storm drain, yes this works for perish song btw
  'Long Reach',
  'Magician', // TODO: only if WP or no item
  'Neuroforce',
  'No Guard',
  'Normalize', // TODO: only if mon is normal type
  'Overcoat', // TODO: only if the mon isnt grass type
  'Pastel Veil', // TODO: only if mon is NOT poison type
  'Pickup', // TODO: only if WP, Rowap or Jaboca on both mons
  'Poison Point',
  'Poison Touch',
  'Power Spot',
  'Punk Rock',
  'Sap Sipper', // TODO: only if mon is weak to grass
  'Scrappy', // TODO: only if mon is normal or fighting type
  'Shadow Shield',
  'Shed Skin', // TODO: only if the mon isnt grass type
  'Shield Dust', // TODO: only if the mon isnt grass type
  'Sniper',
  'Soul Heart', // TODO: only if SpA > Atk
  'Soundproof',
  'Steely Spirit', // TODO: only if mon is steel type
  'Stench', // TODO: only if mon is NOT holding a Kings Rock
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

function validateSet(set) {
  const mon = Dex.species.get(set.species)
  const item = Dex.items.get(set.item)
  return !(
    !mon.exists
    // Don't use life orb without magic guard
    || (set.item == "Life Orb" && set.ability != "Magic Guard")
    // Leppa berry is only viable on imposter
    || (set.item == "Leppa Berry" && set.ability != "Imposter")
    // If the item only works for certain Pokemon (e.g. Light Ball) then we should be using one of those
    || (item.itemUser && !item.itemUser.includes(mon.name))
    // Eviolite should only be used on NFEs
    || (item.name == "Eviolite" && !mon.nfe)
    // You shouldn't run an NFE unless you're using Eviolite or Light Ball
    || (!["Eviolite", "Light Ball"].includes(item.name) && mon.nfe)
    // Flower Veil should only be run on grass types
    || (set.ability == "Flower Veil" && !mon.types.includes("Grass"))
    // Analytic should be run with min speed
    || (set.ability == "Analytic" && set.speed != "min")
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
            evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (speed == "0" ? 0 : 255) },
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
