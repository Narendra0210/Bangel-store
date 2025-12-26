import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Check, CreditCard, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createRazorpayOrder, verifyPayment } from "../services/paymentService";
import "../styles/Payment.css";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const apiCalledRef = useRef(false); // Track if API has been called

  useEffect(() => {
    // Get order data from location state
    if (location.state?.orderData) {
      setOrderData(location.state.orderData);
    } else {
      // If no order data, redirect back to order details
      showToast("No order information found. Please place an order first.", "warning");
      navigate("/order-details");
    }
  }, [location.state, navigate, showToast]);

  useEffect(() => {
    // Check if Razorpay is loaded
    const checkRazorpay = () => {
      if (window.Razorpay) {
        setRazorpayLoaded(true);
      } else {
        // Retry after a short delay if not loaded yet
        setTimeout(checkRazorpay, 100);
      }
    };
    checkRazorpay();
  }, []);

  // Note: Payment gateway will only open when user clicks "Make Payment" button
  // Removed automatic opening - user must manually click the button

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "₹0";
    }
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  const initiatePayment = async () => {
    if (!orderData) {
      showToast("Order information is missing.", "error");
      apiCalledRef.current = false; // Reset if order data is missing
      return;
    }

    if (!orderData.order_id) {
      showToast("Order ID is missing. Please try again.", "error");
      apiCalledRef.current = false; // Reset if order ID is missing
      return;
    }

    setPaymentInitiated(true);
    setLoading(true);

    try {
      // Call API to create Razorpay order
      const response = await createRazorpayOrder(orderData.order_id);

      if (!response.success) {
        setLoading(false);
        setPaymentInitiated(false);
        apiCalledRef.current = false; // Reset to allow retry
        showToast(response.message || "Failed to initialize payment. Please try again.", "error");
        return;
      }

      const razorpayData = response.data;
      
      // Log the response for debugging
      console.log("Razorpay API Response:", razorpayData);

      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        console.error("Razorpay script not loaded");
        setLoading(false);
        setPaymentInitiated(false);
        apiCalledRef.current = false; // Reset to allow retry
        showToast("Payment gateway is not available. Please refresh the page.", "error");
        return;
      }

      // Get Razorpay order ID from response (API returns 'id' field)
      const razorpayOrderId = razorpayData.id || razorpayData.order_id;
      if (!razorpayOrderId) {
        console.error("Razorpay order ID missing:", razorpayData);
        setLoading(false);
        setPaymentInitiated(false);
        apiCalledRef.current = false; // Reset to allow retry
        showToast("Payment order creation failed. Please try again.", "error");
        return;
      }

      // Get Razorpay key - check multiple possible locations
      // The key might be in the response, or needs to be from environment variable
      // Check razorpayData.key, or env variable
      // Note: The Razorpay key should be provided by the backend API or configured in environment variables
      const razorpayKey = 
        razorpayData.key || 
        razorpayData.razorpay_key || 
        razorpayData.razorpayKey ||
        razorpayData.public_key ||
        process.env.REACT_APP_RAZORPAY_KEY;
      
      if (!razorpayKey) {
        console.error("Razorpay key missing. Full response data:", razorpayData);
        console.error("Available keys in response:", Object.keys(razorpayData));
        console.error("Please ensure:");
        console.error("1. Backend API returns 'key' or 'razorpay_key' in the response, OR");
        console.error("2. Set REACT_APP_RAZORPAY_KEY in your .env file");
        setLoading(false);
        setPaymentInitiated(false);
        apiCalledRef.current = false; // Reset to allow retry
        showToast("Payment configuration error: Razorpay key is missing. Please configure the Razorpay key.", "error");
        return;
      }
      
      console.log("Razorpay key found:", razorpayKey.substring(0, 10) + "...");

      // Get amount from response (already in paise) or calculate from order
      const amount = razorpayData.amount || (orderData.total_amount * 100);
      const currency = razorpayData.currency || "INR";

      console.log("Opening Razorpay with:", {
        key: razorpayKey.substring(0, 10) + "...", // Log partial key for security
        order_id: razorpayOrderId,
        amount: amount,
        currency: currency
      });

      // Razorpay options - adjust based on your API response structure
      const options = {
        key: razorpayKey, // Razorpay key
        amount: amount, // Amount in paise (already in paise from API)
        currency: currency,
        name: "Bangle Store",
        description: `Order #${orderData.order_number}`,
        order_id: razorpayOrderId, // Razorpay order ID from API response
        handler: async function (razorpayResponse) {
          // Payment success handler
          setLoading(true);
          
          try {
            // Verify payment with backend
            const verifyData = {
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              payment_status: "success"
            };

            const verifyResult = await verifyPayment(verifyData);
            
            if (verifyResult.success) {
              showToast("Payment verified successfully! Your order is confirmed.", "success");
              
              // Navigate to home and clear history
              setTimeout(() => {
                // Navigate to home with replace to remove payment page from history
                navigate("/home", { replace: true });
                
                // Clear browser history by replacing the current state
                // This prevents back button from going back to payment/order pages
                if (window.history.length > 1) {
                  // Replace current history entry
                  window.history.replaceState(null, "", "/home");
                }
              }, 1500);
            } else {
              showToast(verifyResult.message || "Payment verification failed. Please contact support.", "error");
              setLoading(false);
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            showToast("Payment completed but verification failed. Please contact support.", "error");
            setLoading(false);
          }
        },
        prefill: {
          name: user?.name || user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || user?.contact || "",
        },
        notes: {
          order_id: orderData.order_id,
          order_number: orderData.order_number,
        },
        theme: {
          color: "#2c5aa0",
        },
        modal: {
          ondismiss: function () {
            // User closed the payment modal
            setLoading(false);
            setPaymentInitiated(false);
            apiCalledRef.current = false; // Reset to allow retry
            showToast("Payment cancelled.", "info");
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", async function (response) {
        // Payment failure handler
        setLoading(true);
        
        try {
          // Verify failed payment with backend
          const verifyData = {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: response.error?.metadata?.payment_id || null,
            razorpay_signature: null,
            payment_status: "failed"
          };

          await verifyPayment(verifyData);
        } catch (error) {
          console.error("Error verifying failed payment:", error);
        }
        
        setLoading(false);
        setPaymentInitiated(false);
        apiCalledRef.current = false; // Reset to allow retry
        showToast(
          response.error?.description || "Payment failed. Please try again.",
          "error"
        );
      });

      razorpay.open();
      setLoading(false);
    } catch (error) {
      console.error("Error initiating payment:", error);
      setLoading(false);
      setPaymentInitiated(false);
      apiCalledRef.current = false; // Reset to allow retry
      showToast("An error occurred while processing payment. Please try again.", "error");
    }
  };

  const handleMakePayment = async () => {
    // Check if order data exists
    if (!orderData || !orderData.order_id) {
      showToast("Order information is missing. Please place an order first.", "error");
      return;
    }

    // Check if Razorpay is loaded
    if (!razorpayLoaded) {
      showToast("Payment gateway is loading. Please wait a moment.", "warning");
      return;
    }

    // Reset flags to allow payment initiation
    setPaymentInitiated(false);
    apiCalledRef.current = false;
    
    // Call initiatePayment to open Razorpay
    await initiatePayment();
  };

  if (!orderData) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="loading-container">
            <p>Loading order information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        {/* Header */}
        <div className="payment-header">
          <h1 className="payment-title">Payment</h1>
          <p className="payment-subtitle">Complete your order payment</p>
        </div>

        {/* Order Summary Card */}
        <div className="order-summary-card">
          <div className="summary-header">
            <h2 className="summary-title">Order Summary</h2>
            <div className="order-status-badge pending">
              {orderData.status?.toUpperCase() || "PENDING"}
            </div>
          </div>

          <div className="order-info-section">
            <div className="info-row">
              <span className="info-label">Order Number:</span>
              <span className="info-value">{orderData.order_number || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Order ID:</span>
              <span className="info-value">#{orderData.order_id || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Items:</span>
              <span className="info-value">{orderData.items_count || 0} item(s)</span>
            </div>
            <div className="info-row">
              <span className="info-label">User ID:</span>
              <span className="info-value">#{orderData.user_id || "N/A"}</span>
            </div>
          </div>

          <div className="amount-section">
            <div className="amount-row">
              <span className="amount-label">Total Amount</span>
              <span className="amount-value">{formatPrice(orderData.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Card */}
        <div className="payment-methods-card">
          <h3 className="methods-title">Select Payment Method</h3>
          <div className="payment-methods-list">
            <div className="payment-method-item selected">
              <div className="method-icon">
                <CreditCard size={24} />
              </div>
              <div className="method-details">
                <span className="method-name">Credit/Debit Card</span>
                <span className="method-description">Pay securely with your card</span>
              </div>
              <div className="method-check">
                <Check size={20} />
              </div>
            </div>
            <div className="payment-method-item">
              <div className="method-icon">
                <CreditCard size={24} />
              </div>
              <div className="method-details">
                <span className="method-name">UPI</span>
                <span className="method-description">Pay using UPI apps</span>
              </div>
            </div>
            <div className="payment-method-item">
              <div className="method-icon">
                <CreditCard size={24} />
              </div>
              <div className="method-details">
                <span className="method-name">Net Banking</span>
                <span className="method-description">Pay using your bank account</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <Lock size={16} />
          <span>Your payment information is secure and encrypted</span>
        </div>

        {/* Payment Button */}
        <div className="payment-actions">
          <button
            className="make-payment-btn"
            onClick={handleMakePayment}
            disabled={loading || !razorpayLoaded}
          >
            {loading ? "Processing..." : `Make Payment - ${formatPrice(orderData.total_amount)}`}
          </button>
          <Link to="/order-details" className="back-link">
            Back to Cart
          </Link>
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
        </Link>
      </nav>
    </div>
  );
};

export default Payment;

