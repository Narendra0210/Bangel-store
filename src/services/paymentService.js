// Payment service to handle payment operations
import axios from "axios";

const BASE_URL = "https://ecommerce-node-api-1-8ug3.onrender.com/api";

// Create Razorpay order
export const createRazorpayOrder = async (orderId) => {
  try {
    const response = await axios.post(`${BASE_URL}/payment/create-order`, {
      order_id: orderId
    });
    
    console.log("Full API Response:", response.data);
    
    // Handle different response structures
    // If response has success at root level and data contains the order
    if (response.data.success) {
      // The order data might be directly in response.data or in response.data.data
      const orderData = response.data.data || response.data;
      
      // Remove success field from orderData if it exists
      const { success, ...orderInfo } = orderData;
      
      return {
        success: true,
        data: orderInfo // Return order info without success field
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Failed to create payment order"
      };
    }
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    console.error("Error response:", error.response?.data);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to create payment order. Please try again."
    };
  }
};

// Verify payment
export const verifyPayment = async (paymentData) => {
  try {
    const response = await axios.post(`${BASE_URL}/payment/verify`, {
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
      payment_status: paymentData.payment_status
    });
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || "Payment verified successfully",
        data: response.data.data || response.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Payment verification failed"
      };
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to verify payment. Please try again."
    };
  }
};

