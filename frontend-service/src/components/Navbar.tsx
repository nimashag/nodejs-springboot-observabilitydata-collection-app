import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBars, FaTimes } from "react-icons/fa";
import logoicon1 from "../assets/Logo.png";
import searchicon from "../assets/search_icon.png";
import usericon from "../assets/user_icon.png";
import carticon from "../assets/carticon.png";
import { useCart } from '../contexts/CartContext';

const Navbar: React.FC = () => {
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isUserDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [cartCount, setCartCount] = useState<number>(0);
  const { cartItemCount } = useCart();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLogged(!!token);

    const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCartCount(cart.length);
  };

  updateCartCount();

  // Listen to storage changes (in case items added on a different page/tab)
  window.addEventListener("storage", updateCartCount);

  return () => {
    window.removeEventListener("storage", updateCartCount);
  };
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const toggleUserDropdown = () => {
    setUserDropdownOpen((prev) => !prev);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsLogged(false);
    location.reload();
  };

  return (
    <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw] flex items-center justify-between font-medium'>
    
      
      {/* Logo */}
      <motion.img
        src={logoicon1}
        className="w-28 cursor-pointer"
        alt="HungerJet Logo"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300 }}
      />

      {/* Desktop Nav Links */}
      <ul className="hidden sm:flex gap-8 md:gap-10 text-sm text-gray-700">
        {[
          { to: "/", text: "Home" },
          { to: "/restaurants", text: "Restaurants" },
          { to: "/about", text: "About Us" },
          { to: "/contactus", text: "Contact Us" },
          { to: "/reviews", text: "Reviews" },
          { to: "/faqs", text: "FAQs" },
        ].map((item, index) => (
          <motion.li key={index} whileHover={{ scale: 1.1, y: -5 }}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 ${
                  isActive ? "text-orange-600" : "text-gray-600"
                } hover:text-orange-500`
              }
            >
              {item.text}
            </NavLink>
          </motion.li>
        ))}
      </ul>

      {/* Right Icons */}
      <div className="flex items-center gap-6">

        <motion.img
          src={searchicon}
          className="w-5 cursor-pointer"
          alt="Search Icon"
          whileHover={{ scale: 1.2 }}
        />

        {/* User Icon */}
        <div className="relative">
          <motion.img
            src={usericon}
            className="w-5 cursor-pointer"
            alt="User Icon"
            whileHover={{ scale: 1.2 }}
            onClick={toggleUserDropdown}
          />
          {isUserDropdownOpen && (
            <motion.div
              className="absolute right-0 mt-2 bg-gray-100 rounded-md shadow-md py-3 px-4 w-40"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {!isLogged ? (
                <div className="flex flex-col gap-2">
                  <Link to="/register/customer" className="hover:text-black">Signup</Link>
                  <Link to="/login/customer" className="hover:text-black">Login</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/profile" className="hover:text-black">My Profile</Link>
                  <Link to="/my-orders" className="hover:text-black">My Orders</Link>
                  <p className="cursor-pointer hover:text-black" onClick={logout}>Logout</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Cart Icon */}
        <div className="relative">
          <Link to="/cart">
            <motion.img
              src={carticon}
              className="w-6 cursor-pointer"
              alt="Cart Icon"
              whileHover={{ scale: 1.2 }}
            />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>

        {/* Hamburger Icon */}
        <motion.button
          onClick={toggleMobileMenu}
          whileHover={{ scale: 1.2 }}
          className="sm:hidden text-gray-700"
        >
          {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </motion.button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-lg sm:hidden py-6 z-40">
          <ul className="flex flex-col items-center gap-6 text-gray-700">
            {[
              { to: "/", text: "Home" },
              { to: "/restaurants", text: "Restaurants" },
              { to: "/about", text: "About Us" },
              { to: "/contactus", text: "Contact Us" },
              { to: "/reviews", text: "Reviews" },
              { to: "/faqs", text: "FAQs" },
            ].map((item, index) => (
              <li key={index}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `hover:text-orange-500 ${
                      isActive ? "text-orange-600 font-semibold" : ""
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.text}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};

export default Navbar;
