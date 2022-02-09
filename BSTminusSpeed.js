// Run this script in a console on the Pokemon Showdown teambuilder
// to sort pokemon by BST minus speed (a better sort for Metronome Battles)
if (typeof old === 'undefined') {
    let old = BattlePokemonSearch.prototype.sort
    BattlePokemonSearch.prototype.sort = function(results, sortCol, reverseSort) {
        const sortOrder = reverseSort ? -1 : 1;
        if (sortCol == "bstm") {
            return results.sort(([rowType1, id1], [rowType2, id2]) => {
                    const base1 = this.dex.species.get(id1).baseStats;
                    const base2 = this.dex.species.get(id2).baseStats;
                    const bstm1 = base1.hp + base1.atk + base1.def + base1.spa + base1.spd;
                    const bstm2 = base2.hp + base2.atk + base2.def + base2.spa + base2.spd;
                    return (bstm2 - bstm1) * sortOrder;
                });
        } else {
            return old(results, sortCol, reverseSort)
        }
    }
}
search.engine.toggleSort('bstm');
search.sortCol = search.engine.sortCol;
search.find('');