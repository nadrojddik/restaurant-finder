import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const RestaurantFinder = () => {
  // ... [Previous state and ref declarations remain the same] ...

  // Component JSX structure updated for fullscreen map
  return (
    <div className="relative h-screen w-screen">
      {/* Map container - now fullscreen */}
      <div 
        ref={mapRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Content overlay */}
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Search panel - add pointer-events-auto to make it clickable */}
          <div className="pointer-events-auto mb-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Find Alcohol-Free Restaurants</h2>
            <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4">
              <input
                ref={searchInputRef}
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                required
              />
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                disabled={loading || !mapsLoaded}
              >
                <Search size={20} />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          {/* Error message */}
          {error && (
            <div className="pointer-events-auto mb-6 p-4 bg-red-50 text-red-600 rounded-lg shadow-lg">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results panel - positioned on the right */}
      {results.length > 0 && (
        <div className="absolute top-[140px] right-4 lg:right-8 z-10 w-full max-w-sm pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Found {results.length} restaurants</h3>
            <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
              {results.map((place) => (
                <div 
                  key={place.place_id} 
                  className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
                  onClick={() => {
                    map.panTo(place.geometry.location);
                    map.setZoom(16);
                  }}
                >
                  <h4 className="text-lg font-semibold mb-2">{place.name}</h4>
                  <p className="text-gray-600 mb-2">{place.vicinity}</p>
                  {place.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">★</span>
                      <span>{place.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      place.opening_hours?.open_now ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {place.opening_hours?.open_now ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantFinder;