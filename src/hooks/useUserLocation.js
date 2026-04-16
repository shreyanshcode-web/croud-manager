import { useState, useEffect, useCallback, useRef } from 'react';

export function useUserLocation() {
  const [location, setLocation] = useState({ lat: null, lng: null, accuracy: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const watcherId = useRef(null);

  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
    };

    const handleSuccess = (position) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setLoading(false);
    };

    const handleError = (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        setError("Location permission denied. Please enable in browser settings.");
      } else {
        setError(err.message || "Failed to retrieve location.");
      }
      setLoading(false);
    };

    // Make initial request
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

    // Watch for position updates
    // The maximumAge ensures we don't just use a cached position indefinitely
    if (watcherId.current !== null) {
      navigator.geolocation.clearWatch(watcherId.current);
    }
    
    watcherId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      ...options,
      maximumAge: 30000, 
    });

  }, []);

  useEffect(() => {
    requestLocation();

    return () => {
      if (watcherId.current !== null) {
        navigator.geolocation.clearWatch(watcherId.current);
      }
    };
  }, [requestLocation]);

  return { ...location, loading, error, retry: requestLocation };
}
