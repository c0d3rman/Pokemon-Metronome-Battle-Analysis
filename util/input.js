const fs = require('fs');
const {Teams, TeamValidator} = require('../pokemon-showdown');




// Function to load Showdown-format teams from a provided string (presumably loaded from a file)
const validator = new TeamValidator('gen8metronomebattle');
function loadTeams(str) {
    str = str.trim() + "\n\n\n\n";

    if (str.match(/^(?:=== \[gen8metronomebattle\] ([^\n]*?) ===\n.+?\n\n\n\n)+/s)[0] != str) {
        console.log("*** WARNING: the teams file seems to be invalid\n")
    }

    return [...str
    .matchAll(/^=== \[gen8metronomebattle\] ([^\n]*?) ===\n(.+?)\n\n\n\n/gms)]
    .reduce((dict, match) => {
        const team = Teams.import(match[2]);
        let name = match[1];
        const m = name.match(/^(.+?)\/(.+?)$/);
        if (m) {
            name = m[2];
        }

        // Handle duplicate team names
        fullName = name
        i = 1
        while (fullName in dict) {
            i++
            fullName = `${name} [${i}]`
        }
        if (i > 1) console.log(`Warning: duplicate team name ${name} (numbering)`)

        dict[fullName] = Teams.pack(team)

        // Warn if team is illegal
        const issues = validator.validateTeam(team)
        if (issues !== null) {
            console.log(`Warning: team "${fullName}" is illegal for metronome battle:\n${issues}`)
        }
        return dict
    }, {})
}

// Function to load a file
// Handles windows newlines
function loadFile(filename) {
    try {
        return fs.readFileSync(filename).toString().replace(/\r/g, "");
    } catch {
        console.log(`Could not load file '${filename}'`)
        process.exit()
    }
}

// For some reason all the command line arg parsers I could find on NPM were way overcomplicated, so here's a simplified one
function parseArgs(usageStr) {
    const expectedArgs = usageStr.split(" ").slice(2)

    e = function() {
        console.log(`Usage:\n${usageStr}`)
        process.exit()
    }

    if (process.argv.length < 2 || process.argv.length > expectedArgs.length + 2) {
        e()
    }

    return process.argv.slice(2).reduce((l, arg) => {
        while (expectedArgs.length > 0) {
            let expectedArg = expectedArgs.shift();
            const optional = expectedArg.match(/^\[(.+?)\]$/)
            if (optional) {
                expectedArg = optional[1]
            }

            if (Number.isInteger(Number(expectedArg))) {
                const n = Number(arg)
                if (Number.isInteger(n) && n > 0) {
                    l.push(n)
                    return l
                }
            } else if (expectedArg.includes(".") && arg.includes(".")) {
                l.push(loadFile(arg))
                return l
            } else if (optional) {
                l.push(undefined)
                continue
            }
            break
        }

        e()
    }, [])
}

module.exports = {
    loadTeams: loadTeams,
    loadFile: loadFile,
    parseArgs: parseArgs,
}