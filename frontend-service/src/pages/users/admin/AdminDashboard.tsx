import { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import {
  Users,
  UtensilsCrossed,
  UserRoundPen,
  Truck,
  ShieldUser,
  ArrowUpRight
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { userUrl } from "../../../api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isApproved?: boolean;
  role: string;
  createdAt: string;
};

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${userUrl}/api/auth/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Separate roles
  const restaurantAdmins = users.filter((u) => u.role === "restaurantAdmin");
  const drivers = users.filter((u) => u.role === "deliveryPersonnel");
  const customers = users.filter((u) => u.role === "customer");
  const admins = users.filter((u) => u.role === "appAdmin");

  // Monthly Signup Stats
  const calculateMonthlySignups = (filteredUsers: User[]) => {
    return filteredUsers.reduce((acc, user) => {
      const month = user.createdAt?.slice(0, 7); // "YYYY-MM"
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const restaurantSignups = calculateMonthlySignups(restaurantAdmins);
  const driverSignups = calculateMonthlySignups(drivers);

  // Bar Chart Data
  const restaurantBarData = {
    labels: Object.keys(restaurantSignups),
    datasets: [{
      label: 'Restaurant Signups',
      data: Object.values(restaurantSignups),
      backgroundColor: '#22c55e',
      borderRadius: 6,
    }],
  };

  const driverBarData = {
    labels: Object.keys(driverSignups),
    datasets: [{
      label: 'Driver Signups',
      data: Object.values(driverSignups),
      backgroundColor: '#f97316',
      borderRadius: 6,
    }],
  };

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
      icon: <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-blue-100 dark:bg-blue-900"><Users className="text-blue-500 dark:text-blue-300" /></div>,
      color: 'text-blue-500 dark:text-blue-300',
    },
    {
      label: 'Total Customers',
      value: customers.length,
      icon: <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900"><UserRoundPen className="text-indigo-500 dark:text-indigo-300" /></div>,
      color: 'text-indigo-500 dark:text-indigo-300',
    },
    {
      label: 'Total Restaurants',
      value: restaurantAdmins.length,
      icon: <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-green-100 dark:bg-green-900"><UtensilsCrossed className="text-green-500 dark:text-green-300" /></div>,
      color: 'text-green-500 dark:text-green-300',
    },
    {
      label: 'Total Drivers',
      value: drivers.length,
      icon: <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-orange-100 dark:bg-orange-900"><Truck className="text-orange-500 dark:text-orange-300" /></div>,
      color: 'text-orange-500 dark:text-orange-300',
    },
    {
      label: 'Total Admins',
      value: admins.length,
      icon: <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-red-100 dark:bg-red-900"><ShieldUser className="text-red-500 dark:text-red-300" /></div>,
      color: 'text-red-500 dark:text-red-300',
    },
  ];

  const topRestaurantOwners = [...restaurantAdmins]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const topDrivers = [...drivers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <AdminLayout>
      <div className="p-6 font-inter text-gray-800 dark:text-gray-100 bg-white dark:bg-neutral-900 transition-all">
        <h1 className="text-4xl font-extrabold mb-8 tracking-tight">Dashboard Overview</h1>

        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {stats.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md text-center border border-neutral-200 dark:border-neutral-700 transition-all"
                >
                  <div className={`mx-auto mb-2 ${item.color}`}>{item.icon}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
                  <h3 className={`text-2xl font-bold ${item.color}`}>{item.value}</h3>
                </div>
              ))}
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md border border-neutral-200 dark:border-neutral-700">
                <h2 className="text-lg font-semibold mb-4">Top Restaurant Owners</h2>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {topRestaurantOwners.map((owner, i) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <div>
                        <h3 className="text-sm font-medium">{owner.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{owner.phone || "-"}</p>
                      </div>
                      <ArrowUpRight className="text-green-500 dark:text-green-300" size={18} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md border border-neutral-200 dark:border-neutral-700">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">Restaurant Signups Overview</h2>
                  <select className="text-xs border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-white">
                    <option>This Year</option>
                    <option>This Month</option>
                  </select>
                </div>
                <Bar data={restaurantBarData} height={120} />
              </div>
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md border border-neutral-200 dark:border-neutral-700">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">Driver Signups Overview</h2>
                  <select className="text-xs border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-white">
                    <option>This Year</option>
                    <option>This Month</option>
                  </select>
                </div>
                <Bar data={driverBarData} height={120} />
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-md border border-neutral-200 dark:border-neutral-700">
                <h2 className="text-lg font-semibold mb-4">Top Drivers</h2>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {topDrivers.map((driver, i) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <div>
                        <h3 className="text-sm font-medium">{driver.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{driver.phone || "-"}</p>
                      </div>
                      <ArrowUpRight className="text-green-500 dark:text-green-300" size={18} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
