import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../../components/Navbar";
import Swal from "sweetalert2";
import { 
  Package, MapPin, FileText, CreditCard, 
  Edit, CheckCircle, XCircle, AlertTriangle,
  Clock, ShoppingBag, Truck, DollarSign
} from "lucide-react";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

const Order: React.FC = () => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  const [editingInstructions, setEditingInstructions] = useState(false);
  const [newInstructions, setNewInstructions] = useState("");
  const [updatingAddress, setUpdatingAddress] = useState(false);
  const [updatingInstructions, setUpdatingInstructions] = useState(false);

  const orderId = localStorage.getItem("latestOrderId");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!orderId || !token) {
          setError("Order ID or Token missing.");
          return;
        }

        const res = await axios.get(
          `${orderUrl}/api/orders/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setOrder(res.data);
      } catch (err) {
        console.error("Failed to fetch order", err);
        setError("Failed to load order. Try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]);

  const handleUpdateAddress = async () => {
    try {
      setUpdatingAddress(true);
      const res = await axios.patch(
        `${orderUrl}/api/orders/${orderId}/delivery-address`,
        { deliveryAddress: newAddress },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(res.data);
      setEditingAddress(false);
      Swal.fire({
        icon: 'success',
        title: 'Address Updated',
        text: 'Your delivery address has been successfully updated.',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error("Failed to update address", err);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update delivery address. Please try again.',
      });
    } finally {
      setUpdatingAddress(false);
    }
  };

  const handleUpdateInstructions = async () => {
    try {
      setUpdatingInstructions(true);
      const res = await axios.patch(
        `${orderUrl}/api/orders/${orderId}/special-instructions`,
        { specialInstructions: newInstructions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(res.data);
      setEditingInstructions(false);
      Swal.fire({
        icon: 'success',
        title: 'Instructions Updated',
        text: 'Your special instructions have been successfully updated.',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error("Failed to update instructions", err);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update special instructions. Please try again.',
      });
    } finally {
      setUpdatingInstructions(false);
    }
  };

  const handleCancelOrder = async () => {
    const confirmation = await Swal.fire({
      title: "Cancel Your Order?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Cancel Order",
      cancelButtonText: "Keep Order",
      reverseButtons: true
    });

    if (confirmation.isConfirmed) {
      try {
        await axios.delete(`${orderUrl}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        Swal.fire({
          icon: "success",
          title: "Order Cancelled",
          text: "Your order has been cancelled successfully.",
          showConfirmButton: false,
          timer: 2000
        });

        setOrder(null);
        navigate("/restaurants");
      } catch (err) {
        console.error("Failed to cancel order", err);
        Swal.fire({
          icon: "error",
          title: "Cancellation Failed",
          text: "We couldn't cancel your order. Please try again or contact support.",
        });
      }
    }
  };

  const handlePayment = async () => {
  try {
    if (!orderId || !token) return;

    // ✅ Fetch order from backend
    const orderRes = await axios.get(`${orderUrl}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const order = orderRes.data;

    // ✅ Create Payment Intent
    const res = await axios.post(
      `${orderUrl}/api/orders/create-payment-intent`,
      {
        totalAmount: order.totalAmount,
        orderId: order._id,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { clientSecret } = res.data;

    // Store for fallback
    localStorage.setItem('clientSecret', clientSecret);
    localStorage.setItem('latestOrderId', order._id);

    // ✅ Navigate with full order object
    navigate('/payment', { state: { clientSecret, order } });

  } catch (error) {
    console.error("Failed to create payment intent", error);
    Swal.fire({
      icon: "error",
      title: "Payment Processing Error",
      text: "We couldn't process your payment request. Please try again.",
    });
  }
};

  
  // Function to render order status badge
  const renderStatusBadge = (status: string) => {
    let bgColor = "bg-gray-100";
    let textColor = "text-gray-800";
    let icon = <Clock size={16} className="mr-1" />;
    
    switch(status?.toLowerCase()) {
      case "pending":
        bgColor = "bg-yellow-100";
        textColor = "text-yellow-800";
        icon = <Clock size={16} className="mr-1" />;
        break;
      case "confirmed":
        bgColor = "bg-blue-100";
        textColor = "text-blue-800";
        icon = <CheckCircle size={16} className="mr-1" />;
        break;
      case "preparing":
        bgColor = "bg-purple-100";
        textColor = "text-purple-800";
        icon = <ShoppingBag size={16} className="mr-1" />;
        break;
      case "out for delivery":
        bgColor = "bg-indigo-100";
        textColor = "text-indigo-800";
        icon = <Truck size={16} className="mr-1" />;
        break;
      case "delivered":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        icon = <CheckCircle size={16} className="mr-1" />;
        break;
      case "cancelled":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        icon = <XCircle size={16} className="mr-1" />;
        break;
      default:
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
        {icon}
        {status}
      </span>
    );
  };

  // Function to render payment status badge
  const renderPaymentBadge = (paymentStatus: string) => {
    let bgColor = "bg-gray-100";
    let textColor = "text-gray-800";
    let icon = <Clock size={16} className="mr-1" />;
    
    switch(paymentStatus?.toLowerCase()) {
      case "pending":
        bgColor = "bg-yellow-100";
        textColor = "text-yellow-800";
        icon = <Clock size={16} className="mr-1" />;
        break;
      case "paid":
      case "completed":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        icon = <CheckCircle size={16} className="mr-1" />;
        break;
      case "failed":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        icon = <AlertTriangle size={16} className="mr-1" />;
        break;
      default:
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
        {icon}
        {paymentStatus || "Pending"}
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading your order details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="max-w-lg mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-600 mb-3">
            <AlertTriangle size={20} className="mr-2" />
            <h2 className="text-lg font-semibold">Error Loading Order</h2>
          </div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => navigate('/restaurants')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Return to Restaurants
          </button>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="max-w-lg mx-auto mt-10 p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <Package size={40} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Order Found</h2>
          <p className="text-gray-500 mb-6">We couldn't find any order details.</p>
          <button 
            onClick={() => navigate('/restaurants')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Browse Restaurants
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Package className="text-blue-600 mr-3" size={24} />
            <h1 className="text-2xl font-semibold text-gray-800">
              Order Details
            </h1>
          </div>
          {renderStatusBadge(order.status)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-800">
                  Order Information
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-600">Order ID</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {order._id}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-600">Order Date</span>
                    <span className="text-gray-800">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 pb-3 border-b border-gray-100 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${order.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>$3.99</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (8%)</span>
                      <span>${(order.totalAmount * 0.08).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-base font-semibold text-gray-800">
                      <span>Total Amount</span>
                      <span>
                        $
                        {(
                          order.totalAmount +
                          3.99 +
                          order.totalAmount * 0.08
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <MapPin size={18} className="text-gray-700 mr-2" />
                  <h2 className="text-lg font-medium text-gray-800">
                    Delivery Address
                  </h2>
                </div>
                {!editingAddress && (
                  <button
                    onClick={() => {
                      setEditingAddress(true);
                      setNewAddress(order.deliveryAddress);
                    }}
                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </button>
                )}
              </div>
              <div className="p-6">
                {!editingAddress ? (
                  <div className="space-y-1">
                    <p className="text-gray-800">
                      {order.deliveryAddress?.street}
                    </p>
                    <p className="text-gray-800">
                      {order.deliveryAddress?.city},{" "}
                      {order.deliveryAddress?.state}{" "}
                      {order.deliveryAddress?.zipCode}
                    </p>
                    <p className="text-gray-800">
                      {order.deliveryAddress?.country}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Street Address
                      </label>
                      <input
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Street"
                        value={newAddress.street}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            street: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          City
                        </label>
                        <input
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="City"
                          value={newAddress.city}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              city: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          State
                        </label>
                        <input
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="State"
                          value={newAddress.state}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              state: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Zip Code
                        </label>
                        <input
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Zip Code"
                          value={newAddress.zipCode}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              zipCode: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Country
                        </label>
                        <input
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Country"
                          value={newAddress.country}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              country: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={handleUpdateAddress}
                        disabled={updatingAddress}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-70"
                      >
                        {updatingAddress ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          "Save Address"
                        )}
                      </button>
                      <button
                        onClick={() => setEditingAddress(false)}
                        disabled={updatingAddress}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <FileText size={18} className="text-gray-700 mr-2" />
                  <h2 className="text-lg font-medium text-gray-800">
                    Special Instructions
                  </h2>
                </div>
                {!editingInstructions && (
                  <button
                    onClick={() => {
                      setEditingInstructions(true);
                      setNewInstructions(order.specialInstructions || "");
                    }}
                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </button>
                )}
              </div>
              <div className="p-6">
                {!editingInstructions ? (
                  <p className="text-gray-700">
                    {order.specialInstructions ||
                      "No special instructions provided."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
                      placeholder="Enter any special delivery instructions..."
                      value={newInstructions}
                      onChange={(e) => setNewInstructions(e.target.value)}
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={handleUpdateInstructions}
                        disabled={updatingInstructions}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-70"
                      >
                        {updatingInstructions ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          "Save Instructions"
                        )}
                      </button>
                      <button
                        onClick={() => setEditingInstructions(false)}
                        disabled={updatingInstructions}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary & Payment Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Payment Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center">
                  <CreditCard size={18} className="text-gray-700 mr-2" />
                  <h2 className="text-lg font-medium text-gray-800">
                    Payment Information
                  </h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-600">Payment Status</span>
                    {renderPaymentBadge(order.paymentStatus)}
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-medium text-gray-800">
                      {order.paymentMethod || "Not selected"}
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                      <div className="flex items-start">
                        <DollarSign
                          size={18}
                          className="text-blue-600 mr-2 mt-0.5"
                        />
                        <div>
                          <p className="text-blue-800 font-medium">
                            Total to Pay
                          </p>
                          <p className="text-2xl font-bold text-blue-900">
                             ${(order.totalAmount + 3.99 + order.totalAmount * 0.08).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {order.paymentStatus?.toLowerCase() !== "paid" && (
                      <button
                        onClick={handlePayment}
                        className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                      >
                        <CreditCard size={18} className="mr-2" />
                        Proceed to Pay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-800">
                  Order Actions
                </h2>
              </div>
              <div className="p-6">
                <button
                  onClick={handleCancelOrder}
                  className="w-full flex items-center justify-center px-4 py-3 bg-white border border-red-500 text-red-600 rounded-md hover:bg-red-50 transition-colors font-medium"
                >
                  <XCircle size={18} className="mr-2" />
                  Cancel Order
                </button>

                <div className="mt-4 text-xs text-gray-500">
                  <p>
                    You can cancel your order if it hasn't been confirmed by the
                    restaurant yet. Once the restaurant confirms your order,
                    cancellation may not be possible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Order;