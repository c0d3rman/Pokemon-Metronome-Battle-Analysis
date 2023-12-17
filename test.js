const {Dex} = require('./pokemon-showdown');
const {typeEffectiveness} = require('./util/misc')
const columnify = require('columnify');
const {colorize} = require('./util/output')

const ts = ['Dark', 'Steel', 'Grass', 'Fighting', 'Poison', 'Psychic', 'Fire']
const d = {}

for (let i = 0; i < ts.length; i++) {
    for (let j = i + 1; j < ts.length; j++) {
        for (let k = j + 1; k < ts.length; k++) {
            d[ts[i] + "/" + ts[j] + "/" + ts[k]] = Dex.species.all()
                .filter(p => ['OU', 'UUBL'].includes(p.tier))
                .filter(p => Math.max(...['Electric', ts[i], ts[j], ts[k]]
                    .map(t => typeEffectiveness(t, p.types))
                ) <= 1)
                .map(p => p.name)
        }
    }
}

console.log(columnify(Object.keys(d)
	.map(t => ({name: t.split("/").map(colorize).join("/"), num: d[t].length}))
	.sort((a, b) => a.num - b.num)
	.map((r, i) => {r.place = '#'+(i+1); return r})
, {minWidth: 5, columns: ['place', 'name', 'num']}));
console.log()

console.log(d["Dark/Fighting/Poison"].filter(x => !d["Dark/Fighting/Psychic"].includes(x)))
console.log(d["Dark/Fighting/Psychic"].filter(x => !d["Dark/Fighting/Poison"].includes(x)))