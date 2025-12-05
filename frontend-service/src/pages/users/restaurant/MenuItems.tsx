import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./RestaurantAdminLayout";
import { Pencil, Trash2, PlusCircle, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

const MySwal = withReactContent(Swal);

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image?: string;
}

interface Restaurant {
  _id: string;
  name: string;
  address: string;
  image?: string;
  available: boolean;
}

const MenuItems = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchRestaurant = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${restaurantUrl}/api/restaurants/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRestaurant(response.data[0]);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${restaurantUrl}/api/restaurants/my/menu-items`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMenuItems(response.data);
      setFilteredItems(response.data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurant();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    const filtered = menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !filterCategory || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
    setFilteredItems(filtered);
  }, [search, filterCategory, menuItems]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleCategoryFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCategory(e.target.value);
  };

  const categories = Array.from(
    new Set(menuItems.map((item) => item.category))
  );

  const handleDelete = async (id: string) => {
    const confirm = await MySwal.fire({
      title: "Are you sure?",
      text: "This item will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e3342f",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${restaurantUrl}/api/restaurants/my/menu-items/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(menuItems.filter((item) => item._id !== id));
        Swal.fire("Deleted!", "Menu item has been deleted.", "success");
      } catch (err) {
        console.error("Error deleting item:", err);
        Swal.fire("Error", "Could not delete item.", "error");
      }
    }
  };

  if (loading) return <div className="p-6">Loading menu items...</div>;

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter'] text-gray-800 dark:text-gray-100">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <Link
            to="/restaurant-create-menu-item"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full text-sm font-semibold shadow"
          >
            <PlusCircle size={18} />
            Create Menu Item
          </Link>

          <div className="flex gap-3 items-center w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search
                className="absolute left-3 top-3 text-gray-400 dark:text-gray-500"
                size={18}
              />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full shadow-sm w-full"
              />
            </div>

            <select
              value={filterCategory}
              onChange={handleCategoryFilter}
              className="pl-3 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full shadow-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Image</th>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredItems.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4">
                    {item.image ? (
                      <img
                        src={`${restaurantUrl}/uploads/${item.image}`}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded" />
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold">{item.name}</td>
                  <td className="px-6 py-4">{item.category}</td>
                  <td className="px-6 py-4">{item.description}</td>
                  <td className="px-6 py-4">${item.price}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-3">
                      <button
                        onClick={() => navigate(`/restaurant-update-menu-item/${item._id}`)}
                        className="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-6">
                    No menu items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MenuItems;
