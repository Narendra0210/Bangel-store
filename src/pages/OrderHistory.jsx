import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchUserOrders } from "../services/orderService";
import { useToast } from "../context/ToastContext";
import Header from "../components/common/Header";
import "../styles/OrderHistory.css";
import "../styles/Home.css";

const OrderHistory = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user?.user_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetchUserOrders(user.user_id);
        if (response.success) {
          setOrders(response.orders || []);
        } else {
          showToast(response.message || "Failed to load orders", "error");
          setOrders([]);
        }
      } catch (error) {
        console.error("Error loading orders:", error);
        showToast("An error occurred while loading orders", "error");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user?.user_id, showToast]);

  const formatPrice = (price) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return `₹${numPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "#f59e0b";
      case "confirmed":
        return "#10b981";
      case "shipped":
        return "#3b82f6";
      case "delivered":
        return "#10b981";
      case "cancelled":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  return (
    <div className="order-history-page">
      <Header
        pageType="order"
        onLogout={async () => {
          await logout();
          navigate("/login");
        }}
      />

      <div className="order-history-container">
        <div className="order-history-header">
          <button
            className="back-button"
            onClick={() => navigate("/profile")}
          >
            ← Back to Profile
          </button>
          <h1 className="order-history-title">Order History</h1>
        </div>

        {loading ? (
          <div className="loading-container">
            <p>Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-orders-icon">📦</div>
            <p className="empty-orders-text">No orders found</p>
            <Link to="/home" className="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.order_id} className="order-card">
                <div className="order-card-header">
                  <div className="order-info">
                    <h3 className="order-number">{order.order_number}</h3>
                    <p className="order-date">
                      Ordered on {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div
                    className="order-status"
                    style={{ color: getStatusColor(order.status) }}
                  >
                    {order.status?.toUpperCase() || "PENDING"}
                  </div>
                </div>

                <div className="order-card-body">
                  <div className="order-details-row">
                    <div className="order-detail-item">
                      <span className="detail-label">Items:</span>
                      <span className="detail-value">{order.items_count || 0}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="detail-label">Total Amount:</span>
                      <span className="detail-value total-amount">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="order-card-footer">
                  <button
                    className="view-order-btn"
                    onClick={() => {
                      // Navigate to order details page if needed
                      showToast("Order details feature coming soon", "info");
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="bottom-nav">
        <Link to="/home" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </Link>
        <Link to="/profile" className="nav-item active">
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </Link>
        <Link to="/order-details" className="nav-item">
          <span className="nav-icon">🛒</span>
          <span className="nav-label">Cart</span>
        </Link>
      </nav>
    </div>
  );
};

export default OrderHistory;

