import json
with open('token_list.json','r') as f:
	l = json.load(f)
alphatoks = set()

for d in l:
	lx = d['lexeme']
	if lx[:-1].isalpha():
		alphatoks.add(d['lexeme'])
for t in sorted(alphatoks):
	print(t)
