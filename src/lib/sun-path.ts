function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

export interface SolarPoint {
  hour: number;      // 0–24 (decimal)
  elevation: number; // degrees above horizon (negative = below)
  azimuth: number;   // degrees clockwise from north (0–360)
}

export function computeSolarPosition(
  lat: number,
  lng: number,
  date: Date
): { elevation: number; azimuth: number } {
  const n = dayOfYear(date);
  // Solar declination — Spencer approximation
  const dec = -23.45 * Math.cos(toRad((360 / 365) * (n + 10)));

  // Local solar time from UTC + longitude correction
  const utcH = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const solarH = utcH + lng / 15;

  // Hour angle: 0 at solar noon, positive in afternoon
  const H = 15 * (solarH - 12);

  const latR = toRad(lat);
  const decR = toRad(dec);
  const haR = toRad(H);

  const sinElev = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(haR);
  const elevation = toDeg(Math.asin(Math.max(-1, Math.min(1, sinElev))));

  const elevR = toRad(elevation);
  const cosElev = Math.cos(elevR);
  let azimuth = 180; // default south
  if (cosElev > 1e-6) {
    const cosAz = (Math.sin(decR) - Math.sin(latR) * sinElev) / (Math.cos(latR) * cosElev);
    azimuth = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
    if (Math.sin(haR) > 0) azimuth = 360 - azimuth;
  }

  return { elevation, azimuth };
}

/** Returns 49 half-hour points (0h–24h) for one calendar day. */
export function getSunPathForDay(lat: number, lng: number, date: Date): SolarPoint[] {
  const y = date.getFullYear();
  const mo = date.getMonth();
  const d = date.getDate();
  const points: SolarPoint[] = [];
  for (let h = 0; h <= 24; h += 0.5) {
    const hour = Math.floor(h);
    const min = (h % 1) * 60;
    const pos = computeSolarPosition(lat, lng, new Date(Date.UTC(y, mo, d, hour, min)));
    points.push({ hour: h, elevation: Math.round(pos.elevation * 10) / 10, azimuth: Math.round(pos.azimuth * 10) / 10 });
  }
  return points;
}

/** Shadow length multiplier: how many times taller than the obstacle the shadow is. */
export function shadowMultiplier(elevationDeg: number): number | null {
  if (elevationDeg <= 0) return null;
  return Math.round((1 / Math.tan(toRad(elevationDeg))) * 10) / 10;
}
