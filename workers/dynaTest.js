// This file simulates battles with side 1 using its dynamax strategy
// but side 2 not using it. It then only includes battles where at least one side's
// dynamax strategy was triggered (even if it was side 2 and it didn't actually end up dynamaxing)


const workerpool = require('workerpool');
const {BattleStream} = require('../pokemon-showdown');
const path = require('path');
const fs = require('fs');

const chooseMove1 = require('../' + process.argv[2]).chooseMove;
const chooseMove2 = require('../' + process.argv[3]).chooseMove;

async function simBattle(team1, team2) {
    const stream = new BattleStream();

    stream.write(`>start {"formatid":"gen8metronomebattle","strictChoices":true}`);
    stream.write(`>player p1 {"name":"P1","team":"${team1}"}`);
    stream.write(`>player p2 {"name":"P2","team":"${team2}"}`);

    const side1 = stream.battle.sides[0]
    const side2 = stream.battle.sides[1]

    let didDmax = false

    for await (const output of stream) {
        const m = output.match(/\|win\|(P[12])/);
        if (m) {
            return (didDmax ? m[1] : "ignore");
        }

        if (/\|turn\|\d+$/.test(output)) {
            const move1 = chooseMove1(stream, side1, side2);
            const move2 = chooseMove2(stream, side2, side1);
            if (move1.includes(" dynamax") || move2.includes(" dynamax")) {
                didDmax = true;
            }
            stream.write(move1)
            stream.write(move2.replace(" dynamax", ""))
        }
    }
}

// create a worker and register public functions
workerpool.worker({simBattle: simBattle});