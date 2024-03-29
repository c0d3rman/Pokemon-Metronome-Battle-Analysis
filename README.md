# Pokemon-Metronome-Battle-Analysis
Simulation and analysis of Pokemon Showdown metronome battles.

## Installation

1. Clone this repo and cd inside
2. Run `npm install`
3. Run `git submodule update --init --recursive`
4. cd inside `pokemon-showdown` and run `./build` to build it (or `node build` on Windows)

## Usage

This project consists of tools meant to aid an experienced Metronome battle player in developing and testing new team concepts. The relevant files are covered here. Any file not documented here is either in development or deprecated, and should be used at your own risk.

### sim.js - battle simulation

Example usage: `node sim.js my_teams.txt`

This is the main file used to simulate battles and measure team winrates. It tests a set of challenger teams against a set of opponent teams - think of them as a group of challenger trainers each facing off against all the gym leader opponents. If no challengers are given, it instead simulates a round-robin competition between all opponent teams, with each team facing against every other team.

Options:
-	Challenger (`-c` or no flag): a text file containing a list of challenger teams in standard PokePaste format.
- Opponent (`-o`): a text file containing a list of opponent teams in standard PokePaste format. Uses `meta_teams.txt` by default (a hand-picked collection of common meta teams).
- Trials (`-t`): the number of times each pair of teams should face off. Default 100.
-	Worker (`-w`): the simulation worker file to use for running simulations. All workers live inside the workers folder. The default `basic.js` worker is what you want most of the time, but custom workers can enable additional data collection or more complex experiments (e.g. `dynaTest.js`, which enables counterfactual analysis of Dynamax).
-	Agents (`-a`): the agents that make decisions during the battle. Agents live in the agents folder. By default, both sides do nothing but choose Metronome, but different agents can mimic any action a player can take, including Dynamax, mega-evolution, and more. If one agent is given, both sides will use it; if two agents are given, the challengers will use the first agent and the opponents will use the second agent.


### set_generator.js - bulk team generation

Example usage: `node set_generator.js Regirock`

This file is used to generate team files containing all possible variations on a particular Pokémon's sets. It will create an output file containing all said variations that you can use as input to other files (namely sim.js). This file is also heavily commented to explain each item and criteria within it, and can be manually edited to remove certain options in order to cut down on the number of sets generated.

Options:
-	Species (`-s` or no flag): the species of Pokémon to generate teams for.
-	Filename (`-f`): the name of the output file to generate. Default `generated_teams.txt`.

### refined_sets_generator.js - team recovery from simulation results

Example usage: `node refined_sets_generator.js my_sim_results.txt decoded_teams.txt`

This is a helper file to be used alongside `set_generator.js`. The common set generation workflow is to generate a large number of teams for a Pokémon, run a low-trial simulation run on them to weed out bad sets, and then take the top few dozen and run a high-trial simulation on them. This file accepts as input the copy-pasted lines from the rankings produced at the end of a `sim.js` run, and parses the standard team names generated by `set_generator.js` in order to reconstruct the teams. For example, you could copy the following lines from a `sim.js` run:
````
   #1	| 72.2 | Regirock, Intimidate, Lum Berry, Adamant, min-speed + Regirock, Intimidate, Lum Berry, Adamant, min-speed
   #2	| 66.7 | Regirock, Fluffy, Weakness Policy, Sassy, min-speed + Regirock, Fluffy, Weakness Policy, Sassy, min-speed
   #3	| 61.1 | Regirock, As One(Glastrier), Weakness Policy, Relaxed, min-speed + Regirock, As One(Glastrier), Weakness Policy, Relaxed, min-speed
   #4	| 61.1 | Regirock, Compound Eyes, Weakness Policy, Brave, min-speed + Regirock, Compound Eyes, Weakness Policy, Brave, min-speed
````
If no input file is given, this file will read from `STDIN`.

### analysis.js - classical analysis

Example usage: `node analysis.js`

This file takes no input, and returns the colorized and formatted results of classical analysis. It ranks Pokémon by various traits to establish their defensive and offensive potential, measures the power of different types, and a whole lot more. Each section of output explains what analysis it is performing. This file is designed to be continually expanded or edited by the user.

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
