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

import { withFallback, createWeatherFallbackProvider } from '../utils/api-fallbacks';

// Create a single instance of the fallback provider
const weatherFallbackProvider = createWeatherFallbackProvider();

// Check if API key is available
const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY as string;
let apiKeyError = false;
if (typeof OPENWEATHER_API_KEY !== "string" || !OPENWEATHER_API_KEY) {
  apiKeyError = true;
  console.warn("REACT_APP_OPENWEATHER_API_KEY not set in .env, weather API will use mock data");
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

// Export the interface so it can be imported elsewhere
export interface WeatherData {
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

/**
 * Core implementation of weather API calls without fallback handling
 */
async function _getWeather(city: string): Promise<WeatherData> {
  // Throw error if API key is not set
  if (apiKeyError) {
    throw new Error('OpenWeather API key not configured');
  }

  // First get coordinates for the city
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_API_KEY}`;
  console.log('Fetching geo data from:', geoUrl);
  const geoResponse = await fetch(geoUrl);
  if (!geoResponse.ok) {
    throw new Error(`Geo API failed with status: ${geoResponse.status}`);
  }
  const geoData = await geoResponse.json();

  if (!geoData.length) {
    throw new Error(`Could not find location: ${city}`);
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

  // Get timezone offset in seconds from UTC
  const timezoneOffsetSeconds = weatherData.timezone;
  
  // Format sunrise and sunset times using the city's timezone
  const formatTimeInCityTimezone = (timestamp: number) => {
    // Create a date in UTC
    const date = new Date(timestamp * 1000);
    
    // Calculate the UTC time in milliseconds
    const utcTime = date.getTime();
    
    // Apply the city's timezone offset
    const cityTime = new Date(utcTime + (timezoneOffsetSeconds * 1000));
    
    // Format the time
    return cityTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'UTC' // This is needed because we manually adjusted the time
    });
  };

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
    sunrise: formatTimeInCityTimezone(weatherData.sys.sunrise),
    sunset: formatTimeInCityTimezone(weatherData.sys.sunset),
  };
}

/**
 * Public API function that uses the fallback system
 */
export async function getWeather(city: string): Promise<WeatherData | { error: string }> {
  try {
    // Use the withFallback utility to handle API failures
    const result = await withFallback(
      _getWeather,
      weatherFallbackProvider,
      city
    );
    
    return result;
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