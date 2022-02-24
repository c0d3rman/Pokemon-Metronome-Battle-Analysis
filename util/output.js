const chalk = require('chalk');
const {Dex} = require('../pokemon-showdown');

// Function to colorize numbers from red to green
// Returns a function that you can use to color text
function colorizeN(n, min, max) {
    if (n < min - Number.EPSILON || n > max + Number.EPSILON) {
        return chalk.yellow;
    }
    if (min == max) {
        return chalk.white;
    }

    n = (n - min) / (max - min);

    if (n < 0.5) {
        return chalk.rgb(255, Math.round(255 * n * 2), Math.round(255 * n * 2));
    } else {
        return chalk.rgb(Math.round(255 * (1 - n) * 2), 255, Math.round(255 * (1 - n) * 2));
    }
}

// Colors associated with the various types
const typeColors = {
    "Normal": "#A8A77A",
    "Fire": "#EE8130",
    "Water": "#6390F0",
    "Electric": "#F7D02C",
    "Grass": "#7AC74C",
    "Ice": "#96D9D6",
    "Fighting": "#C22E28",
    "Poison": "#A33EA1",
    "Ground": "#E2BF65",
    "Flying": "#A98FF3",
    "Psychic": "#F95587",
    "Bug": "#A6B91A",
    "Rock": "#B6A136",
    "Ghost": "#735797",
    "Dragon": "#6F35FC",
    "Dark": "#705746",
    "Steel": "#B7B7CE",
    "Fairy": "#D685AD",
    "Bird": "#7A9F90", // Yes really, it's MissingNo's type
    "Physical": "#BA3423",
    "Special": "#51586E"
};
function colorize(s, type) {
    if (typeof type != 'string') {
        type = s in typeColors ? s : Dex.moves.get(s).type
    }
    return chalk.hex(typeColors[type])(s)
}


// Function for pretty-printing matrices
// Modified from https://gist.github.com/lbn/3d6963731261f76330af
function matprint(mat, stringifier, leftAlign=false) {
    let shape = [mat.length, mat[0].length];
    function col(mat, i) {
        return mat.map(row => row[i]);
    }
    let colMaxes = [];
    for (let i = 0; i < shape[1]; i++) {
        colMaxes.push(Math.max.apply(null, col(mat, i).map(n => n.toString().length)));
    }

    mat.forEach((row, i) => {
        if (leftAlign) {
            console.log.apply(null,row.map((val, j) => "  " + (stringifier ? stringifier(val.toString(), i, j) : val.toString()) + new Array(colMaxes[j]-val.toString().length+1).join(" ") ));
        } else {
            console.log.apply(null,row.map((val, j) => new Array(colMaxes[j]-val.toString().length+1).join(" ") + (stringifier ? stringifier(val.toString(), i, j) : val.toString()) + "  "));
        }
    });
}


module.exports = {
    matprint: matprint,
    colorizeN: colorizeN,
    colorize: colorize
}