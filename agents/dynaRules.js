const {typeEffectiveness} = require("../util/misc");

function chooseMove(stream, side, other) {
    const allies = side.allies()
    const enemies = other.allies()

    let doDyna = (() => {
        if (side.canDynamaxNow()) {
            // Opponent is using a SE two-turn move
            // You are affected by Wrap/Bind/Magma Storm/Sand Tomb/Infestation/Whirlpool
            
            // The opponent is using Outrage, Petal Dance or Thrash and you do not resist it
            // TODO: test
            for (const enemy of enemies) {
                let move = undefined;
                if ('lockedmove' in enemy.volatiles && enemy.volatiles['lockedmove'].sourceEffect.category != 'Status') {
                    move = enemy.volatiles['lockedmove'].sourceEffect
                } else if ('twoturnmove' in enemy.volatiles) {
                    move = enemy.volatiles['twoturnmove'].sourceEffect
                }

                if (move) {
                    for (let i = 0; i < allies.length; i++) {
                        if (typeEffectiveness(move.type, allies[0].types) > 1) {
                            return i + 1
                        }
                    }
                }
            }

            // We are affected by Torment
            // TODO: test
            for (let i = 0; i < allies.length; i++) {
                if ('torment' in allies[i].volatiles && allies[i].getMoveRequestData().canDynamax) {
                    return i + 1;
                }
            }

            // We are about to struggle and want to dynamax to last a bit longer
            // TODO: test
            for (let i = 0; i < allies.length; i++) {
                if (allies[i].getMoveRequestData().canDynamax && allies[i].baseMoveSlots[0].pp == 1) {
                    return i + 1
                }
            }

            // Opponent is taking residual damage and will die within 3 turns
            // Poison, burn, toxic, leech seed
            // TODO: weather
            // TODO: test
            if (enemies.some(p => {
                const health = parseInt(p.getHealth().shared.match(/^\d+/)[0]);
                let expectedDamage = 0;
                if (p.status == 'psn') expectedDamage += 36
                if (p.status == 'brn') expectedDamage += 18
                if (p.status == 'tox') {
                    let stage = p.statusState.stage
                    for (let i = 0; i < 3; i++) {
                        expectedDamage += Math.floor(6.25 * stage + Math.EPSILON)
                        if (stage < 15) stage++
                    }
                }
                if ('leechseed' in enemies[0].volatiles) expectedDamage += 36
                return expectedDamage >= health
            })) {
                if (allies[0].getMoveRequestData().canDynamax) {
                    return 1
                } else if (allies.length == 2 && allies[1].getMoveRequestData().canDynamax) {
                    return 2
                }
            }
        }

        return 0
    })();
    let out = `>${side.id} move 1`;
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

module.exports = {
    chooseMove: chooseMove
}