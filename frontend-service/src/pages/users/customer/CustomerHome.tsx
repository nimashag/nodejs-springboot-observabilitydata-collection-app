import React from 'react'
import Hero from './components/Hero'
import OurPolicy from './components/OurPolicy'
import NewsLetter from './components/NewsLetter'
import Complaints from './components/Complaints'
import Banner from './banner/Banner'
import ShopBy from './components/ShopBy'
import HowToOrder from './components/HowToOrder'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'

const Home : React.FC = () => {
  const token = localStorage.getItem("token");
  return (
    <>
    <Navbar />
    <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]'>
      <Hero />
      <ShopBy />
      <HowToOrder />
      <Banner />
      <Complaints />
      <OurPolicy />
      <NewsLetter />
    </div>
    <Footer />
    </>
  )
}

export default Home;