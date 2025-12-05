import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

const DriverProfileRegister = () => {
  const [pickupLocation, setPickupLocation] = useState('');
  const [deliveryLocations, setDeliveryLocations] = useState('');
  const [vehicleRegNumber, setVehicleRegNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const navigate = useNavigate();
  // const DRIVER_API = 'http://localhost:3004'; // Driver service

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found. Please login again.');
      navigate('/login/delivery');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('pickupLocation', pickupLocation);
      formData.append('deliveryLocations', deliveryLocations); 
      formData.append('vehicleRegNumber', vehicleRegNumber);
      formData.append('mobileNumber', mobileNumber);
      formData.append('isAvailable', isAvailable ? 'true' : 'false');

      if (profileImage) {
        formData.append('profileImage', profileImage);
      }

      await axios.post(`${deliveryUrl}/api/drivers/register`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Driver profile created successfully!');
      navigate('/driver/dashboard');
    } catch (error: any) {
      console.error('Error creating driver profile:', error);
      alert(error.response?.data?.message || 'Failed to create driver profile.');
    }
  };

  return (
    <div className="flex h-screen w-full font-sans">
      {/* Left Panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-10">
        <div className="max-w-md w-full">
          <h2 className="text-4xl font-bold mb-2 font-playfair text-gray-900 text-center">
            Complete Your Driver Profile
          </h2>
          <p className="text-gray-500 mb-6 text-center">
            Tell us more about yourself to start delivering with HungerJet!
          </p>

          <form className="space-y-4" onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
            <div>
              <input
                type="text"
                placeholder="Pickup Location (eg: Malabe)"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Delivery Locations (comma separated)"
                value={deliveryLocations}
                onChange={(e) => setDeliveryLocations(e.target.value)}
                className="w-full px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Vehicle Registration Number (eg: ABC-1234)"
                value={vehicleRegNumber}
                onChange={(e) => setVehicleRegNumber(e.target.value)}
                className="w-full px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Mobile Number (eg: 0712345678)"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="h-5 w-5 text-green-500"
              />
              <span className="text-gray-700 text-sm">Available for delivery</span>
            </div>

            <div className="relative w-full mt-2">
              <button
                type="submit"
                className="w-full relative bg-black text-white py-3 rounded-full overflow-hidden z-10 hover:bg-green-600 transition"
              >
                Save Profile
              </button>
            </div>
          </form>

          <p className="text-center text-sm mt-6">
            Not ready yet?{' '}
            <span
              onClick={() => navigate('/driver/dashboard')}
              className="text-green-600 hover:underline cursor-pointer"
            >
              Skip for now
            </span>
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden md:flex w-1/2 justify-center items-center px-10 py-10">
        <img
          src="https://images.unsplash.com/photo-1618221738595-c967d20bb27c"
          alt="Driver Register"
          className="rounded-2xl w-full h-full object-cover shadow-md"
        />
      </div>
    </div>
  );
};

export default DriverProfileRegister;
