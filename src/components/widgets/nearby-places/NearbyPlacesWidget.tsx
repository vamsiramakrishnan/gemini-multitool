import React, { useEffect, useState, useRef, useCallback } from 'react';
import { withWidget } from '../withWidget';
import { NearbyPlacesWidget as NearbyPlacesWidgetClass } from './nearby-places-widget';
import type { NearbyPlacesData } from './nearby-places-widget';

export interface Place {
  id?: string;
  name: string;
  address: string;
  rating?: number;
  userRatings?: number;
  priceLevel?: number;
  photos?: string[];
  businessStatus: string;
  types?: string[];
  location: {
    latitude: number;
    longitude: number;
  };
}

export type NearbyPlacesWidgetProps = NearbyPlacesData;

export const NearbyPlacesWidget = withWidget<NearbyPlacesWidgetProps>(
  NearbyPlacesWidgetClass,
  'NearbyPlacesWidget'
); 