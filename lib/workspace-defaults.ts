export const DEFAULT_TRACKS = [
  {
    name: "Circuit of the Americas", short_name: "COTA", address: "9201 Circuit of the Americas Blvd.", city: "Austin", region: "TX", postal_code: "78617", country: "USA", latitude: 30.1329, longitude: -97.6411, timezone: "America/Chicago", website_url: null, notes: "Austin-Bergstrom International Airport (KAUS — METAR/ASOS)", is_active: true,
    configurations: [{ name: "Grand Prix Circuit", direction: "CCW", distance_miles: 3.4, is_active: true }],
  },
  {
    name: "Eagles Canyon Raceway", short_name: "ECR", address: "7629 North FM 51", city: "Decatur", region: "TX", postal_code: "76234", country: "USA", latitude: 33.3717, longitude: -97.4253, timezone: "America/Chicago", website_url: null, notes: "Decatur Municipal Airport (KLUD — METAR/AWOS)", is_active: true,
    configurations: [
      { name: "1.65 Mile Circuit CCW", direction: null, distance_miles: null, is_active: true },
      { name: "1.65 Mile Circuit CW", direction: "CW", distance_miles: 1.65, is_active: true },
      { name: "2.7 Mile Circuit CCW", direction: null, distance_miles: null, is_active: true },
      { name: "2.7 Mile Circuit CW", direction: "CW", distance_miles: 2.7, is_active: true },
    ],
  },
  {
    name: "Eagles Canyon Raceway - Short Track", short_name: null, address: "7629 North FM 51", city: "Decatur", region: "TX", postal_code: "76234", country: "USA", latitude: null, longitude: null, timezone: "America/Chicago", website_url: null, notes: "Decatur Municipal Airport (KLUD — METAR/AWOS)", is_active: true,
    configurations: [
      { name: "1.65 Mile Circuit CCW", direction: null, distance_miles: null, is_active: true },
      { name: "1.65 Mile Circuit CW", direction: "CW", distance_miles: 1.65, is_active: true },
    ],
  },
  {
    name: "G2 MOTORSPORT PARK", short_name: null, address: "1001 County Road 526", city: "Anna", region: "TX", postal_code: "75409", country: "USA", latitude: null, longitude: null, timezone: "America/Chicago", website_url: null, notes: "McKinney National Airport (KTKI — METAR/ASOS)", is_active: true,
    configurations: [{ name: "3.1 Mile Circuit CCW", direction: "CCW", distance_miles: 3.1, is_active: true }],
  },
  {
    name: "Hallett Motor Racing Circuit", short_name: null, address: "59901 E. 5500 Road", city: "Jennings", region: "OK", postal_code: "74038", country: "USA", latitude: null, longitude: null, timezone: "America/Chicago", website_url: null, notes: "Cushing Municipal Airport (KCUH — METAR/AWOS)", is_active: true,
    configurations: [{ name: "1.8 Mile Circuit CCW", direction: null, distance_miles: null, is_active: true }],
  },
  {
    name: "Motorsport Ranch", short_name: "MSR Cresson", address: "9012 Performance Court", city: "Cresson", region: "TX", postal_code: "76035", country: "USA", latitude: 32.5326, longitude: -97.6178, timezone: "America/Chicago", website_url: null, notes: "Granbury Regional Airport (KGDJ — METAR/AWOS)", is_active: true,
    configurations: [
      { name: "1.3 Mile Circuit CCW", direction: "CCW", distance_miles: 1.3, is_active: true },
      { name: "1.3 Mle Circuit CW", direction: "CW", distance_miles: 1.3, is_active: true },
      { name: "1.7 Mile Circuit CCW", direction: "CCW", distance_miles: 1.7, is_active: true },
      { name: "1.7 Mile Circuit CW", direction: "CW", distance_miles: 1.7, is_active: true },
      { name: "2.7 Mile Circuit CCW", direction: "CCW", distance_miles: 2.7, is_active: true },
      { name: "3.1 Mile Circuit CCW", direction: "CCW", distance_miles: 3.1, is_active: true },
    ],
  },
] as const;

export const DEFAULT_CHECKLIST_ITEMS = [
  "Wheel torque and tire pressures checked",
  "Brake pads, rotors and fluid checked",
  "Fluids topped off and no leaks found",
  "Battery, cameras and data system secured",
  "Helmet, HANS, belts and safety gear packed",
  "Tech sheet completed",
] as const;
