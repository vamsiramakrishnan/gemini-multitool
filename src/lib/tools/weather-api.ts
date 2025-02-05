/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY as string;
if (typeof OPENWEATHER_API_KEY !== "string") {
  throw new Error("set REACT_APP_OPENWEATHER_API_KEY in .env");
}

// Map OpenWeather conditions to our simplified conditions
const conditionMap: { [key: string]: string } = {
  'Clear': 'clear',
  'Clouds': 'cloudy',
  'Rain': 'rain',
  'Drizzle': 'rain',
  'Thunderstorm': 'storm',
  'Snow': 'snow',
  'Mist': 'cloudy',
  'Smoke': 'cloudy',
  'Haze': 'cloudy',
  'Dust': 'cloudy',
  'Fog': 'cloudy',
  'Sand': 'cloudy',
  'Ash': 'cloudy',
  'Squall': 'storm',
  'Tornado': 'storm'
};

interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  city: string;
  country: string;
  feelsLike: number;
  pressure: number;
  sunrise: string;
  sunset: string;
}

export async function getWeather(city: string): Promise<WeatherData | { error: string }> {
  try {
    // First get coordinates for the city
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_API_KEY}`;
    console.log('Fetching geo data from:', geoUrl);
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) {
      throw new Error(`Geo API failed with status: ${geoResponse.status}`);
    }
    const geoData = await geoResponse.json();

    if (!geoData.length) {
      return {
        error: `Could not find location: ${city}`
      };
    }

    const { lat, lon } = geoData[0];

    // Then get weather data
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    console.log('Fetching weather data from:', weatherUrl);
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error(`Weather API failed with status: ${weatherResponse.status}`);
    }
    const weatherData = await weatherResponse.json();

    // Map the OpenWeather condition to our simplified condition
    const mainCondition = weatherData.weather[0].main;
    const condition = conditionMap[mainCondition] || 'cloudy';

    return {
      temperature: weatherData.main.temp,
      condition: condition,
      description: weatherData.weather[0].description,
      humidity: weatherData.main.humidity,
      windSpeed: Math.round(weatherData.wind.speed * 3.6), // Convert m/s to km/h
      city: weatherData.name,
      country: weatherData.sys.country,
      feelsLike: weatherData.main.feels_like,
      pressure: weatherData.main.pressure,
      sunrise: new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      sunset: new Date(weatherData.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      type: error.name
    });
    return {
      error: `Error fetching weather for ${city}: ${error.message}`
    };
  }
} 