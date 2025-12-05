import React from 'react';

const NewsLetter: React.FC = () => {
  const onSubmitHandler = (event: React.FormEvent) => {
    event.preventDefault();
  };

  return (
    <div className="mt-4 text-center">
      <p className="text-2xl font-medium text-gray-800">Subscribe Now To Get Delicious Updates</p>
      <p className="text-gray-400 mt-3">
        Stay ahead of the cravings by subscribing to our newsletter.<br />
        Be the first to know about new restaurants, exclusive food deals, 
        and mouth-watering menu updates tailored just for you.<br />
        Join our HungerJet community and never miss a tasty offer!
      </p>

      <form onSubmit={onSubmitHandler} className="w-full sm:w-1/2 flex items-center gap-3 mx-auto my-6 border pl-3">
        <input 
          className="w-full sm:flex-1 outline-none" 
          type="email" 
          placeholder="Enter Your Email Here!" 
          required 
        />
        <button 
          type="submit" 
          className="bg-black text-white text-xs px-10 py-4"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
};

export default NewsLetter;
