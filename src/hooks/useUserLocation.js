/**
 * useUserLocation — High-frequency GPS with Kalman smoothing
 *
 * Strategy:
 *  - watchPosition with maximumAge:0 gives the freshest hardware reading every
 *    time the device moves (browser/OS controlled, typically 50–200 ms on mobile).
 *  - A lightweight 1-D Kalman filter is applied independently to lat and lng to
 *    eliminate GPS jitter without introducing lag.
 *  - A 40 ms fallback poll re-requests the position on a timer so the UI always
 *    has the latest coords even on desktop where watchPosition can be slow.
 *  - Speed, heading and altitude are forwarded when the device supplies them.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// --- Kalman filter state for one axis ---
function makeKalman(processNoise = 1e-5, measurementNoise = 1e-2) {
  let estimate = null;
  let errorCovariance = 1;

  return function update(measurement) {
    if (estimate === null) {
      estimate = measurement;
      return measurement;
    }
    // Predict
    const predictedError = errorCovariance + processNoise;
    // Update
    const gain = predictedError / (predictedError + measurementNoise);
    estimate = estimate + gain * (measurement - estimate);
    errorCovariance = (1 - gain) * predictedError;
    return estimate;
  };
}

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 0, // always get the freshest fix from hardware
};

const POLL_INTERVAL_MS = 40;

export function useUserLocation() {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    speed: null,
    heading: null,
    altitude: null,
    timestamp: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const watcherId = useRef(null);
  const pollTimer = useRef(null);
  const kalmanLat = useRef(makeKalman());
  const kalmanLng = useRef(makeKalman());
  // Track last raw timestamp to skip duplicate readings from the 40ms poll
  const lastTs = useRef(0);

  const applyReading = useCallback((position) => {
    const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
    const ts = position.timestamp;

    // Skip if this is an identical reading (same hardware timestamp)
    if (ts === lastTs.current) return;
    lastTs.current = ts;

    const smoothLat = kalmanLat.current(latitude);
    const smoothLng = kalmanLng.current(longitude);

    setLocation({
      lat: smoothLat,
      lng: smoothLng,
      rawLat: latitude,
      rawLng: longitude,
      accuracy: accuracy ? +accuracy.toFixed(1) : null,
      speed: speed != null ? +speed.toFixed(2) : null,       // m/s
      heading: heading != null ? +heading.toFixed(1) : null, // degrees
      altitude: altitude != null ? +altitude.toFixed(1) : null,
      timestamp: ts,
    });
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err) => {
    setLoading(false);
    if (err.code === 1) {
      setError('Location permission denied. Enable it in browser settings.');
    } else if (err.code === 2) {
      setError('Position unavailable. Check GPS signal.');
    } else {
      setError(err.message || 'Failed to retrieve location.');
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Reset Kalman filters on fresh start so old estimates don't pollute new session
    kalmanLat.current = makeKalman();
    kalmanLng.current = makeKalman();
    lastTs.current = 0;

    // 1. Continuous hardware watch — triggers whenever the OS has a new fix
    if (watcherId.current !== null) {
      navigator.geolocation.clearWatch(watcherId.current);
    }
    watcherId.current = navigator.geolocation.watchPosition(
      applyReading,
      handleError,
      GEO_OPTIONS,
    );

    // 2. 40 ms fallback poll — ensures the UI never waits more than 40 ms
    //    for a position update even when watchPosition fires slowly (e.g. desktop).
    //    getCurrentPosition with maximumAge:0 will use cached hardware fix
    //    between actual GPS updates, so it is fast and non-blocking.
    if (pollTimer.current !== null) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(applyReading, () => {}, GEO_OPTIONS);
    }, POLL_INTERVAL_MS);
  }, [applyReading, handleError]);

  useEffect(() => {
    startTracking();
    return () => {
      if (watcherId.current !== null) navigator.geolocation.clearWatch(watcherId.current);
      if (pollTimer.current !== null) clearInterval(pollTimer.current);
    };
  }, [startTracking]);

  return {
    ...location,
    loading,
    error,
    retry: startTracking,
  };
}
