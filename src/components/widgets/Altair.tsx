import { memo } from "react";
import "./altair.scss";

function AltairComponent() {
  // This becomes a simpler presentational component
  // The actual rendering is handled by AltairWidget
  return <div id="altair-container" className="vega-embed" />;
}

export const Altair = memo(AltairComponent); 