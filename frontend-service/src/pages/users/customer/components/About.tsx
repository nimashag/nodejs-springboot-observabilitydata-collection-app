import React from 'react';
import Title from '../components/Title';
import aboutusimg from '../../../../assets/aboutimg.jpg';
import NewsLetter from './NewsLetter';
import Navbar from '../../../../components/Navbar';
import Footer from '../../../../components/Footer';

const About: React.FC = () => {
  return (
    <>
    <Navbar />
    <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]'>
      <div className="text-2xl pt-8">
        <h2 className="text-4xl font-bold">Welcome to HungerJet – Fast, Fresh, Delivered</h2>
      </div>

      <div className="my-10 flex flex-col md:flex-row gap-16">
        <img className="w-[600px]" src={aboutusimg} alt="" />
        <div className="flex flex-col justify-center gap-6 md:w-2/4 text-gray-600">
          <p>
            Welcome to HungerJet, your ultimate destination for fast, fresh, and flavorful food delivery.
            We're dedicated to connecting you with the best restaurants in town, delivering delicious meals straight to your door.
            Born in the heart of Colombo, HungerJet is committed to making your dining experience easy, reliable, and satisfying.
          </p>

          <p>
            At HungerJet, we believe that great food should be just a few clicks away.
            Whether you're craving comfort food, international cuisine, or healthy options, we partner with top-rated local restaurants
            to bring a world of flavors to your fingertips. Quality, speed, and customer satisfaction drive everything we do.
          </p>

          <b className="text-gray-800">Our Mission</b>

          <p>
            Our mission at HungerJet is simple: to make food delivery faster, fresher, and more delightful than ever.
            We are committed to offering a wide variety of meals, exceptional service, and seamless ordering experiences.
            From your first tap to your final bite, we aim to bring happiness to your table.
          </p>

          <p>
            We focus on delivering meals hot and fresh, ensuring that every order is handled with care and delivered on time.
            HungerJet is here to fuel your day, satisfy your cravings, and make every meal special — because you deserve nothing but the best.
          </p>
        </div>
      </div>

      <div className="text-2xl py-4">
        <Title text1={'WHY'} text2={' CHOOSE US'} />
      </div>

      <div className="flex flex-col md:flex-row text-sm mb-20">
        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b className="text-2xl">Freshness Guaranteed:</b>
          <p className="text-gray-600">
            At HungerJet, freshness is at the core of our promise.
            We work closely with trusted restaurant partners to ensure that every meal is prepared fresh and delivered hot.
            Taste the difference with every bite and enjoy meals that feel homemade, every time.
          </p>
        </div>

        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b className="text-2xl">Seamless Ordering:</b>
          <p className="text-gray-600">
            Ordering with HungerJet is as easy as it gets. Our platform is designed for convenience, offering fast browsing,
            real-time tracking, and easy checkout options. Enjoy a hassle-free experience whether you're using our app or website.
          </p>
        </div>

        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b className="text-2xl">Outstanding Customer Support:</b>
          <p className="text-gray-600">
            Customer satisfaction is at the heart of everything we do. Our support team is available 24/7 to assist you with any questions,
            order updates, or concerns. We’re here to ensure your HungerJet experience is always smooth, enjoyable, and delicious.
          </p>
        </div>
      </div>

      <NewsLetter />
    </div>
    <Footer />
    </>
  );
};

export default About;
