import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';

import RestaurantDashboard from './pages/users/restaurant/RestaurantDashboard';
import MenuItems from "./pages/users/restaurant/MenuItems";
import RestaurantOrders from "./pages/users/restaurant/RestaurantOrdersPage";
import RestaurantAnalytics from "./pages/users/restaurant/RestaurantAnalytics";

import PaymentPage from './pages/PaymentPage';

import LoginCustomer from './pages/users/customer/LoginCustomer';
import LoginAdmin from './pages/users/admin/LoginAdmin';
import LoginDelivery from './pages/users/delivery/LoginDelivery';
import LoginRestaurant from './pages/users/restaurant/LoginRestaurant';

import RegisterCustomer from './pages/users/customer/RegisterCustomer';
import Home from './pages/users/customer/CustomerHome';
import RestaurantList from './pages/users/customer/RestaurantList';
import RestaurantMenu from './pages/users/customer/RestaurantMenu';
import OrderList from './pages/users/customer/OrderList';
import Cart from './pages/users/customer/Cart';
import Order from './pages/users/customer/Order';

import RegisterDelivery from './pages/users/delivery/RegisterDelivery';
import RegisterRestaurant from './pages/users/restaurant/RegisterRestaurant';

import AdminDashboard from './pages/users/admin/AdminDashboard';
import AdminCustomers from './pages/users/admin/UserTables/AdminCustomer';
import AdminRestaurant from './pages/users/admin/UserTables/AdminRestaurant';
import AdminDrivers from './pages/users/admin/UserTables/AdminDrivers';
import AdminAnalytics from './pages/users/admin/AdminAnalytics';
import CreateMenuItem from './pages/users/restaurant/CreateMenuItem';
import UpdateMenuItem from './pages/users/restaurant/UpdateMenuItem';
import CreateRestaurant from './pages/users/restaurant/CreateRestaurant';
import EditRestaurant from './pages/users/restaurant/EditRestaurant';
import About from './pages/users/customer/components/About';
import ContactUs from './pages/users/customer/components/ContactUs';
import FAQs from './pages/users/customer/components/FAQs';
import Reviews from './pages/users/customer/components/Reviews';
import DriverProfile from './pages/users/delivery/DriverProfile';
import DriverDashboard from './pages/users/delivery/DriverDashboard';
import DriverProfileRegister from './pages/users/delivery/DriverProfileRegister';
import DriverMyDeliveries from './pages/users/delivery/DriverMyDeliveries';


function App() {
    return (
      <BrowserRouter>
        {/* 
            <nav>
                <Link to="/">Restaurants</Link> | <Link to="/orders">Orders</Link>
            </nav>
        */}
        <Routes>
          {/* Restaurant routes */}
          {/* <Route path="/restaurant-dash" element={<RestaurantDashboard />} />
          <Route path="/restaurant-menu" element={<MenuItems />} />
          <Route path="/restaurant-orders" element={<RestaurantOrders />} />
          <Route
            path="/restaurant-analytics"
            element={<RestaurantAnalytics />}
          /> */}

                {/* Restaurant routes */}
                <Route path="/restaurant-dash" element={<RestaurantDashboard />} />
                <Route path="/restaurant-menu" element={<MenuItems />} />
                <Route path="/restaurant-orders" element={<RestaurantOrders />}/>
                <Route path="/restaurant-analytics" element={<RestaurantAnalytics />} />
                <Route path='/restaurant-create-menu-item' element={<CreateMenuItem />} />
                <Route path="/restaurant-update-menu-item/:id" element={<UpdateMenuItem />} />
                <Route path='/restaurant/create' element={<CreateRestaurant />} />
                <Route path='/restaurant/edit/:id' element={<EditRestaurant />} />

                {/* Orders routes 
                <Route path="/orders" element={<Orders />} />
                */}

                {/* Login routes */}
                <Route path="/login/customer" element={<LoginCustomer />} />
                <Route path="/login/admin" element={<LoginAdmin />} />
                <Route path="/login/restaurant" element={<LoginRestaurant />} />
                <Route path="/login/delivery" element={<LoginDelivery />} />

                {/* SignUp routes */}
                <Route path="/register/customer" element={<RegisterCustomer />} />
                <Route path="/register/delivery" element={<RegisterDelivery />} />
                <Route path="/register/restaurant" element={<RegisterRestaurant />} />

                {/* Customer Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/order/:orderId" element={<Order />}/>
                <Route path="/my-orders" element={<OrderList />}/>
                <Route path="/customer-home" element={<Home />} />
                <Route path="/restaurants" element={<RestaurantList />} />
                <Route path="/restaurants/:restaurantId" element={<RestaurantMenu />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path='/about' element={<About />} />
                <Route path='/contactus' element={<ContactUs />} />
                <Route path='/faqs' element={<FAQs />} />
                <Route path='/reviews' element={<Reviews />} />

                {/* Admin Routes */}
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/admin/customers" element={<AdminCustomers />} />
                <Route path='/admin/restaurants' element={<AdminRestaurant />} />
                <Route path='/admin/drivers' element={<AdminDrivers />} />
                <Route path='/admin/analytics' element={<AdminAnalytics />} />

                


                {/* Delivery Routes */}
                <Route path="/driver/dashboard" element={<DriverDashboard />} />
                <Route path="/driver/profile" element={<DriverProfile />} />
                <Route path="/driver/register-profile" element={<DriverProfileRegister />} />
                <Route path="/driver/mydeliveries" element={<DriverMyDeliveries />} />


            </Routes>
        </BrowserRouter>
    );
}

export default App;