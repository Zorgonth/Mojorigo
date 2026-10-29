// Google's encoded polyline format stores latitude/longitude deltas at 1e5 precision.
export function decodeRoutePolyline(encoded: string): [number, number][] {
 const points: [number, number][] = [];
 let index = 0, latitude = 0, longitude = 0;
 function delta(): number {
  let result = 0, shift = 0, byte: number;
  do {
   if (index >= encoded.length || shift > 30) throw new Error('Invalid polyline');
   byte = encoded.charCodeAt(index++) - 63;
   if (byte < 0 || byte > 63) throw new Error('Invalid polyline');
   result |= (byte & 31) << shift;
   shift += 5;
  } while (byte >= 32);
  return result & 1 ? ~(result >> 1) : result >> 1;
 }
 try {
  while (index < encoded.length) {
   latitude += delta(); longitude += delta();
   if (Math.abs(latitude) > 9000000 || Math.abs(longitude) > 18000000) return [];
   points.push([latitude / 1e5, longitude / 1e5]);
  }
  return points;
 } catch { return []; }
}
