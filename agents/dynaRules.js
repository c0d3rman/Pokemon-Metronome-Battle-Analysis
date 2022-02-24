function chooseMove(stream, side, other) {
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