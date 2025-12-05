import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

type Restaurant = {
  _id: string;
  name: string;
  address?: string;
  image?: string;
  available: boolean;
};

const RestaurantList: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await axios.get(`${restaurantUrl}/api/restaurants`);
        const fetched = response.data;

        // Sort immediately when fetching: OPEN first, CLOSED after
        const sorted = fetched.sort((a: Restaurant, b: Restaurant) => {
          return (b.available ? 1 : 0) - (a.available ? 1 : 0);
        });

        setRestaurants(sorted);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    let filtered = restaurants;
    if (searchQuery !== "") {
      filtered = restaurants.filter((restaurant) =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort again after search to keep OPEN first
    const sorted = filtered.sort((a, b) => {
      return (b.available ? 1 : 0) - (a.available ? 1 : 0);
    });

    setFilteredRestaurants(sorted);
  }, [searchQuery, restaurants]);

  if (loading) {
    return (
      <div className="text-center text-gray-700 mt-10 text-lg font-medium">
        Loading restaurants...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Title */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
              Featured Restaurants 🍽️
            </h1>
            <p className="text-gray-500 text-sm">Savor the best flavors around you.</p>
          </div>

          {/* Search Bar */}
          <div className="flex justify-center mb-10">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Search your favorite restaurant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 pl-12 rounded-full border border-gray-300 bg-white/60 backdrop-blur-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <FaSearch className="absolute left-4 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          {/* Restaurant Cards */}
          {filteredRestaurants.length === 0 ? (
            <p className="text-center text-gray-500">No restaurants found.</p>
          ) : (
            <motion.div 
              className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {filteredRestaurants.map((restaurant) => (
                <motion.div
                  key={restaurant._id}
                  whileHover={{ scale: 1.03 }}
                  className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  <img
                    src={`${restaurantUrl}/uploads/${restaurant.image}`}
                    alt={restaurant.name}
                    className="w-full h-48 object-cover"
                  />

                  <div className="p-6 flex flex-col flex-grow">
                    {/* Name and Status */}
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold text-gray-800">
                        {restaurant.name}
                      </h2>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          restaurant.available
                            ? "bg-green-100 text-green-600 animate-pulse"
                            : "bg-red-100 text-red-500 animate-pulse"
                        }`}
                      >
                        {restaurant.available ? "OPEN" : "CLOSED"}
                      </span>
                    </div>

                    {/* Address */}
                    <p className="text-gray-500 text-sm flex-grow">
                      {restaurant.address || "Address not available"}
                    </p>

                    {/* View Menu Button */}
                    <div className="pt-5 flex justify-end">
                      <a
                        href={`/restaurants/${restaurant._id}`}
                        onClick={() => localStorage.setItem('selectedRestaurantId', restaurant._id)}
                        className="inline-block text-white bg-amber-500 hover:bg-amber-600 px-5 py-2 rounded-full text-sm font-semibold transition-all"
                      >
                        View Menu →
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default RestaurantList;
