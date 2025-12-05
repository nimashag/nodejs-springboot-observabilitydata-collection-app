import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import axios from "axios";
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

const LoginDelivery = () => {
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
      const res = await axios.post(`${userUrl}/api/auth/login`, form);
  
      //  Save token and user after successful login
      if (res.data.user.role === 'deliveryPersonnel') {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
  
        const token = res.data.token;
        try {
          //  Immediately check if driver profile exists
          const profileRes = await axios.get(`${deliveryUrl}/api/drivers/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
  
          console.log("Driver profile found ");
          navigate('/driver/dashboard'); //  Driver profile exists
  
        } catch (profileErr: any) {
          if (profileErr.response?.status === 404) {
            console.log("Driver profile missing  Redirecting to register profile...");
            navigate('/driver/register-profile'); //  Driver profile missing
          } else {
            console.error("Error checking driver profile", profileErr);
            alert('Error verifying driver profile. Please try again.');
          }
        }
      } else {
        alert("Access denied: Not a delivery personnel.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Login failed');
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
            Delivery Login
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            Welcome back, rider! Sign in to start delivering with HungerJet.
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
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
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
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div className="text-right text-sm text-green-600 hover:underline cursor-pointer">
              Forgot Password?
            </div>

            {/* GSAP Liquid Hover Button */}
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

          {/* Navigation to Delivery Register */}
          <Link to="/register/delivery">
            <p className="text-center text-sm mt-6">
              Not a delivery rider yet?{" "}
              <span className="text-green-600 hover:underline cursor-pointer">
                Register now
              </span>
            </p>
          </Link>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden md:flex w-1/2 justify-center items-center px-10 py-10">
        <img
          src="https://images.pexels.com/photos/4393668/pexels-photo-4393668.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
          alt="Delivery Illustration"
          className="rounded-2xl w-full h-full object-cover shadow-md"
        />
      </div>
    </div>
  );
};

export default LoginDelivery;
