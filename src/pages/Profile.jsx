import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCartItems, getCartCount, getCartTotal, getCartCountFromAPI } from "../services/cartService";
import { getWishlistItems } from "../services/wishlistService";
import { fetchUserOrders } from "../services/orderService";
import Header from "../components/common/Header";
import "../styles/Profile.css";
import "../styles/Home.css";

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateCounts = async () => {
      setLoading(true);
      try {
        if (user?.user_id) {
          try {
            const count = await getCartCountFromAPI(user.user_id);
            setCartCount(count);
          } catch {
            setCartCount(getCartCount());
          }

          // Fetch orders count from API
          try {
            const ordersResponse = await fetchUserOrders(user.user_id);
            if (ordersResponse.success) {
              setOrdersCount(ordersResponse.orders?.length || 0);
            }
          } catch (error) {
            console.error("Error fetching orders count:", error);
            // Fallback to localStorage if API fails
            const orders = localStorage.getItem("orders");
            if (orders) {
              const ordersData = JSON.parse(orders);
              setOrdersCount(Array.isArray(ordersData) ? ordersData.length : 0);
            }
          }
        } else {
          setCartCount(getCartCount());
          const orders = localStorage.getItem("orders");
          if (orders) {
            const ordersData = JSON.parse(orders);
            setOrdersCount(Array.isArray(ordersData) ? ordersData.length : 0);
          }
        }
    
        setCartTotal(getCartTotal());
    
        const wishlistItems = getWishlistItems();
        setWishlistCount(wishlistItems.length);
      } finally {
        setLoading(false);
      }
    };
  
    updateCounts();
  }, [user?.user_id]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "₹0";
    }
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="profile-page">
        <Header
          pageType="profile"
          cartCount={cartCount}
          onLogout={handleLogout}
        />
        <div className="profile-container">
          <div className="loading-container" style={{ textAlign: "center", padding: "50px" }}>
            <p>Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header
        pageType="profile"
        cartCount={cartCount}
        onLogout={handleLogout}
      />

      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">
              {user?.full_name || user?.name || user?.username || user?.email?.split("@")[0] || "User"}
            </h1>
            <p className="profile-email">{user?.email || "No email"}</p>
            {(user?.phone || user?.mobile) && <p className="profile-phone">{user.phone || user.mobile}</p>}
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-card" onClick={() => navigate("/order-details")}>
            <div className="stat-icon">🛒</div>
            <div className="stat-info">
              <div className="stat-value">{cartCount}</div>
              <div className="stat-label">Cart Items</div>
              <div className="stat-amount">{formatPrice(cartTotal)}</div>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate("/wishlist")}>
            <div className="stat-icon">❤️</div>
            <div className="stat-info">
              <div className="stat-value">{wishlistCount}</div>
              <div className="stat-label">Wishlist Items</div>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate("/order-history")}>
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <div className="stat-value">{ordersCount}</div>
              <div className="stat-label">Orders</div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <h2 className="section-title">Account Details</h2>
          <div className="details-section">
            <div className="detail-item">
              <span className="detail-label">Name:</span>
              <span className="detail-value">
                {user?.full_name || user?.name || user?.username || "Not provided"}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user?.email || "Not provided"}</span>
            </div>
            {(user?.phone || user?.mobile) && (
              <div className="detail-item">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{user.phone || user.mobile}</span>
              </div>
            )}
            {user?.address && (
              <div className="detail-item">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{user.address}</span>
              </div>
            )}
          </div>

          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-section">
            <button
              className="action-btn primary"
              onClick={() => navigate("/order-details")}
            >
              <span className="action-icon">🛒</span>
              View Cart
            </button>
            <button
              className="action-btn"
              onClick={() => navigate("/wishlist")}
            >
              <span className="action-icon">❤️</span>
              View Wishlist
            </button>
            <button
              className="action-btn"
              onClick={() => navigate("/home")}
            >
              <span className="action-icon">🏠</span>
              Continue Shopping
            </button>
            <button
              className="action-btn logout-btn"
              onClick={handleLogout}
            >
              <span className="action-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

