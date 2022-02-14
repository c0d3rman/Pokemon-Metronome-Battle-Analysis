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
  'neutral',
  'min'
]

let sets = []
for (const item of items) {
  for (const ability of abilities) {
    for (const nature of natures) {
      for (const speed of speeds) {
        const mon = Dex.species.get(species)

        if (!mon.exists
          || (item == "Life Orb" && ability != "Magic Guard")
          || (item == "Leppa Berry" && ability != "Imposter")
          || (item == "Light Ball" && !species.includes("Pikachu"))
          || (item == "Eviolite" && !mon.nfe)
          || (!["Eviolite", "Light Ball"].includes(item) && mon.nfe)
          || (ability == "Flower Veil" && !mon.types.includes("Grass"))
          || (ability == "Analytic" && speed != "min")
          || (ability == "Imposter" && species != "Blissey" && !["Thick Club", "Light Ball", "Leek", "Stick", "Eviolite"].includes(item))
        ) {
          continue
        }

        sets.push({
          species: mon.name,
          item: item,
          ability: ability,
          nature: nature,
          evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (speed == "min" ? 0 : 255) },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: (speed == "min" ? 0 : 31) },
          moves: ['Metronome']
        })
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