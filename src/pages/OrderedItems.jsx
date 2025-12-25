import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { fetchOrderById } from "../services/orderService";
import { addToCart, getCartCount, getCartCountFromAPI } from "../services/cartService";
import { getProductImage } from "../services/productService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Header from "../components/common/Header";
import "../styles/OrderDetails.css";
import "../styles/Home.css";

const OrderedItems = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetchOrderById(orderId);
        if (response.success && response.order) {
          setOrder(response.order);
        } else {
          showToast(response.message || "Failed to load order details", "error");
          navigate("/order-history");
        }
      } catch (error) {
        console.error("Error loading order:", error);
        showToast("An error occurred while loading order details", "error");
        navigate("/order-history");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, navigate, showToast]);

  useEffect(() => {
    const updateCartCount = async () => {
      if (user?.user_id) {
        try {
          const count = await getCartCountFromAPI(user.user_id);
          setCartCount(count);
        } catch {
          setCartCount(getCartCount());
        }
      } else {
        setCartCount(getCartCount());
      }
    };
    updateCartCount();
  }, [user?.user_id]);

  const handleLogout = async () => {
    await logout();
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "₹0";
    }
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
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

  const handleAddToCart = async (item) => {
    try {
      const productData = {
        id: item.product_id || item.item_id,
        name: item.item_name || item.name,
        price: parseFloat(item.price) || 0,
        discounted_price: parseFloat(item.discounted_price) || parseFloat(item.price) || 0,
        discount_percent: parseFloat(item.discount_percent) || 0,
        image: getProductImage(item.product_id || item.item_id),
        images: [getProductImage(item.product_id || item.item_id)],
        description: item.item_name || item.name,
        rating: 4.0,
        sizes: [],
        category: "",
      };

      await addToCart(productData, item.size || null, item.quantity || 1, user?.user_id);
      
      // Update cart count
      if (user?.user_id) {
        try {
          const count = await getCartCountFromAPI(user.user_id);
          setCartCount(count);
        } catch {
          setCartCount(getCartCount());
        }
      } else {
        setCartCount(getCartCount());
      }
      
      showToast("Item added to cart!", "success");
    } catch (error) {
      console.error("Error adding to cart:", error);
      showToast("Failed to add item to cart", "error");
    }
  };

  const handleAddAllToCart = async () => {
    // Get order items from order state
    const orderItems = order?.items || [];
    
    if (!orderItems || orderItems.length === 0) {
      showToast("No items to add to cart", "warning");
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      // Add all items to cart
      for (const item of orderItems) {
        try {
          const productData = {
            id: item.product_id || item.item_id,
            name: item.item_name || item.name,
            price: parseFloat(item.price) || 0,
            discounted_price: parseFloat(item.discounted_price) || parseFloat(item.price) || 0,
            discount_percent: parseFloat(item.discount_percent) || 0,
            image: getProductImage(item.product_id || item.item_id),
            images: [getProductImage(item.product_id || item.item_id)],
            description: item.item_name || item.name,
            rating: 4.0,
            sizes: [],
            category: "",
          };

          await addToCart(productData, item.size || null, item.quantity || 1, user?.user_id);
          successCount++;
        } catch (error) {
          console.error(`Error adding item ${item.product_id || item.item_id} to cart:`, error);
          failCount++;
        }
      }

      // Update cart count
      if (user?.user_id) {
        try {
          const count = await getCartCountFromAPI(user.user_id);
          setCartCount(count);
        } catch {
          setCartCount(getCartCount());
        }
      } else {
        setCartCount(getCartCount());
      }

      if (successCount > 0) {
        if (failCount > 0) {
          showToast(`${successCount} item(s) added to cart. ${failCount} item(s) failed.`, "warning");
        } else {
          showToast(`All ${successCount} item(s) added to cart!`, "success");
        }
        // Navigate to cart page after adding items
        setTimeout(() => {
          navigate("/home");
        }, 100);
      } else {
        showToast("Failed to add items to cart", "error");
      }
    } catch (error) {
      console.error("Error adding all items to cart:", error);
      showToast("An error occurred while adding items to cart", "error");
    }
  };

  if (loading) {
    return (
      <div className="order-details-page">
        <Header
          pageType="order"
          cartCount={cartCount}
          onLogout={handleLogout}
        />
        <div className="order-details-container">
          <div className="loading-container" style={{ textAlign: "center", padding: "50px" }}>
            <p>Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-page">
        <Header
          pageType="order"
          cartCount={cartCount}
          onLogout={handleLogout}
        />
        <div className="order-details-container">
          <div className="empty-cart">
            <p>Order not found</p>
            <button
              className="continue-shopping-btn"
              onClick={() => navigate("/order-history")}
              style={{ background: "#ec4899", color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: "pointer" }}
            >
              Back to Order History
            </button>
          </div>
        </div>
      </div>
    );
  }

  const orderItems = order.items || [];
  const totalAmount = parseFloat(order.total_amount) || 0;

  return (
    <div className="order-details-page">
      <Header
        pageType="order"
        cartCount={cartCount}
        onLogout={handleLogout}
      />

      <div className="order-details-container">
        {/* Order Header */}
        <div className="order-header-section">
          <button
            className="back-button"
            onClick={() => navigate("/order-history")}
            style={{ background: "none", border: "none", color: "#ec4899", cursor: "pointer", fontSize: "14px", fontWeight: "600", marginBottom: "20px" }}
          >
            ← Back to Order History
          </button>
          <div className="order-header-card">
            <div className="order-header-info">
              <h2 className="order-number-title">Order #{order.order_number || order.order_id}</h2>
              <p className="order-date-text">Ordered on {formatDate(order.created_at)}</p>
            </div>
            <div
              className="order-status-badge"
              style={{ 
                color: getStatusColor(order.status),
                fontWeight: "600",
                fontSize: "14px",
                padding: "8px 16px",
                borderRadius: "6px",
                background: `${getStatusColor(order.status)}20`,
                border: `1px solid ${getStatusColor(order.status)}`
              }}
            >
              {order.status?.toUpperCase() || "PENDING"}
            </div>
          </div>
        </div>

        <div className="order-details-wrapper">
          {/* Left Column - Order Items */}
          <div className="cart-items-section">
            <h3 className="section-title" style={{ marginBottom: "20px" }}>Order Items</h3>
            
            {orderItems.length > 0 ? (
              <div className="cart-items-list">
                {orderItems.map((item, index) => {
                  const itemId = item.product_id || item.item_id;
                  const image = getProductImage(itemId);
                  const originalPrice = parseFloat(item.price) || 0;
                  const discountedPrice = parseFloat(item.discounted_price) || parseFloat(item.total_price) || originalPrice;
                  const quantity = parseInt(item.quantity) || 1;
                  
                  return (
                    <div key={item.order_item_id || index} className="cart-item-card" style={{ opacity: 1, gridTemplateColumns: "120px 1fr auto", position: "relative" }}>
                      <Link to={`/product/${itemId}`} className="cart-item-image-link">
                        <div className="cart-item-image">
                          <img
                            src={image}
                            alt={item.item_name || item.name}
                          />
                        </div>
                      </Link>
                      <div className="cart-item-details">
                        <Link to={`/product/${itemId}`} className="cart-item-name-link">
                          <h3 className="cart-item-name">{item.item_name || item.name}</h3>
                        </Link>
                        <p className="cart-item-seller">Sold by: AK Enterprises</p>
                        
                        <div className="cart-item-options">
                          {item.size && (
                            <div className="option-select">
                              <label>Size:</label>
                              <span className="option-display">{item.size}</span>
                            </div>
                          )}
                          <div className="option-select">
                            <label>Qty:</label>
                            <span className="option-display">{quantity}</span>
                          </div>
                        </div>

                        <div className="cart-item-pricing">
                          <div className="price-row">
                            <span className="current-price">
                              {formatPrice(discountedPrice * quantity)}
                            </span>
                          </div>
                          <div className="return-info">
                            <Clock size={14} />
                            <span>7 days return available</span>
                          </div>
                        </div>
                      </div>
                      <div className="cart-item-actions">
                        <button
                          className="add-to-cart-btn"
                          onClick={() => handleAddToCart(item)}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-cart">
                <p>No items found in this order</p>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="price-summary-section">
            <div className="price-summary-card">
              <h3 className="summary-title">ORDER SUMMARY</h3>
              
              <div className="price-breakdown">
                <div className="price-row">
                  <span>Order Number</span>
                  <span>{order.order_number || order.order_id}</span>
                </div>
                <div className="price-row">
                  <span>Order Date</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                <div className="price-row">
                  <span>Status</span>
                  <span style={{ color: getStatusColor(order.status), fontWeight: "600" }}>
                    {order.status?.toUpperCase() || "PENDING"}
                  </span>
                </div>
                <div className="price-row">
                  <span>Items</span>
                  <span>{orderItems.length}</span>
                </div>
                <div className="price-row discount-row">
                  <span>Discount</span>
                  <span className="discount-value">- {formatPrice((order.total_mrp || totalAmount) - totalAmount)}</span>
                </div>
              </div>

              <div className="total-amount">
                <span>Total Amount</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>

              <button
                className="place-order-btn"
                onClick={handleAddAllToCart}
                style={{ background: "#ec4899", marginBottom: "12px" }}
              >
                Add More Items
              </button>

              <button
                className="place-order-btn"
                onClick={() => navigate("/order-details")}
                style={{ background: "#10b981" }}
              >
                Make a Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="bottom-nav">
        <Link to="/home" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </Link>
        <Link to="/profile" className="nav-item">
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </Link>
        <Link to="/order-details" className="nav-item">
          <span className="nav-icon">🛒</span>
          <span className="nav-label">Cart</span>
          {cartCount > 0 && (
            <span className="cart-badge">{cartCount}</span>
          )}
        </Link>
      </nav>
    </div>
  );
};

export default OrderedItems;

