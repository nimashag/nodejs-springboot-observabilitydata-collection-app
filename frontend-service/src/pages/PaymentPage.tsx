import React from 'react';
import { useLocation } from 'react-router-dom';
import StripePayment from '../components/StripePayment';
import Navbar from "../components/Navbar";

const PaymentPage: React.FC = () => {
  const location = useLocation();
  const { clientSecret } = location.state || {};

  if (!clientSecret) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-700 font-medium">
        No Payment Information Available.
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Secure Payment</h2>
          <p className="text-gray-500 text-sm mb-8 text-center">
            Please enter your payment details to complete the transaction.
          </p>
          <StripePayment clientSecret={clientSecret} />
        </div>
      </div>
    </>
  );
};

export default PaymentPage;