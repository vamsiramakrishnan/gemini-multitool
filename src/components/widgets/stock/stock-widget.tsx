import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import './stock-widget.scss';

export interface StockData extends BaseWidgetData {
  symbol: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  previousClose: number;
  error?: string;
}

export class StockWidget extends BaseWidget<StockData> {
  constructor(data?: StockData) {
    super('Stock');
    this.data = {
      title: 'Stock',
      symbol: '',
      currentPrice: 0,
      change: 0,
      percentChange: 0,
      highPrice: 0,
      lowPrice: 0,
      openPrice: 0,
      previousClose: 0,
      ...data
    };
  }

  async render(data: StockData = this.data): Promise<string> {
    // Update internal data
    this.data = { ...this.data, ...data };
    
    if (this.data.error) {
      return this.createErrorState(this.data.error);
    }

    const { symbol, currentPrice, change, percentChange, highPrice, lowPrice, openPrice, previousClose } = this.data;
    const isPositive = change >= 0;
    const pricePosition = ((currentPrice - lowPrice) / (highPrice - lowPrice)) * 100;
    
    return `
      <div class="stock-widget">
        <div class="stock-price-section">
          <div class="price-container">
            <div class="current-price">
              <span class="currency">$</span>${Number(currentPrice).toLocaleString('en-US', {minimumFractionDigits: 2})}
            </div>
            <div class="price-change">
              <div class="change-value ${isPositive ? 'positive' : 'negative'}">
                <span class="material-symbols-outlined">
                  ${isPositive ? 'trending_up' : 'trending_down'}
                </span>
                ${isPositive ? '+' : ''}${change.toFixed(2)}
              </div>
              <div class="change-percent ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '+' : ''}${percentChange.toFixed(2)}%
              </div>
            </div>
          </div>
          
          <div class="price-range">
            <div class="range-bar">
              <div class="range-fill" style="width: 100%"></div>
              <div class="current-marker" style="left: ${pricePosition}%"></div>
            </div>
            <div class="range-labels">
              <div>
                <span class="range-label">Day Low</span>
                <div class="day-low">$${lowPrice.toFixed(2)}</div>
              </div>
              <div>
                <span class="range-label">Day High</span>
                <div class="day-high">$${highPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="stock-metrics">
          <div class="metric-card">
            <div class="metric-icon">
              <span class="material-symbols-outlined">schedule</span>
              Open
            </div>
            <div class="metric-value">$${openPrice.toFixed(2)}</div>
            <div class="metric-label">Opening Price</div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">
              <span class="material-symbols-outlined">history</span>
              Previous
            </div>
            <div class="metric-value">$${previousClose.toFixed(2)}</div>
            <div class="metric-label">Previous Close</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-icon">
              <span class="material-symbols-outlined">trending_up</span>
              Volume
            </div>
            <div class="metric-value">2.4M</div>
            <div class="metric-label">Today's Volume</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-icon">
              <span class="material-symbols-outlined">percent</span>
              Change
            </div>
            <div class="metric-value">${isPositive ? '+' : ''}${percentChange.toFixed(2)}%</div>
            <div class="metric-label">Since Previous</div>
          </div>
        </div>
      </div>
    `;
  }

  private createErrorState(message: string): string {
    return `
      <div class="stock-widget error">
        <div class="error-icon">
          <span class="material-symbols-outlined">error_outline</span>
        </div>
        <div class="error-message">${message || 'Unable to load stock data'}</div>
      </div>
    `;
  }

  destroy(): void {
    // Clean up any subscriptions/timers if needed
  }
} 