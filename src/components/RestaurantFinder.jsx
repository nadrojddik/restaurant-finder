import React, { useState, useRef, useEffect } from 'react';
import { Search, Navigation, MapPin, Phone, Menu, X, ChevronUp } from 'lucide-react';

const RestaurantFinder = () => {
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [map, setMap] = useState(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [isListVisible, setIsListVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

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

          initialMap.addListener('idle', () => {
            const center = initialMap.getCenter();
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
              setSelectedLocation(place.geometry.location);
              map.setCenter(place.geometry.location);
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

    const options = {
      enableHighAccuracy: true,  // Use GPS if available
      timeout: 10000,           // Time to wait for position (10 seconds)
      maximumAge: 0             // Don't use cached position
    };

    setLoading(true);
    setError(''); // Clear any existing errors

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
          setLoading(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setError('Location permission was denied. Please check your browser settings and allow location access.');
              break;
            case error.POSITION_UNAVAILABLE:
              setError('Location information is unavailable. Please try entering your location manually.');
              break;
            case error.TIMEOUT:
              setError('Request to get location timed out. Please try again.');
              break;
            default:
              setError('An unknown error occurred while trying to get your location.');
          }
          console.error('Geolocation error:', error);
        },
        options
    );
  };

  // Search based on current map center
  const searchCurrentLocation = () => {
    if (!map) return;
    setSelectedLocation(null); // Clear any selected location
    const center = map.getCenter();
    handleSearch(center);
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  // Handle phone call
  const handlePhoneCall = (phoneNumber) => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    }
  };

  // Handle navigation
  const handleNavigation = (place) => {
    if (place.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }
  };

  // Main search handler
  const handleSearch = async (searchLocation) => {
    // Use selectedLocation if available, otherwise use the provided searchLocation
    const locationToSearch = selectedLocation || searchLocation;

    if (!window.google || !map) {
      setError('Maps service not yet initialized. Please try again.');
      return;
    }

    setLoading(true);
    setError('');
    clearMarkers();

    try {
      map.setCenter(locationToSearch);
      const service = new window.google.maps.places.PlacesService(map);

      const searchConfig = {
        placeTypes: [
          { type: 'restaurant', priority: 1 },
          { type: 'cafe', priority: 2 },
          { type: 'bakery', priority: 2 }
        ],

        excludedTypes: [
          'bar',
          'night_club',
          'liquor_store',
          'casino',
          'bowling_alley',  // Often have bars
          'movie_theater',  // Many serve alcohol now
          'restaurant_bar'
        ],
        positiveKeywords: [
          'halal restaurant',
          'family restaurant',
          'juice bar',
          'dessert cafe',
          'ice cream',
          'bubble tea',
          'coffee shop',
          'tea house',
          'vegetarian',
          'vegan',
          'middle eastern',
          'indian restaurant', // Many Indian restaurants are alcohol-free
          'halal cart',
          'smoothie'
        ],
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
          'nightclub',
          'cocktail',
          'liquor',
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
          'izakaya',  // Japanese pubs
          'cantina',
          'vineyard',
          'wine tasting',
          'beer tasting'
        ],
        excludedChains: [
          'mcdonalds',
          'burger king',
          'wendys',
          'kfc',
          'subway',
          'dominos',
          'pizza hut'
        ],
        searchRadii: [1000, 2000, 5000]
      };

      let allResults = [];

      for (const radius of searchConfig.searchRadii) {
        if (allResults.length >= 50) break;

        // First loop through place types
        for (const placeType of searchConfig.placeTypes) {
          if (allResults.length >= 50) break;

          // Then loop through keywords for each type
          for (const keyword of searchConfig.positiveKeywords) {
            if (allResults.length >= 30) break;

            const request = {
              location: searchLocation,
              radius: radius,
              type: placeType.type,
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

            const filteredResults = results.filter(place => {
              const placeName = place.name.toLowerCase();

              // Check excluded terms in name
              if (searchConfig.excludeTerms.some(term => placeName.includes(term.toLowerCase()))) {
                return false;
              }

              // Check excluded chains
              if (searchConfig.excludedChains.some(chain => placeName.includes(chain.toLowerCase()))) {
                return false;
              }

              // Check place types
              if (place.types?.some(type => searchConfig.excludedTypes.includes(type))) {
                return false;
              }

              return true;
            });

            const detailedResults = await Promise.all(
                filteredResults.map(async (place) => {
                  return new Promise((resolve) => {
                    service.getDetails(
                        {
                          placeId: place.place_id,
                          fields: ['formatted_phone_number']
                        },
                        (placeDetails, detailsStatus) => {
                          if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK) {
                            resolve({
                              ...place,
                              formatted_phone_number: placeDetails.formatted_phone_number
                            });
                          } else {
                            resolve(place);
                          }
                        }
                    );
                  });
                })
            );

            const existingIds = new Set(allResults.map(r => r.place_id));
            const uniqueNewResults = detailedResults.filter(r => !existingIds.has(r.place_id));
            allResults = [...allResults, ...uniqueNewResults];

            } catch (err) {
              console.error(`Search error with keyword "${keyword}" at ${radius}m:`, err);
            }
          } // end keyword loop
        } // end placeType loop
      } // end radius loop

      if (allResults.length === 0) {
        throw new Error('No suitable restaurants found. Try a different location or expand your search.');
      }

      const sortedResults = allResults
          .map(place => ({
            ...place,
            distance: window.google.maps.geometry.spherical.computeDistanceBetween(
                searchLocation,
                place.geometry.location
            )
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 50);

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
              ${place.formatted_phone_number ?
                `<p class="mt-1">📞 ${place.formatted_phone_number}</p>`
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

        if (markersRef.current.length > 0) {
          const bounds = new window.google.maps.LatLngBounds();
          markersRef.current.forEach(marker => bounds.extend(marker.getPosition()));
          map.fitBounds(bounds);
        }

    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to fetch restaurants. Please try again.');
    } finally {
      setSelectedLocation(null);
      setLoading(false);
    }
  }  // End of handleSearch

  // Mobile-specific handlers
  const toggleList = () => {
    setIsListVisible(!isListVisible);
  };

  return (
      <div className="relative h-screen w-screen bg-gray-50">
        {/* Map Container */}
        <div
            ref={mapRef}
            className="absolute inset-0 w-full h-full"
        />

        {/* Search Panel - Fixed at Top */}
        <div className="absolute inset-x-0 top-0 z-20">
          <div className="p-4 bg-white shadow-lg">
            <div className="max-w-lg mx-auto">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                      ref={searchInputRef}
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter city and state"
                      className="flex-1 px-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                      onClick={getUserLocation}
                      className="p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Navigation size={20} />
                  </button>
                </div>

                <div className="flex space-x-2">
                  <button
                      onClick={searchCurrentLocation}
                      className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Search This Area
                  </button>
                  <button
                      onClick={() => {
                        const searchLoc = selectedLocation || map.getCenter();
                        handleSearch(searchLoc);
                      }}
                      className="flex-1 px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                      disabled={loading || !mapsLoaded}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
            <div className="absolute inset-x-0 top-32 z-20 px-4">
              <div className="max-w-lg mx-auto p-3 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            </div>
        )}

        {/* Results List - Bottom Sheet on Mobile */}
        {results.length > 0 && (
            <div className={`fixed inset-x-0 bottom-0 z-30 transform transition-transform duration-300 ease-in-out 
          ${isListVisible ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]'}`}
            >
              {/* Handle Bar */}
              <div
                  className="bg-white h-14 rounded-t-xl shadow-lg flex items-center justify-center cursor-pointer"
                  onClick={toggleList}
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mb-1" />
                <div className="absolute right-4">
                  {isListVisible ? <ChevronUp size={20} /> : <Menu size={20} />}
                </div>
              </div>

              {/* Results Content */}
              <div className="bg-white h-[calc(100vh-15rem)] overflow-y-auto px-4 pb-4">
                <div className="flex justify-between items-center py-2 sticky top-0 bg-white">
                  <h3 className="font-semibold">Found {results.filter(place => !showOpenOnly || place.opening_hours?.open_now).length} restaurants</h3>
                  <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showOpenOnly}
                        onChange={(e) => setShowOpenOnly(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Open now only</span>
                  </label>
                </div>

                <div className="space-y-3">
                  {results
                      .filter(place => !showOpenOnly || place.opening_hours?.open_now)
                      .map((place) => (
                          <div
                              key={place.place_id}
                              className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm"
                              onClick={() => {
                                map.panTo(place.geometry.location);
                                map.setZoom(16);
                              }}
                          >
                            <h4 className="font-semibold text-lg mb-1">{place.name}</h4>
                            <p className="text-gray-600 text-sm mb-2">{place.vicinity}</p>

                            <div className="flex items-center space-x-4 text-sm mb-3">
                              {place.rating && (
                                  <div className="flex items-center">
                                    <span className="text-yellow-500 mr-1">★</span>
                                    <span>{place.rating.toFixed(1)}</span>
                                  </div>
                              )}
                              <span className="text-gray-600">
                        {(place.distance / 1000).toFixed(1)}km away
                      </span>
                            </div>

                            <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm 
                        ${place.opening_hours?.open_now
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                      >
                        {place.opening_hours?.open_now ? 'Open' : 'Closed'}
                      </span>

                              {place.formatted_phone_number && (
                                  <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePhoneCall(place.formatted_phone_number);
                                      }}
                                      className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full"
                                  >
                                    <Phone size={14} />
                                    <span>Call</span>
                                  </button>
                              )}

                              <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigation(place);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full"
                              >
                                <Navigation size={14} />
                                <span>Navigate</span>
                              </button>
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