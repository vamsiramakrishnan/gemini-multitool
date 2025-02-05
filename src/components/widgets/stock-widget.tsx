import { BaseWidget, BaseWidgetData } from './base-widget';
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
  protected data: StockData;

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
    if (data.error) {
      return this.createErrorState(data.error);
    }

    const { symbol, currentPrice, change, percentChange, highPrice, lowPrice, openPrice, previousClose } = data;
    const isPositive = change >= 0;
    const pricePosition = ((currentPrice - lowPrice) / (highPrice - lowPrice)) * 100;
    
    return `
      <div class="stock-widget">
        <div class="stock-main">
          <div class="price-section">
            <div class="stock-symbol-container">
              <div class="stock-symbol">${symbol}</div>
            </div>
            <div class="price-info">
              <div class="current-price">
                $${Number(currentPrice).toLocaleString('en-US', {minimumFractionDigits: 2})}
              </div>
              <div class="price-change ${isPositive ? 'positive' : 'negative'}">
                <div class="trend-icon">
                  <span class="material-symbols-outlined">
                    ${isPositive ? 'trending_up' : 'trending_down'}
                  </span>
                </div>
                <div class="change-value">
                  ${isPositive ? '+' : ''}${change.toFixed(2)} (${percentChange.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>

          <div class="price-range">
            <div class="range-label">Today's Range</div>
            <div class="range-bar-container">
              <div class="range-value low">$${lowPrice.toFixed(2)}</div>
              <div class="range-bar">
                <div class="progress" style="width: 100%"></div>
                <div class="current-marker" style="left: ${pricePosition}%"></div>
              </div>
              <div class="range-value high">$${highPrice.toFixed(2)}</div>
            </div>
          </div>

          <div class="trading-info">
            <div class="info-item">
              <div class="info-icon">
                <span class="material-symbols-outlined">schedule</span>
                Open
              </div>
              <div class="info-value">$${openPrice.toFixed(2)}</div>
              <div class="info-label">Opening Price</div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <span class="material-symbols-outlined">history</span>
                Previous
              </div>
              <div class="info-value">$${previousClose.toFixed(2)}</div>
              <div class="info-label">Previous Close</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  destroy(): void {
    // Clean up any subscriptions/timers if needed
  }
} 