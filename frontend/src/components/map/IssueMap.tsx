'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IssueSummary, NearbyIssue } from '@/lib/api';
import { STATUS_COLORS, STATUS_LABELS } from './status-colors';

type MapIssue = IssueSummary | NearbyIssue;

interface IssueMapProps {
  issues: MapIssue[];
  center: [number, number];
  zoom?: number;
  heightClassName?: string;
  searchCenter?: [number, number] | null;
  searchRadiusMeters?: number | null;
}

function markerIcon(status: IssueSummary['status']) {
  const color = STATUS_COLORS[status] ?? '#6b7280';
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block;
      width:16px;height:16px;
      border-radius:9999px;
      background:${color};
      border:2px solid white;
      box-shadow:0 1px 3px rgba(0,0,0,0.4);
    "></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

function isNearbyIssue(issue: MapIssue): issue is NearbyIssue {
  return 'distanceMeters' in issue;
}

// Re-centers/fits the map whenever the issue set or search center changes,
// without re-mounting the whole MapContainer.
function FitToData({
  issues,
  center,
}: {
  issues: MapIssue[];
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (issues.length === 0) {
      map.setView(center, map.getZoom());
      return;
    }
    const bounds = L.latLngBounds(
      issues.map(
        (i) =>
          [i.location.coordinates[1], i.location.coordinates[0]] as [
            number,
            number,
          ],
      ),
    );
    map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues]);

  return null;
}

export default function IssueMap({
  issues,
  center,
  zoom = 13,
  heightClassName = 'h-[70vh]',
  searchCenter,
  searchRadiusMeters,
}: IssueMapProps) {
  const searchIcon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html: `<span style="
          display:block;
          width:14px;height:14px;
          border-radius:9999px;
          background:#111827;
          border:2px solid white;
          box-shadow:0 1px 3px rgba(0,0,0,0.5);
        "></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    [],
  );

  return (
    <div className={`w-full ${heightClassName} rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitToData issues={issues} center={center} />

        {searchCenter && (
          <Marker position={searchCenter} icon={searchIcon}>
            <Popup>
              Search center
              {searchRadiusMeters
                ? ` — ${(searchRadiusMeters / 1000).toFixed(1)} km radius`
                : ''}
            </Popup>
          </Marker>
        )}

        {issues.map((issue) => {
          const [lng, lat] = issue.location.coordinates;
          return (
            <Marker
              key={issue.id}
              position={[lat, lng]}
              icon={markerIcon(issue.status)}
            >
              <Popup>
                <div className="text-sm space-y-1 min-w-[180px]">
                  <p className="font-semibold">{issue.title}</p>
                  <p className="text-zinc-500">{issue.ticketId}</p>
                  <p>
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-white text-xs"
                      style={{ background: STATUS_COLORS[issue.status] }}
                    >
                      {STATUS_LABELS[issue.status]}
                    </span>{' '}
                    <span className="text-zinc-500">{issue.category}</span>
                  </p>
                  {issue.addressText && (
                    <p className="text-zinc-500">{issue.addressText}</p>
                  )}
                  {isNearbyIssue(issue) && (
                    <p className="text-zinc-500">
                      {(issue.distanceMeters / 1000).toFixed(2)} km away
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
