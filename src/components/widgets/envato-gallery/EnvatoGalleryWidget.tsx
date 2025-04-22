import React from 'react';
import { withWidget } from '../withWidget';
import { EnvatoGalleryWidget as EnvatoGalleryWidgetClass } from './envato-gallery-widget';
import type { EnvatoGalleryData } from './envato-gallery-widget';

export interface EnvatoGalleryWidgetProps extends EnvatoGalleryData {}

// Export the wrapped widget component using the same approach as PlacesWidget
export const EnvatoGalleryWidget = withWidget<EnvatoGalleryWidgetProps>(
  EnvatoGalleryWidgetClass,
  'envato_gallery'
);

// Make sure to export the component as default as well
export default EnvatoGalleryWidget;
