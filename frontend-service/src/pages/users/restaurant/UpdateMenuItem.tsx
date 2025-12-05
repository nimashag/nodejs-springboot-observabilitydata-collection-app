import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "./RestaurantAdminLayout";
import Swal from "sweetalert2";
import { apiBase, restaurantUrl } from "../../../api";

const UpdateMenuItem = () => {
  const { id } = useParams<{ id: string }>(); // id = menuItem id
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: 0,
    imageFile: undefined as File | undefined,
    existingImage: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurantAndItem = async () => {
      try {
        const token = localStorage.getItem("token");

        // First fetch the restaurant to get restaurant ID
        const restaurantRes = await fetch(`${restaurantUrl}/api/restaurants/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const restaurantData = await restaurantRes.json();
        const resId = restaurantData[0]?._id;
        setRestaurantId(resId);

        // Then fetch the menu item
        const itemRes = await fetch(
          `${restaurantUrl}/api/restaurants/${resId}/menu-items/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const itemData = await itemRes.json();

        setForm({
          name: itemData.name,
          description: itemData.description,
          category: itemData.category,
          price: itemData.price,
          imageFile: undefined,
          existingImage: itemData.image,
        });

      } catch (error) {
        console.error("Error fetching menu item:", error);
      }
    };

    if (id) fetchRestaurantAndItem();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setForm({ ...form, imageFile: e.target.files[0] });
    }
  };

  const handleSubmit = async () => {
    let validationErrors = {
      name: "",
      description: "",
      category: "",
      price: "",
    };
    let isValid = true;
  
    if (!form.name.trim()) {
      validationErrors.name = "Name is required.";
      isValid = false;
    } else if (form.name.length < 2) {
      validationErrors.name = "Name must be at least 2 characters.";
      isValid = false;
    }
  
    if (!form.category.trim()) {
      validationErrors.category = "Category is required.";
      isValid = false;
    }
  
    if (!form.description.trim()) {
      validationErrors.description = "Description is required.";
      isValid = false;
    } else if (form.description.length < 10) {
      validationErrors.description = "Description must be at least 10 characters.";
      isValid = false;
    }
  
    if (form.price <= 0) {
      validationErrors.price = "Price must be greater than 0.";
      isValid = false;
    }
  
    setErrors(validationErrors);
  
    if (!isValid) {
      Swal.fire("Validation Error", "Please correct the highlighted fields.", "warning");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("category", form.category);
    formData.append("price", form.price.toString());

    if (form.imageFile) {
      formData.append("image", form.imageFile);
    }

    try {
      await fetch(`${restaurantUrl}/api/restaurants/${restaurantId}/menu-items/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      Swal.fire("Success!", "Menu item updated successfully!", "success").then(() => {
        navigate("/restaurant-menu");
      });
    } catch (error) {
      console.error("Error updating item:", error);
      Swal.fire("Error", "Failed to update menu item.", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter'] text-gray-800 dark:text-gray-100">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">Update Menu Item</h1>

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
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
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
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
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
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Upload New Image (Optional)</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full"
              />
              {form.existingImage && (
                <div className="mt-3">
                  <img
                    src={`${restaurantUrl}/uploads/${form.existingImage}`}
                    alt="Current"
                    className="w-24 h-24 object-cover rounded-md"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => navigate("/restaurant-menu")}
                className="px-5 py-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              >
                Update Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UpdateMenuItem;
