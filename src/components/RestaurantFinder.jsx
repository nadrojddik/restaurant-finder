import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const RestaurantFinder = () => {
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [map, setMap] = useState(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const markersRef = useRef([]);
  const searchInputRef = useRef(null);

  useEffect(() => {
    // Function to initialize map and autocomplete
    const initializeGoogleMaps = () => {
      if (!window.google) {
        // If Google Maps hasn't loaded yet, try again in 100ms
        setTimeout(initializeGoogleMaps, 100);
        return;
      }

      if (!mapsLoaded) {
        setMapsLoaded(true);
      }

      // Initialize map
      if (mapRef.current && !map) {
        try {
          const initialMap = new window.google.maps.Map(mapRef.current, {
            center: { lat: 40.7128, lng: -74.0060 }, // New York City
            zoom: 12,
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false
          });
          setMap(initialMap);
        } catch (err) {
          console.error('Error initializing map:', err);
          setError('Failed to initialize map. Please refresh the page.');
        }
      }

      // Initialize autocomplete
      if (searchInputRef.current && !autocompleteRef.current) {
        try {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            searchInputRef.current,
            { types: ['geocode'] }
          );

          // Listen for place selection
          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry) {
              const fullAddress = place.formatted_address;
              setLocation(fullAddress);
              // Directly call handleSearch with the selected place's location
              handleSearch(place.geometry.location);
            }
          });

          // Prevent form submission when selecting from autocomplete
          searchInputRef.current.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.getElementsByClassName('pac-container').length > 0) {
              e.preventDefault();
            }
          });
        } catch (err) {
          console.error('Error initializing autocomplete:', err);
          setError('Failed to initialize location search. Please refresh the page.');
        }
      }
    };

    // Start the initialization process
    initializeGoogleMaps();

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [map, mapsLoaded]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const handleSearch = async (searchLocation) => {
    if (!window.google || !map) {
      setError('Maps service not yet initialized. Please try again.');
      return;
    }

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
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            resolve(results);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
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
      console.error('Search error:', err);
      setError(err.message || 'Failed to fetch restaurants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!location) return;

    if (!window.google || !map) {
      setError('Maps service not yet initialized. Please try again.');
      return;
    }

    setLoading(true);
    setError('');

    // If the form is submitted manually (not through autocomplete)
    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results: geocodeResults } = await new Promise((resolve, reject) => {
        geocoder.geocode({ 
          address: location.trim(),
          componentRestrictions: { }, // Allow worldwide search
          language: 'en'
        }, (results, status) => {
          if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
            resolve({ results });
          } else {
            console.error('Geocoding error:', status);
            reject(new Error(`Could not find "${location.trim()}". Please try a different search term.`));
          }
        });
      });

      // Update location with formatted address
      setLocation(geocodeResults[0].formatted_address);
      
      handleSearch(geocodeResults[0].geometry.location);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Location not found. Please try entering a city name or address.');
    } finally {
      setLoading(false);
    }
  };

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
          {/* Search panel */}
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