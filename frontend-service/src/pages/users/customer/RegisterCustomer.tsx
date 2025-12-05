import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import gsap from "gsap";
import { userUrl } from "../../../api";

const RegisterCustomer = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
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

    if (!form.name.trim()) {
      tempErrors.name = "Name is required";
      isValid = false;
    }
    if (!form.email.trim()) {
      tempErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      tempErrors.email = "Invalid email address";
      isValid = false;
    }
    if (!form.password.trim()) {
      tempErrors.password = "Password is required";
      isValid = false;
    } else if (form.password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }
    if (!form.phone.trim()) {
      tempErrors.phone = "Phone is required";
      isValid = false;
    }
    if (!form.address.trim()) {
      tempErrors.address = "Address is required";
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
        role: "customer",
      });
      alert(res.data.message || "Registered successfully!");
      navigate("/login/customer");
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
      {/* Left Panel - Glass Card */}
      <div className="w-full md:w-1/2 flex justify-center items-center px-6">
        <div className="w-full max-w-md bg-white/30 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/40">
          <h2 className="text-4xl font-bold mb-2 font-playfair text-gray-900 text-center">
            Create Your Account
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            Join HungerJet and experience hassle-free food delivery.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {["name", "email", "password", "phone", "address"].map((field) => (
              <div key={field}>
                <input
                  type={field === "password" ? "password" : "text"}
                  name={field}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={(form as any)[field]}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/70 rounded-full border focus:outline-none focus:ring-2 ${
                    errors[field] ? "border-red-500" : "focus:ring-green-500"
                  }`}
                />
                {errors[field] && (
                  <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
                )}
              </div>
            ))}

            {/* GSAP Liquid Hover Button */}
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

          <Link to="/login/customer">
            <p className="text-center text-sm mt-6">
              Already have an account?{" "}
              <span className="text-green-600 hover:underline cursor-pointer">
                Login here
              </span>
            </p>
          </Link>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden md:flex w-1/2 justify-center items-center px-10 py-10">
        <img
          src="https://i.pinimg.com/736x/ea/44/a8/ea44a880f9f20db0ba98bfa84cb03e76.jpg"
          alt="Register Illustration"
          className="rounded-2xl w-full h-full object-cover shadow-md"
        />
      </div>
    </div>
  );
};

export default RegisterCustomer;
