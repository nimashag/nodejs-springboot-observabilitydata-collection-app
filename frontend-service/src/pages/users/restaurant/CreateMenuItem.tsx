import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./RestaurantAdminLayout";
import Swal from "sweetalert2";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

const CreateMenuItem = () => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: 0,
    imageFile: undefined as File | undefined,
  });
  const [errors, setErrors] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    imageFile: "",
  });
  
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {
      name: form.name.trim() ? "" : "Name is required.",
      category: form.category.trim() ? "" : "Category is required.",
      description: form.description.trim() ? "" : "Description is required.",
      price: form.price > 0 ? "" : "Price must be greater than 0.",
      imageFile: form.imageFile ? "" : "Image is required.",
    };
  
    setErrors(newErrors);
  
    // Return true only if there are no errors
    return Object.values(newErrors).every((err) => err === "");
  };
  

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${restaurantUrl}/api/restaurants/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setRestaurantId(data[0]?._id || null);
      } catch (error) {
        console.error("Error fetching restaurant:", error);
      }
    };
    fetchRestaurant();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setForm({ ...form, imageFile: e.target.files[0] });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Swal.fire("Validation Error", "Please fill all fields and upload an image.", "warning");
      return;
    }

    if (!form.name || !form.category || !form.description || !form.price || !form.imageFile) {
      Swal.fire("Validation Error", "Please fill all fields and upload an image.", "warning");
      return;
    }

    if (!restaurantId) {
      Swal.fire("Error", "Restaurant not found.", "error");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("category", form.category);
    formData.append("price", form.price.toString());
    formData.append("image", form.imageFile);

    try {
      await fetch(`${restaurantUrl}/api/restaurants/${restaurantId}/menu-items`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      Swal.fire("Success!", "Menu item created successfully!", "success").then(() => {
        navigate("/restaurant-menu");
      });
    } catch (error) {
      console.error("Error creating item:", error);
      Swal.fire("Error", "Failed to create menu item.", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter'] text-gray-800 dark:text-gray-100">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">Create New Menu Item</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price ($)</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Upload Image</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.imageFile}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => navigate("/restaurant-menu")}
                className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-800 text-white text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
              >
                Create Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CreateMenuItem;
