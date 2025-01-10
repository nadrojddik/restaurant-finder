import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const RestaurantFinder = () => {
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const markersRef = useRef([]);
  const searchInputRef = useRef(null);

  useEffect(() => {
    // Initialize map
    if (mapRef.current && !map) {
      const initialMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, // New York City
        zoom: 12
      });
      setMap(initialMap);
    }

    // Initialize autocomplete
    if (searchInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        types: ['geocode']
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.geometry) {
          setLocation(place.formatted_address);
          handleSearch(place.geometry.location);
        }
      });
    }

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [map]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const handleSearch = async (searchLocation) => {
    setLoading(true);
    setError('');
    clearMarkers();

    try {
      map.setCenter(searchLocation);

      // Search for restaurants
      const service = new window.google.maps.places.PlacesService(map);
      const request = {
        location: searchLocation,
        radius: '5000',
        type: ['restaurant'],
        keyword: 'halal OR alcohol-free OR non-alcoholic'
      };

      const placesResults = await new Promise((resolve, reject) => {
        service.nearbySearch(request, (results, status) => {
          console.log('Places search status:', status, 'Results:', results?.length || 0);
          if (status === 'OK' && results && results.length > 0) {
            resolve(results);
          } else if (status === 'ZERO_RESULTS') {
            reject(new Error('No alcohol-free restaurants found in this area. Try expanding your search.'));
          } else {
            reject(new Error('Unable to search restaurants. Please try again.'));
          }
        });
      });

      // Add markers and info windows
      placesResults.forEach(place => {
        const marker = new window.google.maps.Marker({
          position: place.geometry.location,
          map: map,
          title: place.name,
          animation: window.google.maps.Animation.DROP
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-bold mb-1">${place.name}</h3>
              <p class="text-gray-600">${place.vicinity}</p>
              ${place.rating ? `<p class="mt-1">Rating: ${place.rating} ⭐</p>` : ''}
              ${place.opening_hours?.open_now !== undefined ? 
                `<p class="mt-1">${place.opening_hours.open_now ? '✅ Open now' : '❌ Closed'}</p>` 
                : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      setResults(placesResults);
      
      // Fit map bounds to show all markers
      if (markersRef.current.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        markersRef.current.forEach(marker => bounds.extend(marker.getPosition()));
        map.fitBounds(bounds);
      }

    } catch (err) {
      setError(err.message || 'Failed to fetch restaurants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!location) return;

    setLoading(true);
    setError('');

    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results: geocodeResults } = await new Promise((resolve, reject) => {
        geocoder.geocode({ 
          address: location,
          componentRestrictions: { }, // Allow worldwide search
          language: 'en'
        }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve({ results });
          } else {
            console.error('Geocoding error:', status);
            reject(new Error(`Could not find "${location}". Please try a different search term.`));
          }
        });
      });

      // Log the found location for debugging
      console.log('Found location:', geocodeResults[0].formatted_address);
      
      handleSearch(geocodeResults[0].geometry.location);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Location not found. Please try entering a city name or address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Find Alcohol-Free Restaurants</h2>
          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4">
            <input
              ref={searchInputRef}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              <Search size={20} />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[50vh] sm:h-[60vh] lg:h-[70vh]">
            <div 
              ref={mapRef}
              className="w-full h-full rounded-lg shadow-md overflow-hidden"
            />
          </div>
          
          <div className="lg:col-span-1">
            {results.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold mb-4">Found {results.length} restaurants</h3>
                <div className="space-y-4 max-h-[calc(50vh-2rem)] sm:max-h-[calc(60vh-2rem)] lg:max-h-[calc(70vh-2rem)] overflow-y-auto">
                  {results.map((place) => (
                    <div 
                      key={place.place_id} 
                      className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantFinder;