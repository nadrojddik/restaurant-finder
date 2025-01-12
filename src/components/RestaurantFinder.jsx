import React, { useState, useRef, useEffect } from 'react';
import { Search, Navigation, MapPin } from 'lucide-react';

const RestaurantFinder = () => {
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [map, setMap] = useState(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Refs
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize Google Maps
  useEffect(() => {
    const initializeGoogleMaps = () => {
      if (!window.google?.maps?.places) {
        setTimeout(initializeGoogleMaps, 1000);
        return;
      }

      if (!mapsLoaded) {
        setMapsLoaded(true);
      }

      if (mapRef.current && !map) {
        try {
          const initialMap = new window.google.maps.Map(mapRef.current, {
            center: { lat: 40.7128, lng: -74.0060 },
            zoom: 12,
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false
          });

          // Add map idle event listener for when user pans the map
          initialMap.addListener('idle', () => {
            const center = initialMap.getCenter();
            // Update location text with reverse geocoding
            reverseGeocode(center);
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
              {
                types: ['(cities)'],
                componentRestrictions: { country: 'us' }
              }
          );

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry) {
              setLocation(place.formatted_address);
              map.setCenter(place.geometry.location);
              handleSearch(place.geometry.location);
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
      if (map) {
        window.google?.maps?.event.clearInstanceListeners(map);
      }
      if (autocompleteRef.current) {
        window.google?.maps?.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [map, mapsLoaded]);

  // Reverse geocode for updating location text when map is panned
  const reverseGeocode = async (latLng) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    try {
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK') resolve(results);
          else reject(status);
        });
      });

      // Find the city and state from the results
      const cityComponent = response[0].address_components.find(
          component => component.types.includes('locality')
      );
      const stateComponent = response[0].address_components.find(
          component => component.types.includes('administrative_area_level_1')
      );

      if (cityComponent && stateComponent) {
        setLocation(`${cityComponent.long_name}, ${stateComponent.short_name}`);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Get user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          if (map) {
            map.setCenter(userLocation);
            await reverseGeocode(userLocation);
            handleSearch(userLocation);
          }
          setLoading(false);
        },
        (error) => {
          setError('Unable to get your location. Please try entering it manually.');
          setLoading(false);
          console.error('Geolocation error:', error);
        }
    );
  };

  // Search based on current map center
  const searchCurrentLocation = () => {
    if (!map) return;

    const center = map.getCenter();
    handleSearch(center);
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };
  // Main search handler - keeping your existing implementation
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
      const service = new window.google.maps.places.PlacesService(map);

      // Core configuration for search criteria
      const searchConfig = {
        // Primary establishment types we want to find
        placeTypes: ['restaurant', 'cafe', 'bakery'],

        // Search terms that indicate alcohol-free establishments
        positiveKeywords: [
          'halal restaurant',
          'family restaurant',
          'vegetarian',
          'vegan',
          'juice bar',
          'dessert cafe'
        ],

        // Terms that should exclude a place
        excludeTerms: [
          'bar',
          'pub',
          'brewery',
          'taproom',
          'tavern',
          'wine',
          'beer',
          'alcohol',
          'spirits',
          'booze',
          'nightclub',
          'night club',
          'cocktail',
          'liquor',
          'ales',
          'winery',
          'distillery',
          'speakeasy',
          'lounge',
          'sports bar',
          'dive bar',
          'irish pub',
          'english pub',
          'german pub',
          'biergarten',
          'beer garden',
          'microbrewery',
          'brewpub',
          'wine bar',
          'sake bar',
          'izakaya'
        ],

        // Fast food chains to exclude (comprehensive list)
        excludedChains: [
          'mcdonalds',
          'burger king',
          'wendys',
          'kfc',
          'popeyes',
          'taco bell',
          'subway',
          'dominos',
          'pizza hut',
          'arbys',
          'sonic drive-in',
          'dairy queen',
          'jack in the box',
          'carls jr',
          'hardees',
          'little caesars',
          'dunkin',
          'culvers',
          'zaxbys',
          'raising canes',
          'checkers',
          'rallys',
          'whataburger',
          'white castle',
          'bojangles',
          'papa johns',
          'buffalo wild wings',
          'chick-fil-a',
          'starbucks',
          'dunkin donuts',
          'baskin robbins',
          'krispy kreme',
          'cold stone creamery',
          'auntie annes',
          'cinnabon',
          'tropical smoothie cafe',
          'smoothie king'
        ],

        // Search radii in meters
        searchRadii: [1000, 2000, 5000]
      };

      let allResults = [];

      // Perform searches with different radii and keywords
      for (const radius of searchConfig.searchRadii) {
        if (allResults.length >= 30) break;

        for (const keyword of searchConfig.positiveKeywords) {
          if (allResults.length >= 30) break;

          const request = {
            location: searchLocation,
            radius: radius,
            type: 'restaurant',
            keyword: keyword
          };

          try {
            const results = await new Promise((resolve, reject) => {
              service.nearbySearch(request, (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                  resolve(results);
                } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                  resolve([]);
                } else {
                  reject(new Error('Failed to fetch results'));
                }
              });
            });

            // Filter results
            const filteredResults = results.filter(place => {
              const placeName = place.name.toLowerCase();

              // Exclude places with unwanted terms in name
              if (searchConfig.excludeTerms.some(term =>
                  placeName.includes(term.toLowerCase()))) {
                return false;
              }

              // Exclude fast food chains
              if (searchConfig.excludedChains.some(chain =>
                  placeName.includes(chain.toLowerCase()))) {
                return false;
              }

              // Exclude places that explicitly serve alcohol (if the data is available)
              if (place.serves_alcohol === true) {
                return false;
              }

              // Exclude bars and nightclubs
              if (place.types?.includes('bar') || place.types?.includes('night_club')) {
                return false;
              }

              return true;
            });

            // Add only unique results
            const existingIds = new Set(allResults.map(r => r.place_id));
            const uniqueNewResults = filteredResults.filter(r => !existingIds.has(r.place_id));
            allResults = [...allResults, ...uniqueNewResults];

          } catch (err) {
            console.error(`Search error with keyword "${keyword}" at ${radius}m:`, err);
          }
        }
      }

      if (allResults.length === 0) {
        throw new Error('No suitable restaurants found. Try a different location or expand your search.');
      }

      // Sort results by distance
      const sortedResults = allResults
          .map(place => ({
            ...place,
            distance: window.google.maps.geometry.spherical.computeDistanceBetween(
                searchLocation,
                place.geometry.location
            )
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 30);

      // Create markers for each place
      sortedResults.forEach(place => {
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

      setResults(sortedResults);

      // Adjust map bounds to show all markers
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

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                      ref={searchInputRef}
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter city and state"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                      onClick={getUserLocation}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      title="Use my location"
                  >
                    <Navigation size={20} />
                  </button>

                  <button
                      onClick={searchCurrentLocation}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      title="Search this area"
                  >
                    <MapPin size={20} />
                  </button>

                  <button
                      onClick={() => handleSearch(map.getCenter())}
                      className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      disabled={loading || !mapsLoaded}
                  >
                    <Search size={20} />
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>

            {error && (
                <div className="pointer-events-auto mb-6 p-4 bg-red-50 text-red-600 rounded-lg shadow-lg">
                  {error}
                </div>
            )}
          </div>
        </div>

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