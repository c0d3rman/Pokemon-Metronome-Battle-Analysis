from tqdm import tqdm
import random
import matplotlib.pyplot as plt

metatrials = 100
trials = 10000
flipsPerTrial = 100

pairs = []

# for trueP in [x/10 for x in range(1, 10)]:
for _ in tqdm(range(metatrials)):
	trueP = random.random()
	successes = 0
	# percentErrors = []
	# errors = []
	for _ in range(trials):
		# trueP = random.random()
		heads = 0
		for _ in range(flipsPerTrial):
			if random.random() < trueP:
				heads += 1
		estimatedP = heads / flipsPerTrial
		# percentError = abs(estimatedP / trueP - 1)
		# percentErrors.append(percentError)
		error = abs(estimatedP - trueP)
		# errorPercentagePoints.append()
		if error < 0.05:
			successes += 1

	# print(trueP, ": ", successes / trials)
	pairs.append((trueP, successes / trials))

# plt.hist(percentErrors)
# plt.plot(pairs)
plt.scatter([a[0] for a in pairs], [a[1] for a in pairs])
plt.show()

# // p(estimate within 5% | got 55 heads of 100)
# // p(e | nH) = p(nH | e) * p(e) / p(nH)