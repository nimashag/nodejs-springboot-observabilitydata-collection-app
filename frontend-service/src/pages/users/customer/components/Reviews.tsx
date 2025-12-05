import React, { useState } from 'react';
import { FaSearch, FaStar, FaRegStar } from 'react-icons/fa';
import NewsLetter from './NewsLetter';
import Title from './Title';
import Navbar from '../../../../components/Navbar';
import Footer from '../../../../components/Footer';
import { motion } from 'framer-motion';

interface Review {
  id: number;
  title: string;
  description: string;
  product_name: string;
  product_type: string;
  rating: number;
  images_path: string[];
}

const hardcodedReviews: Review[] = [
  { id: 1, title: "Best Pizza Ever", description: "Loved the crust and flavor!", product_name: "Pepperoni Pizza", product_type: "Food", rating: 5, images_path: [] },
  { id: 2, title: "Super Quick Delivery", description: "Arrived faster than expected!", product_name: "Chicken Biryani", product_type: "Food", rating: 4, images_path: [] },
  { id: 3, title: "Juicy Burger", description: "Perfectly cooked and juicy.", product_name: "Beef Burger", product_type: "Food", rating: 5, images_path: [] },
  { id: 4, title: "Fresh and Hot", description: "Piping hot when delivered.", product_name: "Veggie Pizza", product_type: "Food", rating: 4, images_path: [] },
  { id: 5, title: "Loved the Smoothie", description: "Refreshing and healthy.", product_name: "Mango Smoothie", product_type: "Drink", rating: 5, images_path: [] },
  { id: 6, title: "Fries were soggy", description: "Not crispy enough.", product_name: "French Fries", product_type: "Food", rating: 2, images_path: [] },
  { id: 7, title: "Amazing Tacos", description: "Tacos were fresh and tasty.", product_name: "Taco Platter", product_type: "Food", rating: 5, images_path: [] },
  { id: 8, title: "Too Spicy", description: "Was a bit too hot for me.", product_name: "Spicy Wings", product_type: "Food", rating: 3, images_path: [] },
  { id: 9, title: "Smooth Latte", description: "Perfect morning drink!", product_name: "Cafe Latte", product_type: "Drink", rating: 5, images_path: [] },
  { id: 10, title: "Late Delivery", description: "Food arrived cold.", product_name: "Pasta Alfredo", product_type: "Food", rating: 2, images_path: [] },
  { id: 11, title: "Fresh Salad", description: "Very refreshing salad bowl.", product_name: "Caesar Salad", product_type: "Food", rating: 5, images_path: [] },
  { id: 12, title: "Watery Soup", description: "Expected thicker consistency.", product_name: "Tomato Soup", product_type: "Food", rating: 3, images_path: [] },
  { id: 13, title: "Delicious Sandwich", description: "Loved the fillings!", product_name: "Club Sandwich", product_type: "Food", rating: 5, images_path: [] },
  { id: 14, title: "Coffee too bitter", description: "Needed more milk.", product_name: "Americano", product_type: "Drink", rating: 2, images_path: [] },
  { id: 15, title: "Best Cheesecake", description: "Perfect dessert.", product_name: "New York Cheesecake", product_type: "Dessert", rating: 5, images_path: [] },
  { id: 16, title: "Missing Items", description: "One item missing from the order.", product_name: "Combo Meal", product_type: "Food", rating: 2, images_path: [] },
  { id: 17, title: "Lovely Breakfast", description: "Great start to the day.", product_name: "Breakfast Platter", product_type: "Food", rating: 5, images_path: [] },
  { id: 18, title: "Bad Packaging", description: "Spilled inside the bag.", product_name: "Butter Chicken", product_type: "Food", rating: 2, images_path: [] },
  { id: 19, title: "Softest Donuts", description: "Melted in my mouth!", product_name: "Glazed Donuts", product_type: "Dessert", rating: 5, images_path: [] },
  { id: 20, title: "Icy Milkshake", description: "Refreshing chocolate shake.", product_name: "Chocolate Milkshake", product_type: "Drink", rating: 5, images_path: [] },
];

const MainReview: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 9;

  const filteredReviews = hardcodedReviews.filter(review => {
    const matchesSearch = review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = selectedRating ? review.rating === selectedRating : true;
    const matchesCategory = selectedCategory === "All" || review.product_type === selectedCategory;
    return matchesSearch && matchesRating && matchesCategory;
  });

  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);

  const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);
  const handlePreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const renderStars = (rating: number) => (
    [...Array(5)].map((_, i) => (
      i < rating
        ? <FaStar key={i} className="text-yellow-500" />
        : <FaRegStar key={i} className="text-yellow-500" />
    ))
  );

  return (
    <>
      <Navbar />
      <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]'>
        <div className='mt-12 px-4'>
          <div className='flex flex-col md:flex-row justify-between items-center mb-10 gap-4'>
            <div className='text-3xl font-extrabold text-gray-800 py-4 text-center md:text-left'>
              <Title text1={'CUSTOMER'} text2={' REVIEWS'} />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviews..."
                  className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-full shadow-sm focus:ring focus:ring-gray-400 transition"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              </div>

              {/* Filter by Rating */}
              <select
                onChange={(e) => setSelectedRating(e.target.value === "All" ? null : Number(e.target.value))}
                className="h-12 pl-4 pr-8 border border-gray-300 rounded-full shadow-sm focus:ring focus:ring-gray-400 transition"
              >
                <option value="All">All Ratings</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                <option value="3">⭐⭐⭐ (3 Stars)</option>
                <option value="2">⭐⭐ (2 Stars)</option>
              </select>

              {/* Filter by Category */}
              <select
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-12 pl-4 pr-8 border border-gray-300 rounded-full shadow-sm focus:ring focus:ring-gray-400 transition"
              >
                <option value="All">All Categories</option>
                <option value="Food">Food</option>
                <option value="Drink">Drink</option>
                <option value="Dessert">Dessert</option>
                <option value="Service">Service</option>
              </select>
            </div>
          </div>

          {/* Reviews */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {currentReviews.length > 0 ? (
              currentReviews.map(review => (
                <motion.div
                  key={review.id}
                  className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 hover:-translate-y-2 transform transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <h4 className="text-xl font-bold text-gray-800">{review.title}</h4>
                  <p className="text-gray-600 mt-2">{review.description}</p>
                  <h3 className="mt-4 font-semibold text-gray-900">Product: {review.product_name}</h3>
                  <p className="text-sm text-gray-600">Category: {review.product_type}</p>
                  <div className="flex items-center mt-3 space-x-1">
                    {renderStars(review.rating)}
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-gray-600 text-center text-lg col-span-3">No reviews found</p>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-2">
              <button onClick={handlePreviousPage} disabled={currentPage === 1} className="px-4 py-2 rounded border text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                Previous
              </button>
              {[...Array(totalPages)].map((_, idx) => (
                <button key={idx} onClick={() => handlePageChange(idx + 1)} className={`px-4 py-2 rounded border text-sm font-medium ${currentPage === idx + 1 ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                  {idx + 1}
                </button>
              ))}
              <button onClick={handleNextPage} disabled={currentPage === totalPages} className="px-4 py-2 rounded border text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                Next
              </button>
            </div>
          )}

          <div className='mt-10'>
            <NewsLetter />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default MainReview;
