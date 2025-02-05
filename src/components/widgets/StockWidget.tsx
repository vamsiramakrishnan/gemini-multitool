import { withWidget } from './withWidget';
import { StockWidget as StockWidgetClass } from './stock-widget';
import type { StockData } from './stock-widget';

export type StockWidgetProps = StockData;

export const StockWidget = withWidget<StockWidgetProps>(
  StockWidgetClass,
  'StockWidget'
); 