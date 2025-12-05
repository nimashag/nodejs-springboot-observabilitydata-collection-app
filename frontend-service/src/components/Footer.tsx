import React from 'react';
import logoicon from '../assets/Logo.png'; 
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const Footer: React.FC = () => {
  return (
    <footer className="px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw] mt-12 border-t">
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 text-sm px-6">
        
        {/* Logo and About Section */}
        <div>
          <img src={logoicon} className="mb-5 w-32" alt="HungerJet Logo" />
          <p className="w-full md:w-2/3 text-gray-600">
            HungerJet brings you the most delicious meals from your favorite restaurants, fast and fresh!
            Whether you're craving a cheesy pizza, a spicy biryani, or a sweet treat — we've got it delivered, hot and happy!
          </p>
        </div>

        {/* Company Links */}
        <div>
          <p className="text-xl font-medium mb-5">Company</p>
          <ul className="flex flex-col gap-1 text-gray-600">
            <li><a href="/" className="hover:text-orange-600">Home</a></li>
            <li><a href="/about" className="hover:text-orange-600">About Us</a></li>
            <li><a href="/faqs" className="hover:text-orange-600">FAQs</a></li>
            <li><a href="/contactus" className="hover:text-orange-600">Contact Us</a></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <p className="text-xl font-medium mb-5">Get In Touch</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li className="flex items-center space-x-2">
              <FaPhone className="text-orange-600" />
              <span>+94-423-987-83</span>
            </li>
            <li className="flex items-center space-x-2">
              <FaEnvelope className="text-orange-600" />
              <span>support@hungerjet.com</span>
            </li>
            <li className="flex items-start space-x-2">
              <FaMapMarkerAlt className="text-orange-600 mt-1" />
              <span>No. 45, High Level Road, Nugegoda, Colombo 10250, Sri Lanka</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Divider */}
      <div className="mt-8 mb-4 border-t border-gray-200 pt-5 text-center font-semibold text-sm text-gray-600">
        © 2025 HungerJet - All Rights Reserved.
      </div>
    </footer>
  );
};

export default Footer;
