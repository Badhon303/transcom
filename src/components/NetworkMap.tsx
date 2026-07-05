"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Tooltip,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Customer, Rbu, caseQtyBucket } from "@/lib/types";
import { BANGLADESH_CENTER, DEFAULT_ZOOM } from "@/lib/geo";

const factoryIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="width:16px;height:16px;background:#15803d;border:2px solid white;border-radius:3px;box-shadow:0 0 4px rgba(0,0,0,.5)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitToData({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [40, 40] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);
  return null;
}

export interface NetworkMapProps {
  customers: Customer[];
  rbus: Rbu[];
  selectedCustomerId?: string | null;
  onCustomerClick?: (c: Customer) => void;
  onRbuClick?: (r: Rbu) => void;
  routePolyline?: [number, number][] | null;
  fitData?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onMapClick) return;
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onMapClick]);
  return null;
}

export default function NetworkMap({
  customers,
  rbus,
  selectedCustomerId,
  onCustomerClick,
  onRbuClick,
  routePolyline,
  fitData,
  onMapClick,
}: NetworkMapProps) {
  const withCoords = customers.filter(
    (c) => c.latitude != null && c.longitude != null
  );
  const fitPoints: [number, number][] = fitData
    ? [
        ...withCoords.map((c) => [c.latitude as number, c.longitude as number] as [number, number]),
        ...rbus.map((r) => [r.latitude, r.longitude] as [number, number]),
      ]
    : [];

  return (
    <MapContainer
      center={BANGLADESH_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {fitData && <FitToData points={fitPoints} />}
      <ClickHandler onMapClick={onMapClick} />

      {withCoords.map((c) => {
        const { radius } = caseQtyBucket(c.caseQty);
        const selected = c.id === selectedCustomerId;
        return (
          <CircleMarker
            key={c.id}
            center={[c.latitude as number, c.longitude as number]}
            radius={selected ? radius + 3 : radius}
            pathOptions={{
              color: selected ? "#1d4ed8" : "#2563eb",
              weight: selected ? 3 : 1,
              fillColor: "#3b82f6",
              fillOpacity: 0.6,
            }}
            eventHandlers={{ click: () => onCustomerClick?.(c) }}
          >
            <Tooltip>
              <div className="text-xs">
                <strong>{c.dbName}</strong>
                <br />
                {c.regionName} · {Math.round(c.caseQty)} cases
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {rbus.map((r) =>
        r.isFactory ? (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={factoryIcon}
            eventHandlers={{ click: () => onRbuClick?.(r) }}
          >
            <Tooltip>
              <div className="text-xs">
                <strong>{r.name}</strong>
                <br />
                Factory (final destination)
              </div>
            </Tooltip>
          </Marker>
        ) : (
          <CircleMarker
            key={r.id}
            center={[r.latitude, r.longitude]}
            radius={10}
            pathOptions={{
              color: "#166534",
              weight: 2,
              fillColor: "#22c55e",
              fillOpacity: 0.85,
            }}
            eventHandlers={{ click: () => onRbuClick?.(r) }}
          >
            <Tooltip>
              <div className="text-xs">
                <strong>{r.name}</strong>
                <br />
                RBU {r.customerCount != null ? `· ${r.customerCount} customers` : ""}
              </div>
            </Tooltip>
          </CircleMarker>
        )
      )}

      {routePolyline && routePolyline.length > 1 && (
        <Polyline positions={routePolyline} pathOptions={{ color: "#dc2626", weight: 4, opacity: 0.8 }} />
      )}
    </MapContainer>
  );
}
