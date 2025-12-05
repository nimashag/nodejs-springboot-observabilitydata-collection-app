import DriverLayout from "./DriverLayout";
import { useState, useEffect } from "react";
import axios from "axios";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

const DriverProfile = () => {
  const [pickupLocation, setPickupLocation] = useState("");
  const [deliveryLocations, setDeliveryLocations] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);

  // const API_BASE = "http://localhost:3004";

  useEffect(() => {
    const fetchDriverProfile = async () => {
      const token = localStorage.getItem("token");
      console.log("Driver Token:", token);

      if (!token) {
        console.error("No token found!");
        return;
      }

      try {
        const res = await axios.get(`${deliveryUrl}/api/drivers/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPickupLocation(res.data.pickupLocation);
        setDeliveryLocations(res.data.deliveryLocations.join(", "));
        setIsAvailable(res.data.isAvailable);
      } catch (error) {
        console.error("Error fetching driver profile", error);
      }
    };

    fetchDriverProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    console.log("Driver Token:", token);

    if (!token) {
      console.error("No token found!");
      return;
    }

    try {
      const deliveryArray = deliveryLocations
        .split(",")
        .map((loc) => loc.trim());
      await axios.patch(
        `${deliveryUrl}/api/drivers/me`,
        {
          pickupLocation,
          deliveryLocations: deliveryArray,
          isAvailable,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile", error);
      alert("Failed to update profile.");
    }
  };

  return (
    <DriverLayout>
      <h2 className="text-2xl font-bold mb-4">Driver Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Pickup Location</label>
          <input
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label>Delivery Locations (comma separated)</label>
          <input
            value={deliveryLocations}
            onChange={(e) => setDeliveryLocations(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label>Availability</label>
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="ml-2"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white p-2 rounded">
          Save
        </button>
      </form>
    </DriverLayout>
  );
};

export default DriverProfile;
