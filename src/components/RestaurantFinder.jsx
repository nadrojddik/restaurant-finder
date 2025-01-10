// src/components/RestaurantFinder.jsx
import React, { useState } from 'react';
import { Search } from 'lucide-react';

const RestaurantFinder = () => {
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchRestaurants = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // For demonstration, using mock data
      const mockResults = [
        {
          id: 1,
          name: "Halal Delight",
          vicinity: "123 Main St",
          rating: 4.5,
          isOpen: true
        },
        {
          id: 2,
          name: "Vegetarian Paradise",
          vicinity: "456 Oak Ave",
          rating: 4.2,
          isOpen: true
        }
      ];
      
      setResults(mockResults);
    } catch (err) {
      setError('Failed to fetch restaurants. Please try again.');
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

      {/* Map placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Map will appear here</p>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((restaurant) => (
                <div key={restaurant.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold mb-2">{restaurant.name}</h3>
                  <p className="text-gray-600 mb-2">{restaurant.vicinity}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">★</span>
                    <span>{restaurant.rating}</span>
                  </div>
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      restaurant.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {restaurant.isOpen ? 'Open' : 'Closed'}
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