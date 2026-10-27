# Mojorigo backend

Node.js API for glass bottle bin sensors: fill level, temperature, humidity, and city emptying / usage maps.

Mock data lives in `data/` as CSV. The server loads it into memory on boot so you can build the app without a database yet.

## Run

```bash
cd backend
cp .env.example .env
npm install
npm run generate:mock
npm run dev
```

Health check: [http://localhost:3001/health](http://localhost:3001/health)

## Mock data (Heilbronn only)

All locations are in **Heilbronn**. There are **10 bins**, each with one sensor. Recreate the CSVs with `npm run generate:mock`.

| File | What it is |
| --- | --- |
| `data/glass_types.csv` | The 3 glass streams: white, brown, blue |
| `data/areas.csv` | Heilbronn districts used on the map |
| `data/bins.csv` | The 10 bins **right now**: fill %, temp, humidity, type, lat/lng |
| `data/sensor_readings.csv` | History: one reading every 6 hours, 13–27 Oct 2026 |
| `data/collections.csv` | When the city emptied a bin (fill had hit ~92%+) |

### What each column means

**`bins.csv` — one row = one physical Altglas container**

- `id` / `sensor_id` — bin and the sensor sitting in it (`BIN-001` ↔ `SEN-001`)
- `glass_type` — `white` (Weißglas), `brown` (Braunglas), `blue` (Blauglas)
- `area_id` / `area_name` / `city` — district inside Heilbronn (`city` is always Heilbronn)
- `lat` / `lng` — map pin
- `fill_percent` — how full the sensor says it is (0–100). This is the main number the city uses to decide emptying
- `temperature_c` / `humidity_percent` — extra sensor environment readings
- `last_reading_at` — timestamp of those current values

**`sensor_readings.csv` — one row = one snapshot from a sensor**

Same fill / temp / humidity, but over time so charts and “which areas fill fastest” work.

**`collections.csv` — one row = one emptying**

Generated when fill would have gone over ~92%: the bin is collected and fill drops back to a low value. More collections = heavier use.

Emptying rules sent to the frontend:

- **70%+** → urgent (`needs_emptying`)
- **90%+** → `critical`
- **not emptied in 30 days** → threshold drops to **50%** (`overdue`)

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/api/bins` | All bins. Query: `glassType`, `areaId`, `status` |
| GET | `/api/bins/glass-types` | White / brown / blue |
| GET | `/api/bins/areas` | City areas |
| GET | `/api/bins/:binId` | One bin, current sensor values |
| GET | `/api/bins/:binId/readings` | History. Query: `from`, `to`, `limit` |
| POST | `/api/bins/:binId/collect` | City emptied this bin |
| POST | `/api/sensors/ingest` | Parsed mock ingest (`fillPercent`, `temperatureC`, `humidityPercent`) |
| POST | `/api/sensors/receive` | Hardware endpoint — **does not parse yet**, returns mock CSV state |
| GET | `/api/alerts` | Bins that need emptying, with per-bin threshold (70% or 50%) and reason |
| GET | `/api/routes/collection` | Optimal pickup route via Google Directions (`originLat`, `originLng` optional) |
| GET | `/api/analytics/dashboard` | Totals, alerts, busiest areas, glass-type usage |
| GET | `/api/analytics/map` | Lat/lng + fill for the map |
| GET | `/api/analytics/areas` | Which areas are used most |
| GET | `/api/analytics/glass-types` | Usage by white / brown / blue |

Fill statuses: `empty`, `low`, `medium`, `overdue`, `needs_emptying`, `critical`.

Set `GOOGLE_MAPS_API_KEY` in `.env` (enable **Directions API**). Without a key, `/api/routes/collection` still returns a nearest-neighbor stop order plus a Google Maps URL. Pass `fallback=false` to fail instead.

## Next pieces (not built yet)

- Persist readings in Postgres instead of memory
- Auth for city staff vs public map
- Push / email when a bin hits the emptying threshold
- Real sensor protocol (MQTT / LoRaWAN) in front of `POST /api/sensors/ingest`
