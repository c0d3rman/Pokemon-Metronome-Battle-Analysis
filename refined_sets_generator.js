const {Teams} = require("./pokemon-showdown");
const fs = require('fs')

let outfile, infile;
if (process.argv.length == 3) {
  outfile = process.argv[2]
  infile = 0
} else {
  outfile = process.argv[3]
  infile = process.argv[2]
}


let sets = []
fs.readFileSync(infile).toString().split("\n").forEach((line) => {
    let match = line.match(/^\s*#\d+\s*\|\s*[\d.]+\s*\|\s*(.+?), (.+?), (.+?), (.+?), (.+?)$/)
    if (match != null) {
        sets.push({
          species: match[1],
          ability: match[2],
          item: match[3],
          nature: match[4],
          evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (match[5] == "min-speed" ? 0 : 255) },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: (match[5] == "min-speed" ? 0 : 31) },
          moves: ['Metronome']
        })
    }
})

console.log(`Decoded ${sets.length} sets`);
fs.writeFile(outfile, sets.map(set => {
  return "=== [gen8metronomebattle] " + 
  `${set.species}, ${set.ability}, ${set.item}, ${set.nature}, ${(set.ivs.spe == 0 ? "min" : "neut")}-speed ===\n\n` +
  Teams.export([set, set]) + "\n\n"
}).join(""), () => {})
