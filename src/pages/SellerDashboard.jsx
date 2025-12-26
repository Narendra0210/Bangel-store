import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Clock, Truck, CheckCircle, XCircle } from "lucide-react";
import { fetchPaidOrders, updateOrderedStatus, fetchOrderById } from "../services/orderService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../styles/SellerDashboard.css";

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const statusOptions = [
    { value: "accepted", label: "Accepted", icon: CheckCircle, color: "#10b981" },
    { value: "packed", label: "Packed", icon: Package, color: "#3b82f6" },
    { value: "shipped", label: "Shipped", icon: Truck, color: "#f59e0b" },
    { value: "delivered", label: "Delivered", icon: CheckCircle, color: "#10b981" }
  ];

  useEffect(() => {
    // Debug logging
    console.log("SellerDashboard mounted");
    console.log("User:", user);
    
    loadOrders();
    // Refresh orders every 30 seconds
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetchPaidOrders();
      if (response.success) {
        setOrders(response.orders || []);
      } else {
        console.error("Failed to load orders:", response.message);
        showToast(response.message || "Failed to load orders", "error");
        // Set empty array if API fails
        setOrders([]);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      showToast("An error occurred while loading orders", "error");
      // Set empty array on error
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId) => {
    try {
      const response = await fetchOrderById(orderId);
      if (response.success && response.order) {
        setSelectedOrder(response.order);
        setShowOrderDetails(true);
      } else {
        showToast(response.message || "Failed to load order details", "error");
      }
    } catch (error) {
      console.error("Error loading order details:", error);
      showToast("An error occurred while loading order details", "error");
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingStatus(orderId);
    try {
      const response = await updateOrderedStatus(orderId, newStatus);
      if (response.success) {
        showToast("Order status updated successfully!", "success");
        // Update the order in the list
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.order_id === orderId
              ? { ...order, ordered_status: newStatus, status: newStatus, ...response.order }
              : order
          )
        );
        // Update selected order if it's the one being updated
        if (selectedOrder && selectedOrder.order_id === orderId) {
          setSelectedOrder({ ...selectedOrder, ordered_status: newStatus, status: newStatus, ...response.order });
        }
      } else {
        showToast(response.message || "Failed to update order status", "error");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      showToast("An error occurred while updating order status", "error");
    } finally {
      setUpdatingStatus(null);
    }
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
    const statusOption = statusOptions.find(opt => opt.value === status?.toLowerCase());
    return statusOption?.color || "#6b7280";
  };

  const getStatusLabel = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status?.toLowerCase());
    return statusOption?.label || status?.toUpperCase() || "PENDING";
  };

  const filteredOrders = orders.filter(order => {
    const status = order.ordered_status?.toLowerCase() || order.status?.toLowerCase();
    return status !== "delivered";
  });

  // Show loading state
  if (loading && orders.length === 0) {
    return (
      <div className="seller-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">Seller Dashboard</h1>
            <div className="header-actions">
              <span className="seller-name">Welcome, {user?.name || user?.full_name || "Seller"}</span>
              <button className="logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="dashboard-container">
          <div className="loading-container">
            <p>Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Seller Dashboard</h1>
          <div className="header-actions">
            <span className="seller-name">Welcome, {user?.name || user?.full_name || "Seller"}</span>
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon pending">
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <h3>{orders.filter(o => (o.ordered_status || o.status)?.toLowerCase() === "pending").length}</h3>
              <p>Pending Orders</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accepted">
              <Package size={24} />
            </div>
            <div className="stat-info">
              <h3>{orders.filter(o => {
                const status = (o.ordered_status || o.status)?.toLowerCase();
                return status === "accepted" || status === "packed";
              }).length}</h3>
              <p>Processing</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon shipping">
              <Truck size={24} />
            </div>
            <div className="stat-info">
              <h3>{orders.filter(o => {
                const status = (o.ordered_status || o.status)?.toLowerCase();
                return status === "shipped";
              }).length}</h3>
              <p>Shipped</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon delivered">
              <CheckCircle size={24} />
            </div>
            <div className="stat-info">
              <h3>{orders.filter(o => (o.ordered_status || o.status)?.toLowerCase() === "delivered").length}</h3>
              <p>Delivered</p>
            </div>
          </div>
        </div>

        <div className="orders-section">
          <div className="section-header">
            <h2>Active Orders</h2>
            <button className="refresh-btn" onClick={loadOrders} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {filteredOrders.length > 0 ? (
            <div className="orders-list">
              {filteredOrders.map((order) => (
                <div key={order.order_id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <h3 className="order-number">Order #{order.order_number || order.order_id}</h3>
                      <p className="order-date">Placed on {formatDate(order.created_at)}</p>
                      <p className="order-items">Items: {order.items_count || 0}</p>
                    </div>
                    <div className="order-status-section">
                      <div
                        className="order-status-badge"
                        style={{
                          backgroundColor: `${getStatusColor(order.ordered_status || order.status)}20`,
                          color: getStatusColor(order.ordered_status || order.status),
                          borderColor: getStatusColor(order.ordered_status || order.status),
                        }}
                      >
                        {getStatusLabel(order.ordered_status || order.status)}
                      </div>
                      <p className="order-total">{formatPrice(order.total_amount)}</p>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button
                      className="view-details-btn"
                      onClick={() => handleViewDetails(order.order_id)}
                    >
                      View Details
                    </button>
                    <div className="status-update-section">
                      <label>Update Status:</label>
                      <select
                        className="status-select"
                        value={(order.ordered_status || order.status)?.toLowerCase() || "pending"}
                        onChange={(e) => handleStatusUpdate(order.order_id, e.target.value)}
                        disabled={updatingStatus === order.order_id}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {updatingStatus === order.order_id && (
                        <span className="updating-indicator">Updating...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-orders">
              <Package size={48} />
              <p>No active orders</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowOrderDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - #{selectedOrder.order_number || selectedOrder.order_id}</h2>
              <button className="close-btn" onClick={() => setShowOrderDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="order-detail-section">
                <h3>Order Information</h3>
                <div className="detail-row">
                  <span>Order Number:</span>
                  <span>{selectedOrder.order_number || selectedOrder.order_id}</span>
                </div>
                <div className="detail-row">
                  <span>Order Date:</span>
                  <span>{formatDate(selectedOrder.created_at)}</span>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <span style={{ color: getStatusColor(selectedOrder.ordered_status || selectedOrder.status) }}>
                    {getStatusLabel(selectedOrder.ordered_status || selectedOrder.status)}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Total Amount:</span>
                  <span className="total-amount">{formatPrice(selectedOrder.total_amount)}</span>
                </div>
              </div>

              <div className="order-detail-section">
                <h3>Order Items</h3>
                <div className="items-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={item.order_item_id || index} className="item-row">
                      <div className="item-info">
                        <h4>{item.item_name || item.name}</h4>
                        <p>Quantity: {item.quantity}</p>
                        {item.size && <p>Size: {item.size}</p>}
                      </div>
                      <div className="item-price">
                        {formatPrice(item.total_price || item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <label>Update Status:</label>
                <select
                  className="status-select"
                  value={(selectedOrder.ordered_status || selectedOrder.status)?.toLowerCase() || "pending"}
                  onChange={(e) => handleStatusUpdate(selectedOrder.order_id, e.target.value)}
                  disabled={updatingStatus === selectedOrder.order_id}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;

