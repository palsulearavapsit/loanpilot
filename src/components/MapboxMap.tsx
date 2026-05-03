'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxMapProps {
  lat: number;
  lng: number;
  /** Height of the map container, default 220px */
  height?: number;
  /** Optional label shown in the popup marker */
  label?: string;
  className?: string;
}

export default function MapboxMap({ lat, lng, height = 220, label = 'Applicant Location', className = '' }: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current = map;

    // Gold-colored pulsing marker
    const el = document.createElement('div');
    el.style.cssText = `
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #D4AF37;
      border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(212,175,55,0.4), 0 0 20px rgba(212,175,55,0.6);
      animation: pulse-gold 2s infinite;
    `;

    // Inject pulse keyframes once
    if (!document.getElementById('mapbox-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'mapbox-pulse-style';
      style.textContent = `
        @keyframes pulse-gold {
          0%   { box-shadow: 0 0 0 0 rgba(212,175,55,0.7); }
          70%  { box-shadow: 0 0 0 12px rgba(212,175,55,0); }
          100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
        }
      `;
      document.head.appendChild(style);
    }

    new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false }).setText(label))
      .addTo(map);

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl overflow-hidden border border-gold-dark/20 ${className}`}
      style={{ height }}
    />
  );
}
