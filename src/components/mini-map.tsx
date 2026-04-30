"use client";

import dynamic from "next/dynamic";

const MiniMapInternal = dynamic(
  () => import("./mini-map-internal").then((m) => m.MiniMapInternal),
  { ssr: false }
);

type MiniMapProps = {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height?: number;
};

export function MiniMap(props: MiniMapProps) {
  return <MiniMapInternal {...props} />;
}
