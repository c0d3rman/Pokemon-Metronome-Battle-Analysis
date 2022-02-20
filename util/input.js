const fs = require('fs');
const {Teams, TeamValidator, toID, Dex} = require('../pokemon-showdown');


// Duplicated and modified from https://github.com/smogon/pokemon-showdown-client/blob/master/js/storage.js
const BattleStatIDs = {
    HP: 'hp',
    hp: 'hp',
    Atk: 'atk',
    atk: 'atk',
    Def: 'def',
    def: 'def',
    SpA: 'spa',
    SAtk: 'spa',
    SpAtk: 'spa',
    spa: 'spa',
    spc: 'spa',
    Spc: 'spa',
    SpD: 'spd',
    SDef: 'spd',
    SpDef: 'spd',
    spd: 'spd',
    Spe: 'spe',
    Spd: 'spe',
    spe: 'spe'
};
let importTeam = function(str) {
    var text = str.split("\n");
    var team = null;
    var curSet = null;
    var teams = [];

    for (var i = 0; i < text.length; i++) {
        var line = text[i].trim();
        if (line === '' || line === '---') {
            curSet = null;
        } else if (line.substr(0, 3) === '===' && teams) {
            team = [];
            line = line.substr(3, line.length - 6).trim();
            var format = 'gen8';
            var capacity = 6;
            var bracketIndex = line.indexOf(']');
            if (bracketIndex >= 0) {
                format = line.substr(1, bracketIndex - 1);
                if (format && format.slice(0, 3) !== 'gen') format = 'gen6' + format;
                if (format && format.endsWith('-box')) {
                    format = format.slice(0, -4);
                    capacity = 24;
                }
                line = line.substr(bracketIndex + 1).trim();
            }
            if (teams.length && typeof teams[teams.length - 1].team !== 'string') {
                teams[teams.length - 1].team = Teams.pack(teams[teams.length - 1].team)
            }
            var slashIndex = line.lastIndexOf('/');
            var folder = '';
            if (slashIndex > 0) {
                folder = line.slice(0, slashIndex);
                line = line.slice(slashIndex + 1);
            }
            teams.push({
                name: line,
                format: format,
                team: team,
                capacity: capacity,
                folder: folder,
                iconCache: ''
            });
        } else if (!curSet) {
            curSet = {name: '', species: '', gender: ''};
            team.push(curSet);
            var atIndex = line.lastIndexOf(' @ ');
            if (atIndex !== -1) {
                curSet.item = line.substr(atIndex + 3);
                if (toID(curSet.item) === 'noitem') curSet.item = '';
                line = line.substr(0, atIndex);
            }
            if (line.substr(line.length - 4) === ' (M)') {
                curSet.gender = 'M';
                line = line.substr(0, line.length - 4);
            }
            if (line.substr(line.length - 4) === ' (F)') {
                curSet.gender = 'F';
                line = line.substr(0, line.length - 4);
            }
            var parenIndex = line.lastIndexOf(' (');
            if (line.substr(line.length - 1) === ')' && parenIndex !== -1) {
                line = line.substr(0, line.length - 1);
                curSet.species = Dex.species.get(line.substr(parenIndex + 2)).name;
                line = line.substr(0, parenIndex);
                curSet.name = line;
            } else {
                curSet.species = Dex.species.get(line).name;
                curSet.name = '';
            }
        } else if (line.substr(0, 7) === 'Trait: ') {
            line = line.substr(7);
            curSet.ability = line;
        } else if (line.substr(0, 9) === 'Ability: ') {
            line = line.substr(9);
            curSet.ability = line;
        } else if (line === 'Shiny: Yes') {
            curSet.shiny = true;
        } else if (line.substr(0, 7) === 'Level: ') {
            line = line.substr(7);
            curSet.level = +line;
        } else if (line.substr(0, 11) === 'Happiness: ') {
            line = line.substr(11);
            curSet.happiness = +line;
        } else if (line.substr(0, 10) === 'Pokeball: ') {
            line = line.substr(10);
            curSet.pokeball = line;
        } else if (line.substr(0, 14) === 'Hidden Power: ') {
            line = line.substr(14);
            curSet.hpType = line;
        } else if (line === 'Gigantamax: Yes') {
            curSet.gigantamax = true;
        } else if (line.substr(0, 5) === 'EVs: ') {
            line = line.substr(5);
            var evLines = line.split('/');
            curSet.evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
            for (var j = 0; j < evLines.length; j++) {
                var evLine = evLines[j].trim();
                var spaceIndex = evLine.indexOf(' ');
                if (spaceIndex === -1) continue;
                var statid = BattleStatIDs[evLine.substr(spaceIndex + 1)];
                var statval = parseInt(evLine.substr(0, spaceIndex), 10);
                if (!statid) continue;
                curSet.evs[statid] = statval;
            }
        } else if (line.substr(0, 5) === 'IVs: ') {
            line = line.substr(5);
            var ivLines = line.split(' / ');
            curSet.ivs = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
            for (var j = 0; j < ivLines.length; j++) {
                var ivLine = ivLines[j];
                var spaceIndex = ivLine.indexOf(' ');
                if (spaceIndex === -1) continue;
                var statid = BattleStatIDs[ivLine.substr(spaceIndex + 1)];
                var statval = parseInt(ivLine.substr(0, spaceIndex), 10);
                if (!statid) continue;
                if (isNaN(statval)) statval = 31;
                curSet.ivs[statid] = statval;
            }
        } else if (line.match(/^[A-Za-z]+ (N|n)ature/)) {
            var natureIndex = line.indexOf(' Nature');
            if (natureIndex === -1) natureIndex = line.indexOf(' nature');
            if (natureIndex === -1) continue;
            line = line.substr(0, natureIndex);
            if (line !== 'undefined') curSet.nature = line;
        } else if (line.substr(0, 1) === '-' || line.substr(0, 1) === '~') {
            line = line.substr(1);
            if (line.substr(0, 1) === ' ') line = line.substr(1);
            if (!curSet.moves) curSet.moves = [];
            if (line.substr(0, 14) === 'Hidden Power [') {
                var hptype = line.substr(14, line.length - 15);
                line = 'Hidden Power ' + hptype;
                var type = Dex.types.get(hptype);
                if (!curSet.ivs && type) {
                    curSet.ivs = {};
                    for (var stat in type.HPivs) {
                        curSet.ivs[stat] = type.HPivs[stat];
                    }
                }
            }
            if (line === 'Frustration' && curSet.happiness === undefined) {
                curSet.happiness = 0;
            }
            curSet.moves.push(line);
        }
    }
    if (teams && teams.length && typeof teams[teams.length - 1].team !== 'string') {
        teams[teams.length - 1].team = Teams.pack(teams[teams.length - 1].team)
    }
    return teams;
};


// Function to load Showdown-format teams from a provided string (presumably loaded from a file)
const validator = new TeamValidator('gen8metronomebattle');
function loadTeams(str) {
    return importTeam(str)
        .reduce((dict, team) => {
            // Handle duplicate team names
            fullName = team.name
            i = 1
            while (fullName in dict) {
                i++
                fullName = `${team.name} [${i}]`
            }
            if (i == 2) console.log(`Warning: duplicate team name "${team.name}" (numbering)`)

            dict[fullName] = team.team

            // Warn if team is illegal
            const issues = validator.validateTeam(Teams.unpack(team.team))
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