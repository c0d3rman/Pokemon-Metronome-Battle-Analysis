const workerpool = require('workerpool');
const {BattleStream} = require('pokemon-showdown');

async function simBattle(team1, team2) {
    const stream = new BattleStream();

    stream.write(`>start {"formatid":"gen8metronomebattle"}`);
    stream.write(`>player p1 {"name":"P1","team":"${team1}"}`);
    stream.write(`>player p2 {"name":"P2","team":"${team2}"}`);

    let p1alive = 2;
    let p2alive = 2;

    for await (const output of stream) {
        for (const match of output.matchAll(/\|faint\|p([12])[ab]: /g)) {
            if (match[1] == '1') {
                p1alive--;
            } else {
                p2alive--;
            }
        }

        const m = output.match(/\|win\|(P[12])/);
        if (m) {
            return m[1];
        }

        if (/\|turn\|\d+$/.test(output)) {
            if (p1alive == 2) {
                stream.write(`>p1 move 1, move 1`);
            } else {
                stream.write(`>p1 move 1`);
            }
            if (p2alive == 2) {
                stream.write(`>p2 move 1, move 1`);
            } else {
                stream.write(`>p2 move 1`);
            }
        }
    }
}

// create a worker and register public functions
workerpool.worker({simBattle: simBattle});