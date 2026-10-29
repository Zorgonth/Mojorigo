// Approximate postcode reference points: mean of stored container coordinates
// within each postcode (including cached OSM postcode assignments). Not a street address.
export const postcodeCentres: Record<string, [number, number]> = {
  "74072": [
    49.14061,
    9.217023
  ],
  "74074": [
    49.132193,
    9.228111
  ],
  "74076": [
    49.15072,
    9.228111
  ],
  "74078": [
    49.174805,
    9.152581
  ],
  "74080": [
    49.140551,
    9.182943
  ],
  "74081": [
    49.118998,
    9.188888
  ]
};
export function distanceMetres(from: [number, number], to: [number, number]): number {
 const rad = (degrees: number) => degrees * Math.PI / 180;
 const deltaLat = rad(to[0] - from[0]), deltaLng = rad(to[1] - from[1]);
 const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(rad(from[0])) * Math.cos(rad(to[0])) * Math.sin(deltaLng / 2) ** 2;
 return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function rankByDistance<T extends { id: string; latitude: number; longitude: number }>(bins: T[], origin: [number, number]): (T & { distanceMetres: number })[] {
 return bins.map(bin => ({...bin, distanceMetres: distanceMetres(origin, [bin.latitude, bin.longitude])}))
  .sort((a, b) => a.distanceMetres - b.distanceMetres || a.id.localeCompare(b.id));
}
