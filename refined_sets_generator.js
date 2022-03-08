const { Teams } = require("./pokemon-showdown");
const fs = require('fs')
const { loadFile } = require("./util/input")

let outfile, infile;
if (process.argv.length == 3) {
  outfile = process.argv[2]
  infile = 0
} else {
  outfile = process.argv[3]
  infile = process.argv[2]
}


const teams = []
loadFile(infile).split("\n").forEach((line) => {
  let match = line.match(/^\s*#\d+\s*\|\s*[\d.]+\s*\|\s*(.+)$/)
  if (match != null) {
    const sets = match[1].split(" + ").map(setStr => setStr.split(", ")).map(set => ({
      species: set[0],
      ability: set[1],
      item: set[2],
      nature: set[3],
      evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: (set[4] == "min-speed" ? 0 : 255) },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: (set[4] == "min-speed" ? 0 : 31) },
      moves: ['Metronome']
    }))
    if (sets.length == 1) sets.push(sets[0])
    teams.push(sets)
  }
})

console.log(`Decoded ${teams.length} teams`);
fs.writeFile(outfile, teams.map(team => {
  return "=== [gen8metronomebattle] " +
    `${team[0].species}, ${team[0].ability}, ${team[0].item}, ${team[0].nature}, ${(team[0].ivs.spe == 0 ? "min" : "neut")}-speed + ${team[1].species}, ${team[1].ability}, ${team[1].item}, ${team[1].nature}, ${(team[1].ivs.spe == 0 ? "min" : "neut")}-speed ===\n\n` +
    Teams.export(team) + "\n\n"
}).join(""), () => { })
