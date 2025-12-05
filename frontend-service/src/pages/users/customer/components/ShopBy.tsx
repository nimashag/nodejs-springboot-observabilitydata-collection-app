import React from 'react';
import { motion } from 'framer-motion';
import Homepics from '../animations/Homepics';

const ShopBy: React.FC = () => {
  return (
    <div style={{ textAlign: 'center' }}>
      <br />
      <h2 className="text-4xl font-bold leading-snug text-black mt-8">
        Explore Delicious Categories
      </h2>
      <br />
      <p>
        Satisfy every craving with our specially curated meals.
        <br />
        Whether you're in the mood for juicy burgers, fresh sushi, spicy noodles, or sweet desserts — we deliver it all hot and fresh!
      </p>

      <div className="mt-8">
        <Homepics />
      </div>

      <div className="social-media-footer mt-8">
        <p className="text-xl">
          Browse our menu and get your favorites delivered to your doorstep.
        </p>
        <br />
        <motion.a href="/restaurants">
          <motion.button
            className="relative overflow-hidden px-5 py-2 font-semibold rounded bg-black text-white border-2 border-black transition-all duration-300 group mb-8 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  >
                <span className="absolute inset-0 bg-white transition-transform transform translate-y-full group-hover:translate-y-0 duration-300"></span>
                <span className="relative z-10 transition-colors duration-300 group-hover:text-black">
              Order Now
            </span>
          </motion.button>
        </motion.a>
      </div>
    </div>
  );
};

export default ShopBy;
