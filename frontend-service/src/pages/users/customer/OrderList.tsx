import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../../../components/Navbar"; // adjust path if needed
import { useNavigate } from "react-router-dom";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  restaurantId: string;
  items: OrderItem[];
  status: string;
  totalAmount: number;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
}

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!token) {
          setError("Token missing.");
          return;
        }

        const res = await axios.get(`${orderUrl}/api/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setOrders(res.data);
      } catch (err) {
        console.error("Failed to fetch orders", err);
        setError("Failed to load orders. Try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-50 text-green-800 border-green-200";
      case "Cancelled":
        return "bg-red-50 text-red-800 border-red-200";
      case "Pending":
        return "bg-yellow-50 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-800 border-gray-200";
    }
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Generate a short order ID for display
  const getShortOrderId = (id: string) => {
    return id.substring(id.length - 6).toUpperCase();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-gray-600">Loading orders...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-red-600">{error}</div>
        </div>
      </>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <div className="text-gray-600 mb-4">No orders found</div>
          <button 
            onClick={() => navigate('/menu')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Browse Menu
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Orders</h1>
          <p className="text-gray-500 text-sm">Manage and track your recent orders</p>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-medium text-gray-900">Order #{getShortOrderId(order._id)}</h2>
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-900">${order.totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">Restaurant ID: {order.restaurantId}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.quantity} × {item.name}
                        </span>
                        <span className="text-gray-900 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Delivery Address</h3>
                  <p className="text-sm text-gray-600">
                    {order.deliveryAddress?.street}, {order.deliveryAddress?.city},{" "}
                    {order.deliveryAddress?.state} {order.deliveryAddress?.zipCode},{" "}
                    {order.deliveryAddress?.country}
                  </p>
                </div>
                
                {order.status === "Pending" && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => navigate(`/order/${order._id}`)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Track Order
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default OrderList;