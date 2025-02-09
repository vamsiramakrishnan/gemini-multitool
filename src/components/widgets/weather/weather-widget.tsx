import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import './weather-widget.scss';

export interface WeatherData extends BaseWidgetData {
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
  error?: string;
}

export class WeatherWidget extends BaseWidget<WeatherData> {
  protected data: WeatherData;

  constructor(data?: WeatherData) {
    super('Weather');
    this.data = {
      title: 'Weather',
      temperature: 0,
      condition: '',
      description: '',
      humidity: 0,
      windSpeed: 0,
      city: '',
      country: '',
      feelsLike: 0,
      pressure: 0,
      sunrise: '',
      sunset: '',
      ...data
    };
  }

  async render(data: WeatherData = this.data): Promise<string> {
    // Update internal data
    this.data = { ...this.data, ...data };
    
    if (!this.data || this.data.error) {
      return this.createErrorState(this.data?.error || 'No weather data available');
    }

    const { temperature, condition, description, humidity, windSpeed, city, country, feelsLike, pressure, sunrise, sunset } = this.data;
    
    return `
      <div class="weather-widget">
        <div class="weather-main">
          <div class="temperature-section">
            <div class="weather-icon">
              ${this.getWeatherIcon(condition)}
            </div>
            <div class="temperature-info">
              <div class="weather-temp">
                ${Math.round(temperature)}<span class="unit">°C</span>
              </div>
              <div class="weather-condition">${description}</div>
              <div class="weather-location">
                <span class="material-symbols-outlined">location_on</span>
                ${city}, ${country}
              </div>
            </div>
          </div>

          <div class="weather-stats">
            <div class="stat-item">
              <div class="stat-icon">
                <span class="material-symbols-outlined">thermostat</span>
                Feels Like
              </div>
              <div class="stat-value">${Math.round(feelsLike)}°C</div>
              <div class="stat-label">Perceived</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">
                <span class="material-symbols-outlined">water_drop</span>
                Humidity
              </div>
              <div class="stat-value">${humidity}%</div>
              <div class="stat-label">Moisture</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">
                <span class="material-symbols-outlined">air</span>
                Wind
              </div>
              <div class="stat-value">${windSpeed}</div>
              <div class="stat-label">km/h</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">
                <span class="material-symbols-outlined">compress</span>
                Pressure
              </div>
              <div class="stat-value">${pressure}</div>
              <div class="stat-label">hPa</div>
            </div>
          </div>
        </div>

        <div class="sun-times">
          <div class="time-card sunrise">
            <div class="time-icon">
              <span class="material-symbols-outlined">wb_sunny</span>
            </div>
            <div class="time-value">${sunrise}</div>
            <div class="time-label">Sunrise</div>
          </div>
          
          <div class="time-card sunset">
            <div class="time-icon">
              <span class="material-symbols-outlined">wb_twilight</span>
            </div>
            <div class="time-value">${sunset}</div>
            <div class="time-label">Sunset</div>
          </div>
        </div>
      </div>
    `;
  }

  private getWeatherIcon(condition: string): string {
    const iconMap: Record<string, string> = {
      'clear': 'clear_day',
      'cloudy': 'cloud',
      'rain': 'rainy',
      'snow': 'weather_snowy',
      'storm': 'thunderstorm',
      'mist': 'foggy',
      'fog': 'foggy',
      'haze': 'foggy',
      'dust': 'blur_on',
      'smoke': 'blur_on'
    };
    const key = condition?.toLowerCase() || '';
    return `<span class="material-symbols-outlined">${iconMap[key] || 'question_mark'}</span>`;
  }

  destroy(): void {
    // Clean up any subscriptions/timers if needed
  }
}