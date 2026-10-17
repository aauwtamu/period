"use client";
import { useState } from "react";

export function useProximitySort() {
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  function locate() {
    if (position) {
      setPosition(null);
      return;
    }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocating(false);
      },
      () => {
        setPosition(null);
        setLocating(false);
      },
      { timeout: 8000, maximumAge: 60_000, enableHighAccuracy: false },
    );
  }
  return { position, locating, locate };
}
