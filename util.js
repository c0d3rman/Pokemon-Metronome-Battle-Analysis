const chalk = require('chalk');

// Function to colorize numbers from red to green
function getColor(n, min, max) {
    if (n < min || n > max) {
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

// Function for pretty-printing matrices
// Modified from https://gist.github.com/lbn/3d6963731261f76330af
function matprint(mat, stringifier) {
    let shape = [mat.length, mat[0].length];
    function col(mat, i) {
        return mat.map(row => row[i]);
    }
    let colMaxes = [];
    for (let i = 0; i < shape[1]; i++) {
        colMaxes.push(Math.max.apply(null, col(mat, i).map(n => n.toString().length)));
    }

    mat.forEach((row, i) => {
        console.log.apply(null,row.map((val, j) => new Array(colMaxes[j]-val.toString().length+1).join(" ") + (stringifier ? stringifier(val.toString(), i, j) : val.toString()) + "  "));
    });
}

module.exports = {
    matprint: matprint,
    getColor: getColor
}