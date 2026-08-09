export const TRACKS = [
  {
    name: "Eagles Canyon Raceway",
    shortName: "ECR",
    latitude: 33.3717,
    longitude: -97.4253,
    configurations: ["2.7 Mile Circuit CCW", "2.7 Mile Circuit CW", "1.65 Mile Circuit CCW"],
  },
  {
    name: "Motorsport Ranch",
    shortName: "MSR Cresson",
    latitude: 32.5326,
    longitude: -97.6178,
    configurations: ["1.7 Mile Circuit CCW", "1.7 Mile Circuit CW", "1.3 Mile Circuit", "3.1 Mile Circuit CCW"],
  },
  {
    name: "Circuit of the Americas",
    shortName: "COTA",
    latitude: 30.1329,
    longitude: -97.6411,
    configurations: ["Grand Prix Circuit"],
  },
] as const;

export function formatLap(milliseconds: number | null) {
  if (!milliseconds) return "—";
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = ((milliseconds % 60000) / 1000).toFixed(2).padStart(5, "0");
  return `${minutes}:${seconds}`;
}

export function parseLap(value: string) {
  const match = value.trim().match(/^(\d+):([0-5]?\d(?:\.\d{1,3})?)$/);
  if (!match) return null;
  return Math.round((Number(match[1]) * 60 + Number(match[2])) * 1000);
}

export function eventBusinessId(vehicleName: string, date: string, sequence = 1) {
  const code = vehicleName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return `EVT-${code}-${date.replaceAll("-", "")}-${String(sequence).padStart(2, "0")}`;
}
