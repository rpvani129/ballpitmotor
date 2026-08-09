type Weather = {
  temperature_f: number | null;
  conditions: string | null;
  precipitation_in: number | null;
  wind_speed_mph: number | null;
  humidity_pct: number | null;
  track_condition: "Dry" | "Wet";
};

const weatherCodes: Record<number, string> = {
  0: "Clear",
  1: "Mostly Sunny",
  2: "Partly Cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Heavy Rain",
  80: "Rain Showers",
  81: "Rain Showers",
  82: "Heavy Rain Showers",
  95: "Thunderstorms",
  96: "Thunderstorms",
  99: "Thunderstorms",
};

export async function getEventWeather(
  date: string,
  latitude: number,
  longitude: number,
): Promise<Weather | null> {
  const ageDays = (Date.now() - new Date(`${date}T12:00:00Z`).getTime()) / 86400000;
  const base = ageDays > 5
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: date,
    end_date: date,
    daily: "weather_code,temperature_2m_mean,precipitation_sum,wind_speed_10m_max",
    hourly: "relative_humidity_2m",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "America/Chicago",
  });

  try {
    const response = await fetch(`${base}?${params}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    const humidity = Array.isArray(data.hourly?.relative_humidity_2m)
      ? data.hourly.relative_humidity_2m.filter((value: unknown) => typeof value === "number")
      : [];
    const precipitation = data.daily?.precipitation_sum?.[0] ?? 0;
    const code = data.daily?.weather_code?.[0] ?? 0;
    return {
      temperature_f: data.daily?.temperature_2m_mean?.[0] ?? null,
      conditions: weatherCodes[code] ?? "Mixed Conditions",
      precipitation_in: precipitation,
      wind_speed_mph: data.daily?.wind_speed_10m_max?.[0] ?? null,
      humidity_pct: humidity.length
        ? humidity.reduce((sum: number, value: number) => sum + value, 0) / humidity.length
        : null,
      track_condition: precipitation > 0 ? "Wet" : "Dry",
    };
  } catch {
    return null;
  }
}
