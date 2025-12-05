import React from 'react'
import welcomeImg from '../../../../assets/welcomeimg.jpg'
import { Link } from "react-router-dom";
import { motion } from 'framer-motion';

const Hero : React.FC = () => {
  return (
    <div className='mt-12 flex flex-col sm:flex-row border border-gray-400'>

        {/* Hero Left Side */}
        <div className='w-full sm:w-1/2 flex items-center justify-center py-10 sm:py-0'>
            <div className='text-[#414141]'>
                <div className='flex items-center gap-2'>
                    <p className='w-8 md:w-11 h-[2px] bg-[#414141]'></p>
                    <p className='font-medium text-sm md:text-base'>Delicious Flavors, Delivered Fresh</p>
                </div>
                <h1 className='prata-regular text-3xl sm:py-3 lg:text-5xl leading-relaxed'>Fresh Picks</h1>
                <div className='flex items-center gap-2'>
                    <p className='font-semibold text-sm md:text-base'>Order Now</p>
                    <p className='w-8 md:w-11 h-[1px] bg-[#414141]'></p>
                </div>
                <div className='mt-4'>
                    <br/>
                    <Link to="/restaurants">
                    <motion.button
                        className="relative overflow-hidden px-5 py-2 font-semibold rounded bg-black text-white border-2 border-black transition-all duration-300 group mb-8 cursor-pointer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            >
                            <span className="absolute inset-0 bg-white transition-transform transform translate-y-full group-hover:translate-y-0 duration-300"></span>
                            <span className="relative z-10 transition-colors duration-300 group-hover:text-black">
                        Explore
                        </span>
                    </motion.button>
                    </Link>
                </div>
            </div>
        </div>

        {/* Hero Right Side*/}
        <img src={welcomeImg} className='w-full sm:w-1/2' alt="" />
    </div>
  )
}

export default Hero