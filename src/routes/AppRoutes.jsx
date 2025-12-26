import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginRegister from "../pages/Login-Register";
import Home from "../pages/Home";
import ProductDetail from "../pages/ProductDetail";
import OrderDetails from "../pages/OrderDetails";
import Wishlist from "../pages/Wishlist";
import Profile from "../pages/Profile";
import OrderHistory from "../pages/OrderHistory";
import OrderedItems from "../pages/OrderedItems";
import Payment from "../pages/Payment";
import SellerDashboard from "../pages/SellerDashboard";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const SellerRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  
  // Debug logging
  console.log("SellerRoute - isAuthenticated:", isAuthenticated);
  console.log("SellerRoute - User:", user);
  console.log("SellerRoute - User Role:", user?.role);
  
  // Check authentication first
  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // Check if user is seller based on role from API
  const userRole = user?.role;
  const isSeller = userRole === 'seller';
  
  console.log("SellerRoute - Is Seller:", isSeller);
  
  // Redirect non-sellers to home
  if (!isSeller) {
    console.log("User is not a seller, redirecting to home");
    return <Navigate to="/home" replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/home" replace />;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginRegister />
            </PublicRoute>
          }
        />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/product/:id"
          element={
            <PrivateRoute>
              <ProductDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/order-details"
          element={
            <PrivateRoute>
              <OrderDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <PrivateRoute>
              <Wishlist />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/order-history"
          element={
            <PrivateRoute>
              <OrderHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="/ordered-items/:orderId"
          element={
            <PrivateRoute>
              <OrderedItems />
            </PrivateRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <PrivateRoute>
              <Payment />
            </PrivateRoute>
          }
        />
        <Route
          path="/seller/dashboard"
          element={
            <SellerRoute>
              <SellerDashboard />
            </SellerRoute>
          }
        />
        <Route
          path="/sellerDashboard"
          element={
            <SellerRoute>
              <SellerDashboard />
            </SellerRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
