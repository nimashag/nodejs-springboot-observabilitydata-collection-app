import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import NewsLetter from './NewsLetter';
import Title from './Title';
import Navbar from '../../../../components/Navbar';
import Footer from '../../../../components/Footer';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const ViewFAQ: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const faqsPerPage = 8;

  const faqs: FAQ[] = [
    { id: 1, question: 'How can I track my order?', answer: 'You can track your order from your profile under "My Orders".', category: 'Order' },
    { id: 2, question: 'What are the delivery hours?', answer: 'We deliver between 9 AM and 11 PM daily.', category: 'Delivery' },
    { id: 3, question: 'Can I cancel my order after placing it?', answer: 'You can cancel within 5 minutes after placing the order.', category: 'Order' },
    { id: 4, question: 'Is there a minimum order value?', answer: 'No, we deliver any order, big or small!', category: 'General' },
    { id: 5, question: 'What payment methods are accepted?', answer: 'We accept Visa, MasterCard, and Cash on Delivery.', category: 'Payment' },
    { id: 6, question: 'How do I change my delivery address?', answer: 'Update your address in your profile settings before ordering.', category: 'Account' },
    { id: 7, question: 'Do you offer scheduled deliveries?', answer: 'Yes, you can choose your preferred delivery time at checkout.', category: 'Delivery' },
    { id: 8, question: 'How do I report a wrong order?', answer: 'Please contact our support within 2 hours of delivery.', category: 'Support' },
    { id: 9, question: 'Can I place a bulk order?', answer: 'Yes, for large orders, please contact our hotline.', category: 'General' },
    { id: 10, question: 'Is contactless delivery available?', answer: 'Yes, just select "Contactless Delivery" at checkout.', category: 'Delivery' },
    { id: 11, question: 'How are refunds processed?', answer: 'Refunds are processed to the original payment method within 5–7 business days.', category: 'Payment' },
    { id: 12, question: 'Can I request extra cutlery?', answer: 'Yes, you can request extra cutlery in the "Notes" section while ordering.', category: 'General' },
    { id: 13, question: 'Do you deliver outside Colombo?', answer: 'Currently, we deliver within Colombo and suburbs.', category: 'Delivery' },
    { id: 14, question: 'How to apply promo codes?', answer: 'Enter your promo code at checkout to avail discounts.', category: 'Offers' },
    { id: 15, question: 'How secure is my payment?', answer: 'We use encrypted, PCI-compliant payment systems.', category: 'Payment' },
    { id: 16, question: 'How can I contact customer support?', answer: 'Reach us via our 24/7 hotline or support@hungerjet.com.', category: 'Support' },
  ];

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const filteredFaqs = faqs.filter(faq =>
    (faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedCategory === '' || faq.category === selectedCategory)
  );

  const indexOfLastFAQ = currentPage * faqsPerPage;
  const indexOfFirstFAQ = indexOfLastFAQ - faqsPerPage;
  const currentFaqs = filteredFaqs.slice(indexOfFirstFAQ, indexOfLastFAQ);
  const totalPages = Math.ceil(filteredFaqs.length / faqsPerPage);

  const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);
  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <>
    <Navbar />
    <div className="px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw] mt-8">
        
      <div className="flex justify-between items-start mb-8">
        <h2 className="text-4xl font-bold">Frequently Asked Questions</h2>
      </div>

      {/* Category and Search */}
      <div className="mt-12 flex justify-between items-start">
        <div className="text-2xl py-4">
          <Title text1="QUESTIONS" text2=" USERS ASKED" />
        </div>
        <div className="flex items-center space-x-4">
          <select
            className="h-10 pl-4 pr-8 border border-gray-300 rounded-full"
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category, index) => (
              <option key={index} value={category}>{category}</option>
            ))}
          </select>

          <div className="relative w-80">
            <input
              type="text"
              placeholder="Search FAQs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10 pr-10 rounded-full shadow-sm w-full border border-gray-300"
            />
            <div className="absolute top-0 left-0 mt-2.5 ml-4 text-gray-500">
              <FaSearch size="20px" />
            </div>
          </div>
        </div>
      </div>

      {/* FAQs Grid */}
      <div className="grid gap-5 my-12 lg:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 grid-cols-1">
        {currentFaqs.map(faq => (
          <div key={faq.id} className="h-auto bg-white rounded-lg border shadow-md p-6 hover:shadow-xl transition">
            <h5 className="text-xl font-bold text-gray-900 mb-2">{faq.question}</h5>
            <p className="text-gray-600 mb-2"><strong>Category:</strong> {faq.category}</p>
            <p className="text-gray-700"><strong>Answer:</strong> {faq.answer}</p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center mt-6">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className={`mx-2 px-4 py-2 rounded ${currentPage === 1 ? 'bg-gray-300 text-gray-500' : 'bg-black text-white'}`}
        >
          Previous
        </button>
        <span className="mx-2 text-lg">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`mx-2 px-4 py-2 rounded ${currentPage === totalPages ? 'bg-gray-300 text-gray-500' : 'bg-black text-white'}`}
        >
          Next
        </button>
      </div>

      <br /><br />
      <NewsLetter />
    </div>
    <Footer />
    </>
  );
};

export default ViewFAQ;
