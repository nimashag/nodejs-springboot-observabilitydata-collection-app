import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./RestaurantAdminLayout";
import { LuTrash2, LuPencil } from "react-icons/lu";
import {
  Utensils,
  ClipboardList,
  CheckCircle,
  Clock,
  Package,
} from "lucide-react";
import Swal from "sweetalert2";
import { restaurantUrl, orderUrl } from "../../../api";

interface Restaurant {
  _id: string;
  name: string;
  address: string;
  location: string;
  image?: string;
  available: boolean;
}

interface MenuItem {
  _id: string;
  name: string;
  createdAt: string;
  price: number; // ✅ added price field
  ordersCount?: number;
}

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  status: "Confirmed" | "Pending" | "Waiting for Pickup" | string;
  items: OrderItem[];
}

const AdminDashboard: React.FC = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restaurantRes = await axios.get(
          `${restaurantUrl}/api/restaurants/my`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const restaurantData = restaurantRes.data[0];
        setRestaurant(restaurantData);

        const menuRes = await axios.get(
          `${restaurantUrl}/api/restaurants/my/menu-items`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMenuItems(menuRes.data);

        const ordersRes = await axios.get(
          `${orderUrl}/api/orders/restaurant/${restaurantData._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setOrders(ordersRes.data);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchData();
  }, []);

  const handleDeleteRestaurant = async () => {
    if (!restaurant) return;

    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete your restaurant!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(
          `${restaurantUrl}/api/restaurants/${restaurant._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setRestaurant(null);
        Swal.fire("Deleted!", "Your restaurant has been deleted.", "success");
      } catch (err) {
        console.error("Delete failed:", err);
        Swal.fire("Error", "Failed to delete restaurant.", "error");
      }
    }
  };

  const confirmedOrders = orders.filter(
    (order) => order.status === "Confirmed"
  ).length;
  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;
  const waitingForPickup = orders.filter(
    (order) => order.status === "Waiting for Pickup"
  ).length;

  const menuItemOrdersCount = menuItems.map((item) => {
    let count = 0;
    orders.forEach((order) => {
      order.items.forEach((orderItem) => {
        if (orderItem.menuItemId === item._id) {
          count += orderItem.quantity; // important: add quantity
        }
      });
    });
    return { ...item, ordersCount: count };
  });

  const topOrderedItems = [...menuItemOrdersCount]
    .sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0))
    .slice(0, 5);

  const topRecentItems = [...menuItems]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const toggleStoreStatus = async (newStatus: boolean) => {
    if (!restaurant) return;
    try {
      await axios.put(
        `${restaurantUrl}/api/restaurants/${restaurant._id}`,
        { available: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRestaurant((prev) =>
        prev ? { ...prev, available: newStatus } : prev
      );
      Swal.fire(
        "Success!",
        `Store is now ${newStatus ? "Open" : "Closed"}.`,
        "success"
      );
    } catch (err) {
      console.error("Toggle status failed:", err);
      Swal.fire("Error", "Failed to update store status.", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter'] text-gray-800 dark:text-gray-100 w-full">
        {!restaurant ? (
          <div className="text-center mt-20">
            <h2 className="text-3xl font-bold mb-4">
              You haven't created a restaurant yet.
            </h2>
            <button
              onClick={() => navigate("/restaurant/create")}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-lg rounded-full font-semibold transition-all"
            >
              Create Restaurant
            </button>
          </div>
        ) : (
          <>
            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
              {[
                {
                  icon: <Utensils className="text-indigo-500" />,
                  label: "Total Menu Items",
                  value: menuItems.length,
                },
                {
                  icon: <ClipboardList className="text-blue-500" />,
                  label: "Total Orders",
                  value: orders.length,
                },
                {
                  icon: <CheckCircle className="text-green-500" />,
                  label: "Confirmed Orders",
                  value: confirmedOrders,
                },
                {
                  icon: <Clock className="text-yellow-500" />,
                  label: "Pending Orders",
                  value: pendingOrders,
                },
                {
                  icon: <Package className="text-orange-500" />,
                  label: "Waiting for Pickup",
                  value: waitingForPickup,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 bg-white dark:bg-neutral-800 rounded-xl shadow flex items-center gap-4 hover:scale-105 transition-all duration-300"
                >
                  {item.icon}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.label}
                    </p>
                    <h3 className="text-xl font-bold">{item.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Restaurant Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col md:flex-row gap-8 mb-10">
              {restaurant && restaurant.image && (
                <img
                  src={`${restaurantUrl}/uploads/${restaurant.image}`}
                  alt="Restaurant"
                  className="rounded-xl w-full md:w-1/2 object-cover h-72 shadow-md"
                />
              )}
              <div className="flex flex-col justify-between flex-1">
                <div>
                  <h2 className="text-3xl font-bold mb-4">
                    {restaurant?.name}
                  </h2>
                  <p className="text-lg font-semibold mb-2">
                    {restaurant?.address}
                  </p>
                  <p className="text-lg font-semibold mb-4">
                    {restaurant?.location}
                  </p>

                  {/* Store Status + Toggle */}
                  <div className="flex items-center gap-4 mt-4">
                    <span
                      className={`inline-block font-semibold px-4 py-2 rounded-full text-lg shadow-sm ${
                        restaurant?.available
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {restaurant?.available
                        ? "✅ Store Open"
                        : "❌ Store Closed"}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restaurant?.available}
                        onChange={(e) => toggleStoreStatus(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 relative transition-all duration-300">
                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() =>
                      navigate(`/restaurant/edit/${restaurant?._id}`)
                    }
                    className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-full font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteRestaurant}
                    className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Top 5 Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Top 5 Ordered */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-2xl font-bold mb-4">
                  Top 5 Most Ordered Items
                </h3>
                <ul className="space-y-3">
                  {topOrderedItems.map((item) => (
                    <li key={item._id} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-bold">
                        {item.ordersCount} orders
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recently Added (Name + Price) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-2xl font-bold mb-4">
                  Recently Added Items
                </h3>
                <ul className="space-y-3">
                  {topRecentItems.map((item) => (
                    <li key={item._id} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-bold">
                        ${item.price.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
