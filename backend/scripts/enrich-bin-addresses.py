"""One-time coordinate lookup. Cached, single-threaded, <=1 request/second.
Source: OpenStreetMap contributors (ODbL), https://www.openstreetmap.org/copyright
Policy: https://operations.osmfoundation.org/policies/nominatim/
Only run deliberately for this dataset, never as a live application service.
"""
import csv
import json
import math
from pathlib import Path
import subprocess
import time

root = Path(__file__).resolve().parents[1]
cache_dir = root / 'data/geocoding'
cache_dir.mkdir(exist_ok=True)
with (root / 'data/bins.csv').open() as f:
    rows = list(csv.DictReader(f))
for i, row in enumerate(rows):
    cache = cache_dir / f'{row["lat"]}_{row["lng"]}.json'
    if not cache.exists():
        rounded = (round(float(row['lat']), 6), round(float(row['lng']), 6))
        for existing in (root / 'data/geocoding').glob('*.json'):
            if tuple(round(float(v), 6) for v in existing.stem.split('_')) == rounded:
                cache = existing
                break
    if not cache.exists():
        url = f'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={row["lat"]}&lon={row["lng"]}&zoom=18&addressdetails=1'
        result = subprocess.run(['curl', '-f', '-sS', '--max-time', '25', '-A', 'Mojorigo-address-audit/1.0 (one-time local dataset enrichment)', url], capture_output=True, text=True)
        if result.returncode:
            print(f'{row["id"]}: lookup failed: {result.stderr}', flush=True)
            time.sleep(1.1)
            continue
        data = json.loads(result.stdout)
        cache.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        time.sleep(1.1)
    if (i + 1) % 10 == 0:
        print(f'Looked up {i + 1}/{len(rows)} coordinates', flush=True)
print('Lookup complete; cached results ready for review.', flush=True)
