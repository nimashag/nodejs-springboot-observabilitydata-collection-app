import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import gsap from "gsap";
import { userUrl } from "../../../api";

const RegisterDelivery = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    vehicleType: "",
    licenseNumber: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const liquidRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    let isValid = true;

    const requiredFields = [
      "name",
      "email",
      "password",
      "phone",
      "address",
      "vehicleType",
      "licenseNumber",
    ];

    requiredFields.forEach((field) => {
      if (!form[field as keyof typeof form].trim()) {
        tempErrors[field] = "This field is required";
        isValid = false;
      }
    });

    if (form.password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    if (!/\S+@\S+\.\S+/.test(form.email)) {
      tempErrors.email = "Invalid email address";
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await axios.post(`${userUrl}/api/auth/register`, {
        ...form,
        role: "deliveryPersonnel",
      });

      alert(res.data.message || "Registered successfully!");
      navigate("/login/delivery"); // Redirect to login after successful register
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  const handleMouseEnter = () => {
    gsap.to(liquidRef.current, {
      x: 0,
      duration: 0.5,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(liquidRef.current, {
      x: "-100%",
      duration: 0.5,
      ease: "power2.inOut",
    });
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-r from-green-100 via-white to-blue-200 font-sans">
      {/* Left Panel - Glassmorphism */}
      <div className="w-full md:w-1/2 flex justify-center items-center px-6">
        <div className="w-full max-w-md bg-white/30 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/40">
          <h2 className="text-4xl font-bold mb-2 font-playfair text-gray-900 text-center">
            Delivery Registration
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            Join HungerJet's delivery team and start earning!
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {[
              { name: "name", placeholder: "Full Name" },
              { name: "email", placeholder: "Email" },
              { name: "password", placeholder: "Password", type: "password" },
              { name: "phone", placeholder: "Phone Number" },
              { name: "address", placeholder: "Address" },
              { name: "vehicleType", placeholder: "Vehicle Type (e.g., Bike)" },
              { name: "licenseNumber", placeholder: "License Number" },
            ].map((field) => (
              <div key={field.name}>
                <input
                  type={field.type || "text"}
                  name={field.name}
                  placeholder={field.placeholder}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/70 border rounded-full focus:outline-none focus:ring-2 ${
                    errors[field.name]
                      ? "border-red-500"
                      : "focus:ring-green-500"
                  }`}
                />
                {errors[field.name] && (
                  <p className="text-red-500 text-sm mt-1">{errors[field.name]}</p>
                )}
              </div>
            ))}

            {/* Liquid Button */}
            <div className="relative w-full mt-2">
              <button
                type="submit"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="w-full relative bg-black text-white py-3 rounded-full overflow-hidden z-10"
              >
                <span className="relative z-20">Register</span>
                <div
                  ref={liquidRef}
                  className="absolute top-0 left-0 h-full w-full bg-green-500 rounded-full z-10"
                  style={{ transform: "translateX(-100%)" }}
                />
              </button>
            </div>
          </form>

          <p className="text-center text-sm mt-6">
            Already registered?{" "}
            <Link to="/login/delivery" className="text-green-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden md:flex w-1/2 justify-center items-center px-10 py-10">
        <img
          src="https://images.pexels.com/photos/4393668/pexels-photo-4393668.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
          alt="Delivery Registration"
          className="rounded-2xl w-full h-full object-cover shadow-md"
        />
      </div>
    </div>
  );
};

export default RegisterDelivery;
