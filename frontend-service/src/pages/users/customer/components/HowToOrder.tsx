import React from 'react';
import chooseicon from '../../../../assets/chooseicon.png';
import checkouticon from '../../../../assets/checkouticon.png';
import delivericon from '../../../../assets/delivericon.png';

const HowToOrder: React.FC = () => {
  return (
    <div className="w-full py-20 text-center text-gray-700">

      
      <h2 className="text-4xl font-bold leading-snug text-black mb-10">
        How To Order
      </h2>

      {/* Steps */}
      <div className="flex flex-col sm:flex-row justify-around gap-12 sm:gap-2 text-xs sm:text-sm md:text-base">

        {/* Choose Your Food */}
        <div>
          <img src={chooseicon} className="w-12 m-auto mb-5" alt="Choose Food" />
          <p className="font-semibold">1. Choose Your Favorite</p>
          <p>Browse through our menu and pick your delicious meals.</p>
        </div>

        {/* Checkout Securely */}
        <div>
          <img src={checkouticon} className="w-12 m-auto mb-5" alt="Checkout" />
          <p className="font-semibold">2. Checkout Securely</p>
          <p>Proceed to checkout with easy and secure payment options.</p>
        </div>

        {/* Fast Delivery */}
        <div>
          <img src={delivericon} className="w-12 m-auto mb-5" alt="Delivery" />
          <p className="font-semibold">3. Get It Delivered</p>
          <p>Relax while we deliver your food hot and fresh to your door!</p>
        </div>

      </div>
      
    </div>
  );
};

export default HowToOrder;
