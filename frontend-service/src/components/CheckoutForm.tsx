import React, { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from "sweetalert2";
import { orderUrl } from '../api';

interface CheckoutFormProps {
  clientSecret: string;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { state } = useLocation();
  let order = state?.order;

  const token = localStorage.getItem('token');
  const orderId = localStorage.getItem('latestOrderId');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!clientSecret) {
      return;
    }
  }, [clientSecret]);

  if (!order) {
    const orderData = localStorage.getItem("latestOrderData");
    if (orderData) {
      try {
        order = JSON.parse(orderData);
      } catch (e) {
        console.error("Failed to parse order from localStorage", e);
      }
    }
  }

  if (!order) {
    return <p className="text-red-500">No order details available.</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-complete`,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        setMessage(result.error.message || 'An unexpected error occurred.');
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        await axios.patch(
          `${orderUrl}/api/orders/${orderId}/mark-paid`,
          {
            paymentMethod: 'Stripe',
            transactionId: result.paymentIntent.id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        await Swal.fire({
        icon: "success",
        title: "Payment Successful",
        text: "Your order has been placed successfully.",
        showConfirmButton: false,
        timer: 2000,
      });

        navigate('/restaurants');
      } else {
        setMessage('Payment processing. Please wait...');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setMessage('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deliveryFee = 3.99;
  const taxRate = 0.08;
  const subtotal = order.totalAmount;
  const tax = subtotal * taxRate;
  const finalTotal = subtotal + deliveryFee + tax;

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="order-2 md:order-1">
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h3>
      <div className="space-y-3">
        {order.items?.map((item: any, index: number) => (
          <div key={index} className="flex justify-between text-gray-700">
            <span>{item.name} x {item.quantity}</span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-gray-700 mt-2">
          <span>Delivery Fee</span>
          <span>${deliveryFee.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-gray-700 mt-2">
          <span>Tax (8%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between font-bold text-black mt-3 pt-3 border-t border-gray-200">
          <span>Total</span>
          <span>${finalTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
        </div>
        <div className="order-1 md:order-2">
          <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Payment Details</h3>
      
      <div className="mb-6">
        <PaymentElement />
      </div>

      {message && (
        <div className={`p-3 mb-4 rounded ${message.includes('successful') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay $${finalTotal.toFixed(2)}`}
      </button>
    </div>
        </div>
      </div>
    </form>
  );
};

export default CheckoutForm;