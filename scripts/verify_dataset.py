import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\Admin\.gemini\antigravity\scratch\damminhduc87-cell-s-Org\initiativeQcData.ts', encoding='utf-8') as f:
    content = f.read()

# Count results
res_matches = re.findall(r"id:\s*'([^']+)'", content)
gd1_ids = [x for x in res_matches if x.startswith('gd1-')]
gd2_ids = [x for x in res_matches if x.startswith('gd2-')]
capa_ids = [x for x in res_matches if x.startswith('capa-')]

print('GD1 QC results count:', len(gd1_ids))
print('GD2 QC results count:', len(gd2_ids))
print('Total initiative QC results:', len(gd1_ids) + len(gd2_ids))
print('Total CAPA records:', len(capa_ids))

# Check days in GD1
gd1_days = set([x.split('-')[-1] for x in gd1_ids])
gd2_days = set([x.split('-')[-1] for x in gd2_ids])
print('GD1 distinct days:', len(gd1_days))
print('GD2 distinct days:', len(gd2_days))

# Check violation days in GD1 and GD2
gd1_v_days = set()
gd2_v_days = set()

for line in content.split('\n'):
    if "westgardStatus: 'violation'" in line:
        m = re.search(r"id:\s*'(gd[12]-[a-z]+-[a-z]-(\d+))'", line)
        if m:
            p = m.group(1)
            stt = m.group(2)
            if p.startswith('gd1'):
                gd1_v_days.add(stt)
            else:
                gd2_v_days.add(stt)

print(f'GD1 violation days: {len(gd1_v_days)} / {len(gd1_days)} ({len(gd1_v_days)/len(gd1_days)*100:.1f}%)')
print(f'GD2 violation days: {len(gd2_v_days)} / {len(gd2_days)} ({len(gd2_v_days)/len(gd2_days)*100:.1f}%)')
