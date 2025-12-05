import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import gsap from "gsap";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

const LoginRestaurant = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const liquidRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    let valid = true;
    const tempErrors: { email?: string; password?: string } = {};

    if (!form.email.trim()) {
      tempErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      tempErrors.email = "Invalid email address";
      valid = false;
    }

    if (!form.password.trim()) {
      tempErrors.password = "Password is required";
      valid = false;
    } else if (form.password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(tempErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await axios.post(
        `${userUrl}/api/auth/login`,
        form
      );
      console.log(`Login response: ${JSON.stringify(res)}`);

      const { token, user } = res.data;

      if (user.role === "restaurantAdmin") {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/restaurant-dash");
      } else {
        alert("Access denied: Not a restaurant admin");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Login failed");
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
    <div className="flex h-screen w-full bg-gradient-to-r from-blue-100 via-white to-purple-200 font-sans">
      {/* Left Panel with Glassmorphism */}
      <div className="w-full md:w-1/2 flex justify-center items-center px-6">
        <div className="w-full max-w-md bg-white/30 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/40">
          <h2 className="text-4xl font-bold mb-2 font-playfair text-gray-900 text-center">
            Restaurant Admin Login
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            Access your dashboard to manage restaurant orders and menus.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <input
                type="text"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white/70 rounded-full border focus:outline-none focus:ring-2 ${
                  errors.email ? "border-red-500" : "focus:ring-green-500"
                }`}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white/70 rounded-full border focus:outline-none focus:ring-2 ${
                  errors.password ? "border-red-500" : "focus:ring-green-500"
                }`}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="text-right text-sm text-green-600 hover:underline cursor-pointer">
              Forgot Password?
            </div>

            {/* GSAP Liquid Button */}
            <div className="relative w-full mt-2">
              <button
                type="submit"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="w-full relative bg-black text-white py-3 rounded-full overflow-hidden z-10"
              >
                <span className="relative z-20">Login</span>
                <div
                  ref={liquidRef}
                  className="absolute top-0 left-0 h-full w-full bg-green-500 rounded-full z-10"
                  style={{ transform: "translateX(-100%)" }}
                />
              </button>
            </div>
          </form>

          <Link to="/register/restaurant">
            <p className="text-center text-sm mt-6">
              Not registered?{" "}
              <span className="text-green-600 hover:underline cursor-pointer">
                Register your restaurant
              </span>
            </p>
          </Link>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden md:flex w-1/2 justify-center items-center px-10 py-10">
        <img
          src="https://i.pinimg.com/736x/e8/9a/48/e89a4814d5742f04c1788aa2188dd7d3.jpg"
          alt="Restaurant Illustration"
          className="rounded-2xl w-full h-full object-cover shadow-md"
        />
      </div>
    </div>
  );
};

export default LoginRestaurant;
