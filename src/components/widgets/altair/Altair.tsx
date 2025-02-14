import { withWidget } from '../withWidget';
import { AltairWidget as AltairWidgetClass, AltairWidgetProps } from './altair-widget';

export const AltairWidget = withWidget<AltairWidgetProps>(
  AltairWidgetClass,
  'AltairWidget'
); 