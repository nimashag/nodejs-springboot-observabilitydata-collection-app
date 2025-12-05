import React from 'react';
import BannerCard from './BannerCard';
import Title from '../components/Title';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Banner: React.FC = () => {
  return (
    <div>
      <div className="flex w-full flex-col md:flex-row justify-between items-center gap-12">
        {/* Left Side */}
        <div className="md:w-1/2 space-y-8 h-full py-40">
          <h2 className="text-4xl font-bold leading-snug text-black">
            What Our Customers Are Saying!
          </h2>
          <Title text1={'CUSTOMER'} text2={' FEEDBACK'} />
          <p className="md:w-23/24">
            At HungerJet, your satisfaction drives us. 
            Our "Customer Feedback" section showcases real stories and experiences from our valued food lovers. 
            From speedy deliveries to mouth-watering meals, hear firsthand how HungerJet brings flavors to your doorstep. 
            Trust their words, explore their favorites, and let their experiences guide your next order!
          </p>
          <div>
            <Link to="/reviews" className="mt-5 block">
              <motion.button
                        className="relative overflow-hidden px-5 py-2 font-semibold rounded bg-black text-white border-2 border-black transition-all duration-300 group mb-8 cursor-pointer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            >
                      <span className="absolute inset-0 bg-white transition-transform transform translate-y-full group-hover:translate-y-0 duration-300"></span>
                      <span className="relative z-10 transition-colors duration-300 group-hover:text-black">
                    See Customer Stories
                </span>
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Right Side */}
        <div>
          <BannerCard />
        </div>
      </div>
    </div>
  );
};

export default Banner;
