function chooseMove(stream, side, other) {
    const allies = side.allies()
    
    let out = `>${side.id} move 1`;
    if (stream.battle.turn == 1) {
        out += " dynamax"
    }
    if (allies.length == 2) {
        out += ", move 1"
    }
    return out
}

module.exports = {
    chooseMove: chooseMove
}