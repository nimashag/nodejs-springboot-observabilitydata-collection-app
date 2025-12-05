import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./RestaurantAdminLayout";
import axios from "axios";
import Swal from "sweetalert2";
import { restaurantUrl } from "../../../api";

const CreateRestaurant: React.FC = () => {
  const [form, setForm] = useState({
    name: "",
    address: "",
    location: "",
    image: null as File | null,
  });

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === "image" && files) {
      setForm((prev) => ({ ...prev, image: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.address.trim() || !form.location.trim()) {
      Swal.fire("Validation Error", "Please fill all required fields!", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("address", form.address);
    formData.append("location", form.location);
    if (form.image) {
      formData.append("image", form.image);
    }

    try {
      await axios.post(`${restaurantUrl}/api/restaurants`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      Swal.fire("Success!", "Restaurant created successfully!", "success");
      navigate("/restaurant-dash");
    } catch (err) {
      console.error("Create restaurant failed:", err);
      Swal.fire("Error", "Failed to create restaurant.", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter'] text-gray-800 dark:text-gray-100">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Create New Restaurant
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Restaurant Name</label>
              <input
                type="text"
                name="name"
                placeholder="Restaurant Name"
                value={form.name}
                onChange={handleInputChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                name="address"
                placeholder="Address"
                value={form.address}
                onChange={handleInputChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location (City)</label>
              <input
                type="text"
                name="location"
                placeholder="Location"
                value={form.location}
                onChange={handleInputChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Upload Image</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleInputChange}
                className="w-full text-sm text-gray-600 dark:text-gray-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => navigate("/restaurant-dash")}
                className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-800 text-white text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CreateRestaurant;
