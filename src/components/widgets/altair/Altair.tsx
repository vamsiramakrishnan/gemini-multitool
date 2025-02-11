import { withWidget } from '../withWidget';
import { AltairWidget as AltairWidgetClass } from './altair-widget';
import type { AltairWidgetProps } from './altair-widget';

export const AltairWidget = withWidget<AltairWidgetProps>(
  AltairWidgetClass,
  'AltairWidget'
); 