import React from 'react';
import contactimg from '../../../../assets/contactusimg3.jpg';
import NewsLetter from './NewsLetter';
import { Link } from 'react-router-dom';
import Navbar from '../../../../components/Navbar';
import Footer from '../../../../components/Footer';
import { motion } from 'framer-motion';

const ContactUs: React.FC = () => {
  return (
    <>
    <Navbar />
    <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]'>
      <div className="text-center text-2xl pt-10">
        <h2 className="text-4xl font-bold">Contact Us</h2>
      </div>

      <div className="my-10 flex flex-col justify-center md:flex-row gap-10 mb-28">
        <img className="md:max-w-[420px]" src={contactimg} alt="Contact Us" />
        <div className="flex flex-col justify-center items-start gap-6">
          <p className="font-semibold text-xl text-gray-600">Our Office</p>
          <p className="text-gray-500">
            Location: <br />
            No. 45, High Level Road, <br />
            Nugegoda, Colombo 10250, <br />
            Sri Lanka
          </p>
          <p className="text-gray-500">
            Tel: (+94)-423-987-83 <br />
            Email: support@hungerjet.com
          </p>
          <p className="font-semibold text-xl text-gray-600">Need Help?</p>
          <p className="text-gray-500">
            Facing any issues with your order or website experience? 
            <br />Find answers to your questions quickly!
          </p>
          <Link to="/faqs">
            <motion.button
                className="relative overflow-hidden px-5 py-2 font-semibold rounded bg-black text-white border-2 border-black transition-all duration-300 group mb-8 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                    <span className="absolute inset-0 bg-white transition-transform transform translate-y-full group-hover:translate-y-0 duration-300"></span>
                    <span className="relative z-10 transition-colors duration-300 group-hover:text-black">
                F Q As
                </span>
            </motion.button>
          </Link>
        </div>
      </div>

      <NewsLetter />
    </div>
    <Footer />
    </>
  );
};

export default ContactUs;
