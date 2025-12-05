import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./RestaurantAdminLayout";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController,
} from "chart.js";
import { Utensils, ClipboardList, CheckCircle, Clock } from "lucide-react";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController
);

type Restaurant = {
  _id: string;
  name: string;
};

type MenuItem = {
  _id: string;
  name: string;
  category: string;
};

type Order = {
  _id: string;
  status: "confirmed" | "pending" | string;
  createdAt: string;
};

const RestaurantAnalytics = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found in localStorage");
          return;
        }

        const restaurantRes = await axios.get(`${restaurantUrl}/api/restaurants/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const restaurantData: Restaurant = restaurantRes.data[0];
        setRestaurant(restaurantData);

        const menuItemsRes = await axios.get(
          `${restaurantUrl}/api/restaurants/my/menu-items`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMenuItems(menuItemsRes.data);

        const ordersRes = await axios.get(
          `${orderUrl}/api/orders/restaurant/${restaurantData._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(ordersRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Aggregations
  const menuItemsByCategory = menuItems.reduce(
    (acc: Record<string, number>, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    {}
  );

  const confirmedOrders = orders.filter((order) => order.status === "Confirmed").length;
  const pendingOrders = orders.filter((order) => order.status === "Pending").length;
  const waitingForPickup = orders.filter((order) => order.status === "Waiting for Pickup").length;

  const ordersByMonth = orders.reduce((acc: Record<string, number>, order) => {
    const month = order.createdAt?.slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  // Chart Data
  const menuCategoryData = {
    labels: Object.keys(menuItemsByCategory),
    datasets: [
      {
        label: "Menu Items by Category",
        data: Object.values(menuItemsByCategory),
        backgroundColor: ["#6366f1", "#22c55e", "#f97316", "#3b82f6", "#eab308"],
      },
    ],
  };

  const ordersOverTimeData = {
    labels: Object.keys(ordersByMonth),
    datasets: [
      {
        label: "Orders Over Time",
        data: Object.values(ordersByMonth),
        backgroundColor: "#10b981",
        borderRadius: 6,
        barThickness: 80,
      },
    ],
  };

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter']">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
          Restaurant Analytics
        </h1>

        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading data...</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div className="p-6 bg-white dark:bg-neutral-800 shadow rounded-xl flex items-center gap-4">
                <Utensils className="text-indigo-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Menu Items</p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {menuItems.length}
                  </h3>
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-neutral-800 shadow rounded-xl flex items-center gap-4">
                <ClipboardList className="text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {orders.length}
                  </h3>
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-neutral-800 shadow rounded-xl flex items-center gap-4">
                <CheckCircle className="text-green-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Confirmed Orders</p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {confirmedOrders}
                  </h3>
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-neutral-800 shadow rounded-xl flex items-center gap-4">
                <Clock className="text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Orders</p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {pendingOrders}
                  </h3>
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-neutral-800 shadow rounded-xl flex items-center gap-4">
                <Clock className="text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for Pickup</p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {waitingForPickup}
                  </h3>
                </div>
              </div>
            </div>

            {/* Graphs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  Menu Items by Category
                </h2>
                <Doughnut data={menuCategoryData} />
              </div>

              <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  Orders Over Time
                </h2>
                <Bar data={ordersOverTimeData} height={140} />
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default RestaurantAnalytics;
