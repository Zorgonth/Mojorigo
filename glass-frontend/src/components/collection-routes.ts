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
