import React, { useState, useRef, useEffect } from 'react';
import { Search, Crosshair } from 'lucide-react';

const RestaurantFinder = () => {
  // 1. State declarations
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [map, setMap] = useState(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [showSearchAreaButton, setShowSearchAreaButton] = useState(false);
  // 2. Ref declarations
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const markersRef = useRef([]);
  const searchInputRef = useRef(null);
  const lastSelectedPlace = useRef(null);
  const mapIdleListenerRef = useRef(null);

  // 3. Utility functions
  const normalizeLocation = (location) => {
    if (location instanceof window.google.maps.LatLng) {
      return location;
    }

    if (location && typeof location === 'object') {
      if (typeof location.lat === 'function' && typeof location.lng === 'function') {
        return location;
      }
      if ('lat' in location && 'lng' in location) {
        return new window.google.maps.LatLng(
            typeof location.lat === 'function' ? location.lat() : location.lat,
            typeof location.lng === 'function' ? location.lng() : location.lng
        );
      }
    }

    console.warn('Invalid location format, defaulting to New York:', location);
    return new window.google.maps.LatLng(40.7128, -74.0060);
  };

  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.warn('Geolocation error:', error);
            resolve({ lat: 40.7128, lng: -74.0060 });
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
      );
    });
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };
// 4. useEffect hooks
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      if (!window.google) {
        setTimeout(initializeGoogleMaps, 100);
        return;
      }

      if (!mapsLoaded) {
        setMapsLoaded(true);
      }

      if (mapRef.current && !map) {
        try {
          const userLocation = await getUserLocation();
          const initialMap = new window.google.maps.Map(mapRef.current, {
            center: userLocation,
            zoom: 14,
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

      if (searchInputRef.current && !autocompleteRef.current) {
        try {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
              searchInputRef.current,
              { types: ['geocode'] }
          );

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry) {
              lastSelectedPlace.current = place;
              setLocation(place.formatted_address);
              handleSearch(place.geometry.location);
            }
          });

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

    initializeGoogleMaps();

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [map, mapsLoaded]);

  useEffect(() => {
    if (!map) return;

    const initialLocation = map.getCenter();
    const initialPos = {
      lat: initialLocation.lat(),
      lng: initialLocation.lng()
    };

    mapIdleListenerRef.current = map.addListener('idle', () => {
      const center = map.getCenter();
      const bounds = map.getBounds();

      if (center && bounds) {
        const mapCenter = { lat: center.lat(), lng: center.lng() };
        const hasMoved =
            Math.abs(mapCenter.lat - initialPos.lat) > 0.0001 ||
            Math.abs(mapCenter.lng - initialPos.lng) > 0.0001;

        setShowSearchAreaButton(!loading && hasMoved);
      }
    });

    return () => {
      if (mapIdleListenerRef.current) {
        window.google?.maps?.event.removeListener(mapIdleListenerRef.current);
      }
    };
  }, [map, loading]);

  // 5. Event Handlers
  const handleSearchThisArea = () => {
    if (!map) return;
    const center = map.getCenter();
    if (center) {
      handleSearch(center);
    }
  };

  const handleRecenterMap = async () => {
    if (!map) return;
    try {
      const userLocation = await getUserLocation();
      map.panTo(userLocation);
      map.setZoom(14);
      handleSearch(userLocation);
    } catch (error) {
      setError('Unable to get your location. Please try searching manually.');
    }
  };


  const handleSearch = async (searchLocation) => {
    if (!window.google || !map) {
      setError('Maps service not yet initialized. Please try again.');
      return;
    }

    setLoading(true);
    setError('');
    clearMarkers();
    setShowSearchAreaButton(false);

    const normalizedLocation = normalizeLocation(searchLocation);

    try {
      map.setCenter(normalizedLocation);
      const service = new window.google.maps.places.PlacesService(map);

      const specificRestaurantTypes = [
        'restaurant',
        'cafe',
        'bakery',
        'meal_takeaway',
      ];

      const searchKeywords = [
        'restaurant -fast food -mcdonalds',
        'cafe',
        'dining -alcohol',
        'halal restaurant',
      ];

      const searchRadii = [5000, 10000, 20000, 50000];
      let allResults = [];

      for (const radius of searchRadii) {
        for (const keyword of searchKeywords) {
          if (allResults.length >= 50) break;

          const request = {
            location: normalizedLocation,
            radius: radius,
            types: specificRestaurantTypes,
            keyword: keyword
          };

          try {
            const results = await new Promise((resolve, reject) => {
              service.nearbySearch(request, async (results, status, pagination) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                  const filteredResults = results.filter(place =>
                      !place.name.toLowerCase().match(/mcdonalds|kfc|burger king|domino's|pizza hut|subway/i) &&
                      (!place.types || !place.types.includes('meal_delivery'))
                  );

                  let combinedResults = [...filteredResults];

                  while (pagination && pagination.hasNextPage && combinedResults.length < 50) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    const nextResults = await new Promise(resolveNext => {
                      pagination.nextPage((results, status) => {
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                          const filteredNextResults = results.filter(place =>
                              !place.name.toLowerCase().match(/mcdonalds|kfc|burger king|domino's|pizza hut|subway/i) &&
                              (!place.types || !place.types.includes('meal_delivery'))
                          );
                          resolveNext(filteredNextResults);
                        } else {
                          resolveNext([]);
                        }
                      });
                    });
                    combinedResults = [...combinedResults, ...nextResults];
                  }

                  resolve(combinedResults);
                } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                  resolve([]);
                } else {
                  reject(new Error('Unable to search restaurants. Please try again.'));
                }
              });
            });

            const existingIds = new Set(allResults.map(r => r.place_id));
            const uniqueNewResults = results.filter(r => !existingIds.has(r.place_id));
            allResults = [...allResults, ...uniqueNewResults];

          } catch (err) {
            console.error(`Error searching with keyword "${keyword}" at ${radius}m radius:`, err);
          }
        }
      }

      if (allResults.length === 0) {
        throw new Error('No suitable restaurants found in this area. Try a different location or expand your search.');
      }

      const placesResults = allResults
          .map(place => {
            let distance;
            try {
              distance = window.google.maps.geometry.spherical.computeDistanceBetween(
                  normalizedLocation,
                  place.geometry.location
              );
            } catch (err) {
              const toRadians = (degrees) => degrees * (Math.PI / 180);
              const R = 6371;
              const lat1 = normalizedLocation.lat();
              const lon1 = normalizedLocation.lng();
              const lat2 = place.geometry.location.lat();
              const lon2 = place.geometry.location.lng();

              const dLat = toRadians(lat2 - lat1);
              const dLon = toRadians(lon2 - lon1);
              const a =
                  Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distance = R * c * 1000;
            }

            return {
              ...place,
              distance
            };
          })
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 50);

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

    if (lastSelectedPlace.current && lastSelectedPlace.current.formatted_address === location) {
      handleSearch(lastSelectedPlace.current.geometry.location);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results: geocodeResults } = await new Promise((resolve, reject) => {
        geocoder.geocode({
          address: location.trim(),
          componentRestrictions: { },
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

      setLocation(geocodeResults[0].formatted_address);
      lastSelectedPlace.current = {
        formatted_address: geocodeResults[0].formatted_address,
        geometry: { location: geocodeResults[0].geometry.location }
      };
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
        <div
            ref={mapRef}
            className="absolute inset-0 w-full h-full"
        />

        <div className="absolute inset-x-0 top-0 z-10 pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="pointer-events-auto mb-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Find Alcohol-Free Restaurants</h2>
              <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                      ref={searchInputRef}
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter location"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      required
                  />
                  <button
                      type="button"
                      onClick={handleRecenterMap}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-blue-500"
                      title="Use my location"
                  >
                    <Crosshair size={20} />
                  </button>
                </div>
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

            {error && (
                <div className="pointer-events-auto mb-6 p-4 bg-red-50 text-red-600 rounded-lg shadow-lg">
                  {error}
                </div>
            )}
          </div>
        </div>

        {showSearchAreaButton && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <button
                  onClick={handleSearchThisArea}
                  className="pointer-events-auto px-4 py-2 bg-white rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Search this area
              </button>
            </div>
        )}

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
                        <div className="flex items-center gap-4">
                          {place.rating && (
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-500">★</span>
                                <span>{place.rating.toFixed(1)}</span>
                              </div>
                          )}
                          <div className="text-gray-600 text-sm">
                            {(place.distance / 1000).toFixed(1)}km away
                          </div>
                        </div>
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