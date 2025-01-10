import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const RestaurantFinder = () => {
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Initialize map
    if (mapRef.current && !map) {
      const initialMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, // New York City
        zoom: 12
      });
      setMap(initialMap);
    }
  }, [map]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const searchRestaurants = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    clearMarkers();

    try {
      // Geocode the location
      const geocoder = new window.google.maps.Geocoder();
      const { results: geocodeResults } = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: location }, (results, status) => {
          if (status === 'OK') resolve({ results });
          else reject(new Error('Location not found'));
        });
      });

      const searchLocation = geocodeResults[0].geometry.location;
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
          if (status === 'OK') resolve(results);
          else reject(new Error('No restaurants found'));
        });
      });

      // Add markers and info windows
      placesResults.forEach(place => {
        const marker = new window.google.maps.Marker({
          position: place.geometry.location,
          map: map,
          title: place.name
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div>
              <h3 style="font-weight: bold; margin-bottom: 5px;">${place.name}</h3>
              <p>${place.vicinity}</p>
              ${place.rating ? `<p>Rating: ${place.rating} ⭐</p>` : ''}
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
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(marker => bounds.extend(marker.getPosition()));
      map.fitBounds(bounds);

    } catch (err) {
      setError(err.message || 'Failed to fetch restaurants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-4">Find Alcohol-Free Restaurants</h2>
        <form onSubmit={searchRestaurants} className="flex gap-4">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location"
            className="flex-1 px-4 py-2 border rounded-lg"
            required
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
        <div className="lg:col-span-2">
          <div 
            ref={mapRef}
            className="w-full h-96 bg-gray-100 rounded-lg"
          />
        </div>
        
        <div className="lg:col-span-1">
          {results.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((place) => (
                <div key={place.place_id} className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold mb-2">{place.name}</h3>
                  <p className="text-gray-600 mb-2">{place.vicinity}</p>
                  {place.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">★</span>
                      <span>{place.rating}</span>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantFinder;