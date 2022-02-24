const workerpool = require('workerpool');
const {BattleStream} = require('./pokemon-showdown');

function chooseMove(stream, mySide) {
    const side = stream.battle.sides[mySide]
    const allies = side.allies()

    let doDyna = 0;
    if (side.canDynamaxNow() && side.baseMoveSlots) {
        if (allies.length == 1) {
            if (allies[0].moveSlots[0].id == "metronome" && allies[0].baseMoveSlots[0].pp == 1) {
                doDyna = 1
            }
        } else {
            if (allies[0].moveSlots[0].id == "metronome" && allies[0].baseMoveSlots[0].pp == 1 && allies[1].baseMoveSlots[0].pp <= 1) {
                doDyna = 1;
            } else if (allies[1].moveSlots[0].id == "metronome" && allies[0].baseMoveSlots[0].pp == 0 && allies[1].baseMoveSlots[0].pp == 1) {
                doDyna = 2;
            }
        }
    }
    
    let out = `>p${mySide+1} move 1`;
    if (doDyna == 1) {
        out += " dynamax"
    }
    if (allies.length == 2) {
        out += ", move 1"
        if (doDyna == 2) {
            out += " dynamax"
        }
    }
    return out
}

async function simBattle(team1, team2) {
    const stream = new BattleStream();

    stream.write(`>start {"formatid":"gen8metronomebattle","strictChoices":true}`);
    stream.write(`>player p1 {"name":"P1","team":"${team1}"}`);
    stream.write(`>player p2 {"name":"P2","team":"${team2}"}`);

    for await (const output of stream) {
        const m = output.match(/\|win\|(P[12])/);
        if (m) {
            return m[1];
        }

        if (/\|turn\|\d+$/.test(output)) {
            stream.write(chooseMove(stream, 0))
            stream.write(chooseMove(stream, 1))
        }
    }
}

// create a worker and register public functions
workerpool.worker({simBattle: simBattle});