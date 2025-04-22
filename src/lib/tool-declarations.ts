/**
 * Tool declarations for the Gemini API
 */

import { type FunctionDeclaration } from "@google/generative-ai";
import { envatoToolDeclarations } from "./tool-declarations/envato";
import { weatherToolDeclaration } from "./tool-declarations/weather";
import { stocksToolDeclaration } from "./tool-declarations/stocks";
import { searchPlacesToolDeclaration, searchNearbyToolDeclaration } from "./tool-declarations/places";
import { renderAltairToolDeclaration, renderTableToolDeclaration } from "./tool-declarations/visualization";
import { explainTopicToolDeclaration } from "./tool-declarations/explanation";
import { getDirectionsToolDeclaration } from "./tool-declarations/maps";

export const toolDeclarations: FunctionDeclaration[] = [
  weatherToolDeclaration,
  stocksToolDeclaration,
  getDirectionsToolDeclaration,
  searchPlacesToolDeclaration,
  searchNearbyToolDeclaration,
  renderAltairToolDeclaration,
  renderTableToolDeclaration,
  explainTopicToolDeclaration,
  ...envatoToolDeclarations
]; 