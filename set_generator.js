const {Dex, Teams} = require("./pokemon-showdown");
const fs = require('fs')


let species = 'Type: Null';

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
  'Life Orb'
]

let abilities = [
  'Intrepid Sword',
  'Dauntless Shield',
  'Fur Coat',
  'Ice Scales',
  'Magic Bounce',
  'Magic Guard',
  'Competitive',
  'Defiant',
  'Flower Veil',
  'Friend Guard',
  'Simple',
  'Imposter',
  'Compound Eyes',
  'Desolate Land',
  'Primordial Sea',
  'Download',
  'Mirror Armor',
  'Innards Out',
  'Storm Drain',
  'Lightning Rod',
  'Analytic',
  'Plus',
  'Prism Armor'
]

let natures = [
  'Brave',
  'Quiet',
  'Relaxed'
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