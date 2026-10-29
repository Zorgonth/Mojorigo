"""Apply cached OSM street labels conservatively; retain IDs and coordinates."""
import csv
import json
import math
from pathlib import Path
root = Path(__file__).resolve().parents[1]
path = root / 'data/bins.csv'
with path.open() as f:
    reader = csv.DictReader(f)
    headers = list(reader.fieldnames)
    rows = list(reader)
for column in ['postcode', 'address_source', 'address_match']:
    if column not in headers:
        headers.append(column)
features = json.loads((root / 'src/data/heilbronn-glass-bins.geojson').read_text())['features']
names = {f'{f["geometry"]["coordinates"][1]:.6f},{f["geometry"]["coordinates"][0]:.6f}': f['properties']['name'] for f in features if f.get('properties', {}).get('name')}
audit = []
for row in rows:
    cache = root / 'data/geocoding' / f'{row["lat"]}_{row["lng"]}.json'
    if not cache.exists():
        rounded = (round(float(row['lat']), 6), round(float(row['lng']), 6))
        for existing in (root / 'data/geocoding').glob('*.json'):
            if tuple(round(float(v), 6) for v in existing.stem.split('_')) == rounded:
                cache = existing
                break
    result = json.loads(cache.read_text()) if cache.exists() else {}
    address = result.get('address', {})
    street = address.get('road') or address.get('pedestrian') or address.get('residential') or address.get('footway') or address.get('path')
    locality_only = not street and bool(address.get('locality'))
    street = street or address.get('locality')
    lat, lng = float(row['lat']), float(row['lng'])
    distance = None
    if result.get('lat') and result.get('lon'):
        a, b = math.radians(lat), math.radians(float(result['lat']))
        delta_lat = b - a
        delta_lon = math.radians(float(result['lon']) - lng)
        distance = 6371000 * 2 * math.asin(min(1, math.sqrt(math.sin(delta_lat/2)**2 + math.cos(a)*math.cos(b)*math.sin(delta_lon/2)**2)))
    matched = result.get('category') == 'amenity' and result.get('type') == 'recycling' and distance is not None and distance <= 25
    label = names.get(f'{lat:.6f},{lng:.6f}') or (result.get('name') if matched else None)
    # A distant reverse match cannot substantiate the container's street.
    usable = street and address.get('country_code') == 'de' and distance is not None and distance <= 150
    if usable:
        row['address'] = street if matched else f'Near {street}'
        row['arena_name'] = label or row['address']
        row['postcode'] = address.get('postcode', '')
        row['address_source'] = 'OpenStreetMap / Nominatim'
        row['address_match'] = 'mapped_recycling_location' if matched else 'nearby_locality' if locality_only else 'nearby_street'
        row['city'] = address.get('city') or address.get('town') or address.get('village') or row['city']
    elif label:
        row['arena_name'] = label
    audit.append({'id':row['id'], 'latitude':lat, 'longitude':lng, 'street':street,
        'label':row.get('arena_name'), 'match':row.get('address_match') or 'unresolved',
        'matched_object_distance_m':round(distance,1) if distance is not None else None,
        'city':row['city'], 'outside_heilbronn_city': row['city'] != 'Heilbronn', 'osm_type':result.get('osm_type'), 'osm_id':result.get('osm_id'), 'postcode':row.get('postcode','')})
with path.open('w', newline='') as f:
    writer=csv.DictWriter(f,fieldnames=headers,lineterminator='\n')
    writer.writeheader();writer.writerows(rows)
(root / 'data/bin-address-audit.json').write_text(json.dumps({'source':'OpenStreetMap contributors, ODbL 1.0', 'attribution':'https://www.openstreetmap.org/copyright', 'note':'Reverse lookup identifies a nearby object, not a guaranteed container address. House numbers deliberately omitted. Original coordinates unchanged.', 'locations':audit},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'total':len(rows),'labelled':sum(bool(r.get('address')) for r in rows),'postcodes':sum(bool(r.get('postcode')) for r in rows),'unresolved':[a['id'] for a in audit if a['match']=='unresolved']}))
