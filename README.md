# Pokemon-Metronome-Battle-Analysis
Simulation and analysis of Pokemon Showdown metronome battles.

## Installation

1. Clone this repo and cd inside
2. Run `npm install`
3. Run `git submodule update --init --recursive`
4. cd inside `pokemon-showdown` and run `./build` to build it (or `node build` on Windows)

## Usage

_TBD_

Most runnable files print a usage example when run with no parameters.


## How to get data files

To run the various scripts in this repository, you may need to use some data files. Here's instructions on how to get them.

### Showdown teams

To export a collection of teams from Pokemon Showdown, follow these steps:
1. Go to the teambuilder.
2. Choose the folder you want to export.
3. Scroll all the way down and click on "Backup all teams from this folder".
4. Copy the resulting text and save it as a text file. (Make sure this is pure text, not a Word doc or TextEdit rich text file.)

This will guarantee the teams will be in the correct format. You can edit these files manually or build them from scratch, but make sure to preserve the Showdown team format. As a rule, if Showdown can import it correctly, so can this repo.

### Usage statistics

Smogon makes public usage statistics for various game formats, which this repository uses to generate likely teams you might encounter in the real meta. These files are available on https://www.smogon.com/stats/. In particular, you'll want to download the "chaos" files, which contain all information in a structured format. An example of such a file is:

https://www.smogon.com/stats/2022-01/chaos/gen8metronomebattle-0.json

You can substitute the "2022-01" for any other chosen date, or the "-0" for a different chosen ELO level.
