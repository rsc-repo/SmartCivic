'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  getIssues,
  getNearbyIssues,
  IssueSummary,
  NearbyIssue,
} from '@/lib/api';
import MapLegend from '@/components/map/MapLegend';

// Leaflet touches `window` at import time, so it must never be rendered
// during SSR/static generation — only load it in the browser.
const IssueMap = dynamic(() => import('@/components/map/IssueMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
      Loading map…
    </div>
  ),
});

// Jaipur, Rajasthan — reasonable default center for local dev/demo data.
const DEFAULT_CENTER: [number, number] = [26.9124, 75.7873];

type Mode = 'all' | 'nearby';

export default function MapPage() {
  const [mode, setMode] = useState<Mode>('all');
  const [allIssues, setAllIssues] = useState<IssueSummary[]>([]);
  const [nearbyIssues, setNearbyIssues] = useState<NearbyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lat, setLat] = useState(String(DEFAULT_CENTER[0]));
  const [lng, setLng] = useState(String(DEFAULT_CENTER[1]));
  const [radiusKm, setRadiusKm] = useState(2);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      setAllIssues(await getIssues());
    } catch (err) {
      setError(
        `Could not load issues — is the backend running? (${String(
          (err as Error)?.message ?? err,
        )})`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runNearbySearch = async (searchLat: number, searchLng: number) => {
    setLoading(true);
    setError(null);
    try {
      const results = await getNearbyIssues(
        searchLat,
        searchLng,
        radiusKm * 1000,
      );
      setNearbyIssues(results);
      setMode('nearby');
    } catch (err) {
      setError(
        `Nearby search failed (${String((err as Error)?.message ?? err)})`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      setError('Enter valid latitude and longitude values.');
      return;
    }
    runNearbySearch(parsedLat, parsedLng);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        runNearbySearch(latitude, longitude);
      },
      (geoErr) => setError(`Could not get your location: ${geoErr.message}`),
    );
  };

  const activeIssues = mode === 'all' ? allIssues : nearbyIssues;
  const mapCenter = useMemo<[number, number]>(() => {
    if (mode === 'nearby') {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
        return [parsedLat, parsedLng];
      }
    }
    return DEFAULT_CENTER;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <main className="min-h-screen p-6 sm:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Issue Map
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {mode === 'all'
          ? `Showing all ${allIssues.length} reported issue${allIssues.length === 1 ? '' : 's'}.`
          : `Showing ${nearbyIssues.length} issue${nearbyIssues.length === 1 ? '' : 's'} within ${radiusKm} km.`}
      </p>

      <section className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Latitude
            </label>
            <input
              className="w-32 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Longitude
            </label>
            <input
              className="w-32 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Radius: {radiusKm} km
            </label>
            <input
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-40"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm font-medium"
          >
            Search nearby
          </button>
          <button
            onClick={useMyLocation}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm"
          >
            Use my location
          </button>
          {mode === 'nearby' && (
            <button
              onClick={() => setMode('all')}
              className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-500"
            >
              Show all issues
            </button>
          )}
        </div>
      </section>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4">
        <IssueMap
          issues={activeIssues}
          center={mapCenter}
          searchCenter={mode === 'nearby' ? mapCenter : null}
          searchRadiusMeters={mode === 'nearby' ? radiusKm * 1000 : null}
        />
      </div>

      <div className="mt-3">
        <MapLegend />
      </div>

      {loading && (
        <p className="mt-2 text-xs text-zinc-400">Loading…</p>
      )}
    </main>
  );
}
