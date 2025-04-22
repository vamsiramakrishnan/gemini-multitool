/**
 * Stocks tool handler
 */

import { BaseToolHandler } from '../types';
import { getStockPrice } from '../../tools/stock-api';
import { WidgetManager } from '../../widget-manager';

export class StocksHandler extends BaseToolHandler {
  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
  }

  async handleRequest(args: any): Promise<any> {
    return this.handleWithStatus<any>(
      'get_stock_price',
      args,
      'stocks',
      (result) => `Stock Price - ${args.symbol}`,
      () => getStockPrice(args.symbol)
    );
  }
} 