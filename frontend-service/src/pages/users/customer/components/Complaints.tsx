import React from 'react';
import { Link } from 'react-router-dom';
import complaintpic from '../../../../assets/complaintimg2.png';
import { motion } from 'framer-motion';

const Complaints: React.FC = () => {
  return (
    <div className="w-full mt-8 py-12 bg-white px-4 lg:px-20 relative">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img src={complaintpic} alt="background" className="w-full h-full object-cover" />
      </div>

      {/* Overlay */}
      <div className="relative z-10 bg-black bg-opacity-60 p-8 md:p-12 lg:p-12 text-white">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="md:w-1/2">
            <h2 className="text-4xl font-bold mb-6 leading-snug">
              Facing Any Issues With Your Order?
            </h2>
            <p className="text-gray-200">
              Whether it’s a late delivery, missing item, or app issue — we’re here to help you out!
              Our HungerJet support team works around the clock to resolve any concerns you face while ordering.
              Your satisfaction is our #1 priority. Don't hesitate to reach out and get fast assistance for a smooth delivery experience.
            </p>
            <Link to="/faqs" className="mt-5 block">
              <motion.button
                className="relative overflow-hidden px-5 py-2 font-semibold rounded bg-black text-white border-2 border-black transition-all duration-300 group mb-8 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="absolute inset-0 bg-white transition-transform transform translate-y-full group-hover:translate-y-0 duration-300"></span>
                <span className="relative z-10 transition-colors duration-300 group-hover:text-black">
                  Visit FAQs
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Complaints;
