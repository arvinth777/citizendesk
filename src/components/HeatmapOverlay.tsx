import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";

export default function HeatmapOverlay({ data, visible }: { data: { lat: number; lng: number }[], visible: boolean }) {
  const map = useMap();
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);

  useEffect(() => {
    if (!map) return;
    
    if (!overlayRef.current) {
      overlayRef.current = new GoogleMapsOverlay({ layers: [] });
    }
    
    if (visible) {
      overlayRef.current.setMap(map);
    } else {
      overlayRef.current.setMap(null);
    }
    
    return () => {
      overlayRef.current?.setMap(null);
    };
  }, [map, visible]);

  useEffect(() => {
    if (overlayRef.current && visible) {
      const heatmapLayer = new HeatmapLayer({
        id: 'heatmapLayer',
        data,
        getPosition: d => [d.lng, d.lat],
        getWeight: d => 1,
        radiusPixels: 40,
        intensity: 1,
        threshold: 0.05
      });
      overlayRef.current.setProps({ layers: [heatmapLayer] });
    }
  }, [data, visible]);

  return null;
}
