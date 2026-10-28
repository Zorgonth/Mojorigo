# Container address lookups

Cached one-time reverse geocoding of the coordinates in `../bins.csv` using
Nominatim. Source: © OpenStreetMap contributors, licensed under ODbL 1.0:
https://www.openstreetmap.org/copyright

Requests run sequentially on one machine, at most once per 1.1 seconds.
Existing responses are reused; this is not a live geocoding integration.
Usage policy: https://operations.osmfoundation.org/policies/nominatim/

`../bin-address-audit.json` records matched OSM objects, distance from the
original coordinate and the match classification. A nearby street label is
not an independently verified container street address. Neighbouring house
numbers are deliberately omitted. The original bin/sensor IDs and coordinates
are preserved. Matches farther than 150 metres are left unresolved.

Run `python3 backend/scripts/enrich-bin-addresses.py` deliberately to fill missing
cache entries, then `python3 backend/scripts/apply-bin-addresses.py` to apply them.
