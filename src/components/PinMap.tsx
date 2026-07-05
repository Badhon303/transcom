"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { BANGLADESH_CENTER } from "@/lib/geo";

const pinIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="width:18px;height:18px;background:#dc2626;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 4px rgba(0,0,0,.5)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

function ClickSetter({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onPick]);
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 12));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export default function PinMap({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={lat != null && lng != null ? [lat, lng] : BANGLADESH_CENTER}
      zoom={lat != null ? 12 : 7}
      className="h-64 w-full rounded-lg"
      scrollWheelZoom
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickSetter onPick={onPick} />
      <Recenter lat={lat} lng={lng} />
      {lat != null && lng != null && <Marker position={[lat, lng]} icon={pinIcon} />}
    </MapContainer>
  );
}
