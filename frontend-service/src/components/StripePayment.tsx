import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from './CheckoutForm';

const stripePromise = loadStripe('pk_test_51RI8Xy4PPi9egRr2BanqZv12aSu1tfCjywj1gbAzSOFvQj4DMUrQBZHY6gWpM6B2nDZgsAyu4wgdumPeBGrnNUwu00IVGTjSKk');

interface StripePaymentProps {
  clientSecret: string;
}

const StripePayment: React.FC<StripePaymentProps> = ({ clientSecret }) => {
  const appearance = { theme: 'stripe' as 'stripe' | 'flat' | 'night' | undefined };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="p-8">
      {clientSecret && stripePromise && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm clientSecret={clientSecret} />
        </Elements>
      )}
    </div>
  );
};

export default StripePayment;
