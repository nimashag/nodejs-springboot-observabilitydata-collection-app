import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "../../../contexts/CartContext";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

type MenuItem = {
  _id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
};

type Restaurant = {
  available: boolean;
};

const RestaurantMenu: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  // randomly assign best sellers
  const [bestSellers, setBestSellers] = useState<string[]>([]);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const response = await axios.get(`${restaurantUrl}/api/restaurants/${restaurantId}`);
        setRestaurant(response.data);
      } catch (error) {
        console.error("Error fetching restaurant:", error);
      }
    };

    const fetchMenuItems = async () => {
      try {
        const response = await axios.get(`${restaurantUrl}/api/restaurants/${restaurantId}/menu-items`);
        const items: MenuItem[] = response.data;
        setMenuItems(items);
        setFilteredItems(items);

        const uniqueCategories = Array.from(new Set(items.map((item) => item.category)));
        setCategories(uniqueCategories);

        const randomBests = items.sort(() => 0.5 - Math.random()).slice(0, Math.min(3, items.length)).map((i) => i._id);
        setBestSellers(randomBests);

      } catch (error) {
        console.error("Error fetching menu items:", error);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchRestaurant();
      fetchMenuItems();
    }
  }, [restaurantId]);

  useEffect(() => {
    filterMenuItems();
  }, [searchTerm, selectedCategories, menuItems, sortOrder]);

  const filterMenuItems = () => {
    let filtered = [...menuItems];

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((item) =>
        selectedCategories.includes(item.category)
      );
    }

    if (sortOrder === "asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else {
      filtered.sort((a, b) => b.price - a.price);
    }

    setFilteredItems(filtered);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleAddToCart = (item: MenuItem) => {
    const quantity = quantities[item._id] || 1;
    const cartItem = {
      menuItemId: item._id,
      name: item.name,
      price: item.price,
      quantity: quantity,
    };
    const existingCart = JSON.parse(localStorage.getItem("cart") || "[]");

  const updatedCart = [...existingCart, item];
  localStorage.setItem("cart", JSON.stringify(updatedCart));
  window.dispatchEvent(new Event("storage"));
    addToCart(cartItem);
    alert(`🛒 ${item.name} (x${quantity}) added to cart!`);
  };

  const handleQuantityChange = (itemId: string, amount: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(1, (prev[itemId] || 1) + amount),
    }));
  };

  return (
    <>
      <Navbar />
      <div className="px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-800">🍽️ Our Menu</h1>
            <p className="text-gray-500 mt-3">Taste the best dishes crafted with love!</p>
            {restaurant?.available === false && (
              <p className="mt-3 text-sm bg-red-100 text-red-600 inline-block px-4 py-1 rounded-full font-medium animate-pulse">
                ⚠️ Restaurant Currently Closed
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Sidebar */}
            <div className="lg:w-1/4 w-full">
              <div className="border border-gray-200 rounded-2xl p-6 shadow-sm bg-white">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Filter & Sort</h2>

                <input
                  type="text"
                  placeholder="🔍 Search menu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full mb-6 px-4 py-2 rounded-full border border-gray-300 focus:ring-amber-500 focus:border-amber-500 outline-none shadow-sm"
                />

                <div className="flex flex-col gap-4 mb-6">
                  {categories.map((category) => (
                    <label key={category} className="flex items-center space-x-3 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="accent-amber-500"
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>

                <select
                  className="w-full rounded-full border border-gray-300 p-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                >
                  <option value="asc">Price: Low to High</option>
                  <option value="desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Menu Grid */}
            <div className="lg:w-3/4 w-full">
              {loading ? (
                <p className="text-center text-gray-500 text-lg">Loading menu...</p>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <img src="https://cdni.iconscout.com/illustration/premium/thumb/no-data-available-5301483-4442623.png" alt="No Data" className="h-48 mb-4" />
                  <p>No menu items match your search ☹️</p>
                </div>
              ) : (
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredItems.map((item) => (
                    <div
                      key={item._id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col relative"
                    >
                      {bestSellers.includes(item._id) && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                          🔥 Best Seller
                        </div>
                      )}

                      <img
                        src={`${restaurantUrl}/uploads/${item.image}`}
                        alt={item.name}
                        className="w-full h-48 object-cover"
                      />

                      <div className="p-6 flex flex-col flex-grow">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">{item.name}</h2>
                        <p className="text-gray-500 text-sm mb-4 flex-grow">{item.description}</p>

                        <div className="flex justify-between items-center mt-auto mb-4">
                          <span className="text-xs text-gray-400">{item.category}</span>
                          <span className="text-lg font-bold text-amber-700">${item.price.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          {/* Quantity controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuantityChange(item._id, -1)}
                              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                            >-</button>
                            <span className="w-6 text-center">{quantities[item._id] || 1}</span>
                            <button
                              onClick={() => handleQuantityChange(item._id, 1)}
                              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                            >+</button>
                          </div>

                          {/* Add to cart button */}
                          <button
                            onClick={() => handleAddToCart(item)}
                            disabled={restaurant?.available === false}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-medium ${
                              restaurant?.available === false ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            <FaShoppingCart /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
};

export default RestaurantMenu;
