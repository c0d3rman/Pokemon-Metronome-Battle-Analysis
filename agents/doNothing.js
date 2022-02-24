function chooseMove(stream, side, other) {
    let out = `>${side.id} move 1`;
    if (side.allies().length == 2) {
        out += ", move 1"
    }
    return out
}

module.exports = {
    chooseMove: chooseMove
}