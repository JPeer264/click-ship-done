import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

// Open-Meteo is free and needs no API key: https://open-meteo.com/en/docs
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";

// WMO weather interpretation codes, as Open-Meteo returns them in `weather_code`.
const WEATHER_CODES: Record<number, string> = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "rime fog",
  51: "light drizzle",
  53: "drizzle",
  55: "dense drizzle",
  56: "light freezing drizzle",
  57: "freezing drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "light freezing rain",
  67: "freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light rain showers",
  81: "rain showers",
  82: "violent rain showers",
  85: "light snow showers",
  86: "snow showers",
  95: "thunderstorm",
  96: "thunderstorm with light hail",
  99: "thunderstorm with heavy hail",
};

interface Place {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
}

const cityInput = z.object({
  city: z.string().describe("City name, for example 'Krakow' or 'Vienna'"),
});

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

async function findPlace(city: string): Promise<Place | undefined> {
  const url = new URL(GEOCODING_API);
  // The geocoding API only matches the place name, so "Krakow, Poland" finds nothing.
  url.searchParams.set("name", city.split(",")[0].trim());
  url.searchParams.set("count", "1");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo geocoding returned ${res.status}`);
  const data = (await res.json()) as { results?: Place[] };
  return data.results?.[0];
}

async function forecast(place: Place, params: Record<string, string>) {
  const url = new URL(FORECAST_API);
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set("timezone", "auto");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast returned ${res.status}`);
  return (await res.json()) as Record<string, Record<string, unknown>>;
}

function buildServer() {
  const server = new McpServer({ name: "weather", version: "1.0.0" });

  server.registerTool(
    "getWeather",
    {
      description: "Get the current weather for a city: temperature, feels-like temperature, humidity, wind and conditions.",
      inputSchema: cityInput,
    },
    async ({ city }) => {
      const place = await findPlace(city);
      if (!place) return error(`No place found for "${city}".`);
      const { current } = await forecast(place, {
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
      });
      return text({
        place: `${place.name}, ${place.country ?? ""}`,
        time: current.time,
        temperatureC: current.temperature_2m,
        feelsLikeC: current.apparent_temperature,
        humidityPercent: current.relative_humidity_2m,
        windKmh: current.wind_speed_10m,
        conditions: WEATHER_CODES[current.weather_code as number] ?? "unknown",
      });
    },
  );

  server.registerTool(
    "getForecast",
    {
      description: "Get the daily weather forecast for a city for the next days (1 to 7).",
      inputSchema: cityInput.extend({
        days: z.number().int().min(1).max(7).optional().describe("Number of days, 3 if not set"),
      }),
    },
    async ({ city, days }) => {
      const place = await findPlace(city);
      if (!place) return error(`No place found for "${city}".`);
      const { daily } = await forecast(place, {
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        forecast_days: String(days ?? 3),
      });
      const dates = daily.time as string[];
      return text({
        place: `${place.name}, ${place.country ?? ""}`,
        days: dates.map((date, i) => ({
          date,
          minC: (daily.temperature_2m_min as number[])[i],
          maxC: (daily.temperature_2m_max as number[])[i],
          precipitationChancePercent: (daily.precipitation_probability_max as number[])[i],
          conditions: WEATHER_CODES[(daily.weather_code as number[])[i]] ?? "unknown",
        })),
      });
    },
  );

  return server;
}

// Stateless MCP: the handler creates a new server from the factory for each request to /mcp.
export const mcpHandler = createMcpHandler(buildServer);
