const workerpool = require('workerpool');
const {BattleStream} = require('../pokemon-showdown');

const chooseMove1 = require('../' + process.argv[2]).chooseMove;
const chooseMove2 = require('../' + process.argv[3]).chooseMove;

async function simBattle(team1, team2) {
    const stream = new BattleStream();

    stream.write(`>start {"formatid":"gen8metronomebattle","strictChoices":true}`);
    stream.write(`>player p1 {"name":"P1","team":"${team1}"}`);
    stream.write(`>player p2 {"name":"P2","team":"${team2}"}`);

    const side1 = stream.battle.sides[0]
    const side2 = stream.battle.sides[1]

    for await (const output of stream) {
        const m = output.match(/\|win\|(P[12])/);
        if (m) {
            return m[1];
        }

        if (/\|turn\|\d+$/.test(output)) {
            stream.write(chooseMove1(stream, side1, side2))
            stream.write(chooseMove2(stream, side2, side1))
        }
    }
}

// create a worker and register public functions
workerpool.worker({simBattle: simBattle});