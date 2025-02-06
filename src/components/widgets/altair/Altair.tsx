import { withWidget } from '../withWidget';
import { AltairWidget as AltairWidgetClass } from './altair-widget';
import type { AltairData } from './altair-widget';

export type AltairWidgetProps = AltairData;

export const AltairWidget = withWidget<AltairWidgetProps>(
  AltairWidgetClass,
  'AltairWidget'
); 