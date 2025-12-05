import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./RestaurantAdminLayout";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

interface Restaurant {
  _id: string;
  name: string;
}

interface OrderItem {
  name: string;
  quantity: number;
}

interface Order {
  _id: string;
  userId: string;
  customerName: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

const RestaurantOrders = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchOrders = async (restaurantId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${orderUrl}/api/orders/restaurant/${restaurantId}`
      );
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchRestaurant();
    };
    init();
  }, []);

  useEffect(() => {
    if (restaurant?._id) {
      fetchOrders(restaurant._id);
    }
  }, [restaurant]);

  const toggleOrderStatus = async (orderId: string, currentStatus: string) => {
    try {
      let newStatus = "";
  
      if (currentStatus === "Pending") newStatus = "Confirmed";
      else if (currentStatus === "Confirmed") newStatus = "Preparing";
      else if (currentStatus === "Preparing") newStatus = "Waiting for Pickup";
      else return; // No further action if already Waiting for Pickup
  
      const token = localStorage.getItem("token");
  
      // 1. Update the Order Status first
      await axios.put(
        `${orderUrl}/api/orders/${orderId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      // 2. Update local UI
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );
  
      // 3. IF newStatus === "Waiting for Pickup", THEN call DeliveryService assign
      if (newStatus === "Waiting for Pickup") {
        try {
          // Find the order we just updated (to get customerId, restaurantId)
          const order = orders.find((o) => o._id === orderId);
          console.log("Order to assign:", order);
          if (!order) {
            console.error("Order not found in local state");
            return;
          }
  
          // Assuming you have restaurant _id stored in restaurant state
          const response = await axios.post(
            `${deliveryUrl}/api/delivery/assign`,
            {
              orderId: order._id,
              customerId: order.userId || "",  
              restaurantId: restaurant?._id || "",
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
  
          console.log("Driver assigned successfully:", response.data);
        } catch (assignError) {
          console.error("Failed to assign driver:", assignError);
        }
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  };
  
  const generateReport = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(40, 40, 100);
    doc.setFont("helvetica", "bold");
    doc.text("Order Summary Report", doc.internal.pageSize.getWidth() / 2, 20, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Restaurant Name:", 14, 32);
    doc.text("Address:", 14, 40);
    doc.text("Date:", 14, 48);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`${restaurant?.name || "N/A"}`, 55, 32);
    doc.text(`${(restaurant as any)?.address || "N/A"}`, 55, 40);
    doc.text(new Date().toLocaleDateString(), 55, 48);

    const tableData = orders.flatMap((order) =>
      order.items.map((item) => [
        order._id.slice(-6),
        item.name,
        item.quantity,
        `$${order.totalAmount.toFixed(2)}`,
        order.paymentStatus,
        new Date(order.createdAt).toLocaleDateString(),
        order.status,
      ])
    );

    autoTable(doc, {
      startY: 60,
      head: [
        ["Order ID", "Items", "Quantity", "Total", "Payment", "Date", "Status"],
      ],
      body: tableData,
      styles: {
        fontSize: 10,
        textColor: [60, 60, 60],
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [93, 156, 236],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255],
      },
      margin: { top: 60 },
    });

    doc.save("Order_Summary_Report.pdf");
  };

  if (loading) return <div className="p-6">Loading orders...</div>;

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter'] text-gray-800 dark:text-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-4xl font-extrabold">Customer Orders</h1>
          <button
            onClick={generateReport}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-semibold shadow"
          >
            Generate Report
          </button>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Order ID</th>
                <th className="px-6 py-3 text-left">Items</th>
                <th className="px-6 py-3 text-left">Quantity</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Payment Status</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {orders.map((order) => (
                <tr
                  key={order._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4">{order._id.slice(-6)}</td>
                  <td className="px-6 py-4">
                    {order.items.map((item, index) => (
                      <div key={index}>{item.name}</div>
                    ))}
                  </td>
                  <td className="px-6 py-4">
                    {order.items.map((item, index) => (
                      <div key={index}>{item.quantity}</div>
                    ))}
                  </td>
                  <td className="px-6 py-4">${order.totalAmount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        order.paymentStatus === "Paid"
                          ? "bg-green-200 text-green-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-wrap gap-2"
                    >
                      <span
                        className={`inline-block px-4 py-1 rounded-full text-xs font-bold ${
                          order.status === "Pending"
                            ? "bg-red-100 text-red-700"
                            : order.status === "Confirmed"
                            ? "bg-yellow-100 text-yellow-700"
                            : order.status === "Preparing"
                            ? "bg-blue-100 text-blue-700"
                            : order.status === "Waiting for Pickup"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status}
                      </span>

                      {order.status !== "Waiting for Pickup" && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleOrderStatus(order._id, order.status)}
                          disabled={order.paymentStatus !== "Paid"}
                          className={`px-4 py-1 rounded-full text-xs font-semibold transition
                            ${
                              order.paymentStatus !== "Paid"
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-indigo-500 hover:bg-indigo-600 text-white"
                            }`}
                        >
                          {order.paymentStatus !== "Paid"
                            ? "Waiting Payment"
                            : "Next Step"}
                        </motion.button>
                      )}
                    </motion.div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && (
            <p className="p-6 text-center text-gray-500 dark:text-gray-400">
              No orders found.
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default RestaurantOrders;
