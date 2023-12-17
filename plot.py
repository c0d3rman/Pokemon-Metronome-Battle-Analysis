import matplotlib.pyplot as plt
import re
import numpy as np

typeColors = {
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
    "Bird": "#7A9F90",
    "Physical": "#BA3423",
    "Special": "#51586E"
}

lines = """#1    Normal   3653  81.3  80.7
#2    Fire     2370  28.6  26.1
#3    Water    1903  36.0  35.3
#4    Fighting 1853  88.5  89.0
#5    Grass    1832  56.5  56.6
#6    Electric 1517  47.6  53.2
#7    Psychic  1392  17.6  16.3
#8    Dragon   1283  46.7  42.2
#9    Flying   1246  64.7  66.3
#10   Bug      1127  75.0  77.8
#11   Dark     1111  87.5  85.5
#12   Ice      1022  46.7  47.5
#13   Ground   993   71.4  76.6
#14   Steel    972   83.3  77.4
#15   Rock     939   76.9  73.6
#16   Poison   917   40.0  39.4
#17   Ghost    849   83.3  82.9
#18   Fairy    486   14.3  16.7""".split("\n")

types = [re.compile(r"\s+").split(line)[1] for line in lines]
powers = [int(re.compile(r"\s+").split(line)[2]) for line in lines]
colors = [typeColors[t] for t in types]
x_pos = np.arange(len(types))

plt.bar(x_pos, powers, color=colors)
plt.xticks(x_pos, types)
plt.show()