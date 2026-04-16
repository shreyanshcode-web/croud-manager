import React from 'react';
import { useUserLocation } from '../hooks/useUserLocation';

export default function LocationBanner() {
  const { lat, lng, loading, error, retry } = useUserLocation();

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg shadow-md max-w-sm">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </div>
        <span className="text-gray-200 font-medium">Locating you...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-4 bg-red-900 border border-red-700 rounded-lg shadow-md max-w-md">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-red-200 font-medium text-sm">{error}</span>
        </div>
        <button 
          onClick={retry}
          className="ml-4 px-3 py-1 text-sm font-semibold text-red-100 bg-red-800 rounded hover:bg-red-700 transition-colors whitespace-nowrap"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-md max-w-sm">
       <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      <span className="text-gray-200 font-medium text-sm">
        Location: {lat?.toFixed(4)}, {lng?.toFixed(4)}
      </span>
    </div>
  );
}
