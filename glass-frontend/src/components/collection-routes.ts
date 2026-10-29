export type RouteStop = { sequence?: number; name?: string; address?: string; latitude?: number; longitude?: number; id?: string };
export type RouteDetails = { duration?: string; distanceMeters?: number; encodedPolyline?: string | null };
export type RouteGroup = { group: number; count?: number; stops: RouteStop[]; route: RouteDetails };
export type CollectionRoutes = { count?: number; groupCount?: number; groups?: RouteGroup[]; route?: RouteDetails | null; stops?: RouteStop[]; message?: string };
export function collectionGroups(result: CollectionRoutes | null): RouteGroup[] {
 if (result?.groups?.length) return result.groups;
 return result?.route ? [{group:1, count:result.stops?.length ?? 0,stops:result.stops ?? [],route:result.route}] : [];
}
export function routeTotals(groups: RouteGroup[]) {
 const durations = groups.map(group => group.route.duration && /^\d+(?:\.\d+)?s$/.test(group.route.duration) ? Number(group.route.duration.slice(0,-1)) : null);
 return {stops:groups.reduce((sum,group)=>sum+group.stops.length,0),
  distance:groups.every(group=>typeof group.route.distanceMeters==='number') ? groups.reduce((sum,group)=>sum+group.route.distanceMeters!,0) : null,
  seconds:durations.every(value=>value!==null) ? durations.reduce((sum,value)=>sum+value!,0) : null};
}

// Desktop Maps supports nine intermediate waypoints; mobile browsers support three.
export function googleRouteLinks(stops: RouteStop[], origin: [number, number], maxWaypoints = 9): string[] {
 if (!stops.length) return [];
 const destinations = stops.map(stop => {
  if (typeof stop.latitude === 'number' && typeof stop.longitude === 'number' && Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude) && Math.abs(stop.latitude) <= 90 && Math.abs(stop.longitude) <= 180) return `${stop.latitude},${stop.longitude}`;
  return stop.address?.trim() ? `${stop.address}, Heilbronn, Germany` : null;
 });
 // Never silently omit a stop that cannot be routed.
 if (destinations.some(point => point === null)) return [];
 const depot = origin.join(',');
 const points = [depot, ...destinations as string[], depot];
 const links: string[] = [];
 const stride = Math.min(9, Math.max(0, Math.floor(maxWaypoints))) + 1;
 for (let start = 0; start < points.length - 1; start += stride) {
  const segment = points.slice(start, start + stride + 1);
  const params = new URLSearchParams({api: '1', origin: segment[0], destination: segment.at(-1)!, travelmode: 'driving'});
  if (segment.length > 2) params.set('waypoints', segment.slice(1, -1).join('|'));
  links.push(`https://www.google.com/maps/dir/?${params}`);
 }
 return links;
}
