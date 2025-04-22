import { ApiFallbackProvider } from './types';
import { WeatherData } from '../../tools/weather-api';

/**
 * Provides fallback data for Weather API calls
 */
export class WeatherFallbackProvider implements ApiFallbackProvider<WeatherData, string> {
  private connectionError: boolean = false;
  private apiKeyError: boolean = false;
  
  /**
   * Determine if we should use fallback based on the error
   */
  shouldProvideFallback(error: unknown): boolean {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Detect connection errors
      this.connectionError = (
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection')
      );
      
      // Detect API key errors
      this.apiKeyError = (
        errorMessage.includes('api key') ||
        errorMessage.includes('apikey') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('401')
      );
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate fallback weather data with realistic but mock values
   */
  getFallbackData(city: string): WeatherData {
    // Generate deterministic but seemingly random values based on city name
    // to ensure consistent results for the same city
    const cityHash = this.hashString(city.toLowerCase());
    
    const temperature = 15 + (cityHash % 25); // 15-40°C
    const humidity = 30 + (cityHash % 60); // 30-90%
    const windSpeed = 5 + (cityHash % 25); // 5-30 km/h
    const pressure = 990 + (cityHash % 40); // 990-1030 hPa
    
    // Possible conditions
    const conditions = ['clear', 'cloudy', 'rain', 'snow', 'storm'];
    const conditionIndex = cityHash % conditions.length;
    const condition = conditions[conditionIndex];
    
    // Generate descriptive text based on condition
    const descriptionMap: Record<string, string[]> = {
      'clear': ['Clear sky', 'Sunny', 'Perfect weather'],
      'cloudy': ['Partly cloudy', 'Overcast', 'Scattered clouds'],
      'rain': ['Light rain', 'Moderate rain', 'Drizzle'],
      'snow': ['Light snow', 'Snow flurries', 'Snowfall'],
      'storm': ['Thunderstorm', 'Heavy rain with thunder', 'Storm']
    };
    const descriptions = descriptionMap[condition] || ['Mixed conditions'];
    const description = descriptions[cityHash % descriptions.length];
    
    // Get current time in different formats for sunrise/sunset
    const now = new Date();
    const hours = now.getHours();
    const sunrise = hours < 12 ? '6:30 AM' : '6:45 AM';
    const sunset = hours < 12 ? '7:30 PM' : '7:15 PM';
    
    return {
      temperature,
      condition,
      description,
      humidity,
      windSpeed,
      city,
      country: 'MockCountry',
      feelsLike: temperature - 2 + (cityHash % 5),
      pressure,
      sunrise,
      sunset
    };
  }
  
  /**
   * Provide context about why fallback data is being used
   */
  getFallbackContext() {
    if (this.apiKeyError) {
      return {
        message: 'Weather API key missing or invalid. Using generated weather data.',
        severity: 'error' as const,
        isMock: true
      };
    } else if (this.connectionError) {
      return {
        message: 'Could not connect to Weather API. Using generated weather data.',
        severity: 'warning' as const,
        isMock: true
      };
    } else {
      return {
        message: 'Error fetching weather data. Using generated weather data.',
        severity: 'warning' as const,
        isMock: true
      };
    }
  }
  
  /**
   * Simple string hash function to generate consistent pseudorandom values
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Factory function to create a fallback provider for Weather API
 */
export function createWeatherFallbackProvider(): ApiFallbackProvider<WeatherData, string> {
  return new WeatherFallbackProvider();
} 