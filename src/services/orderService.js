// Order service to manage orders
import axios from "axios";

const BASE_URL = "https://ecommerce-node-api-1-8ug3.onrender.com/api";

// Place an order
export const placeOrder = async (userId, orderItems) => {
  try {
    // Format items for API - ensure product_id is used
    const formattedItems = orderItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      ...(item.size && { size: item.size })
    }));

    const response = await axios.post(`${BASE_URL}/orders/${userId}`, {
      items: formattedItems
    });
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || "Order placed successfully",
        order: response.data.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Order placement failed"
      };
    }
  } catch (error) {
    console.error("Error placing order:", error);
    console.error("Error response:", error.response?.data);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to place order. Please try again."
    };
  }
};

// Fetch orders for a user
export const fetchUserOrders = async (userId) => {
  try {
    const response = await axios.get(`${BASE_URL}/orders/user/${userId}`);
    
    if (response.data.success) {
      return {
        success: true,
        orders: response.data.data || response.data.orders || []
      };
    } else {
      return {
        success: false,
        orders: [],
        message: response.data.message || "Failed to fetch orders"
      };
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      success: false,
      orders: [],
      message: error.response?.data?.message || error.message || "Failed to fetch orders. Please try again."
    };
  }
};

// Fetch order details by order ID
export const fetchOrderById = async (orderId) => {
  try {
    const response = await axios.get(`${BASE_URL}/orders/${orderId}`);
    
    if (response.data.success) {
      return {
        success: true,
        order: response.data.data || response.data.order
      };
    } else {
      return {
        success: false,
        order: null,
        message: response.data.message || "Failed to fetch order details"
      };
    }
  } catch (error) {
    console.error("Error fetching order details:", error);
    return {
      success: false,
      order: null,
      message: error.response?.data?.message || error.message || "Failed to fetch order details. Please try again."
    };
  }
};

// Fetch all orders (for seller)
export const fetchAllOrders = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/orders`);
    
    if (response.data.success) {
      return {
        success: true,
        orders: response.data.data || response.data.orders || []
      };
    } else {
      return {
        success: false,
        orders: [],
        message: response.data.message || "Failed to fetch orders"
      };
    }
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return {
      success: false,
      orders: [],
      message: error.response?.data?.message || error.message || "Failed to fetch orders. Please try again."
    };
  }
};

// Fetch paid orders (for seller)
export const fetchPaidOrders = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/seller/orders/paid`);
    
    if (response.data.success) {
      return {
        success: true,
        orders: response.data.data || response.data.orders || []
      };
    } else {
      return {
        success: false,
        orders: [],
        message: response.data.message || "Failed to fetch paid orders"
      };
    }
  } catch (error) {
    console.error("Error fetching paid orders:", error);
    return {
      success: false,
      orders: [],
      message: error.response?.data?.message || error.message || "Failed to fetch paid orders. Please try again."
    };
  }
};

// Update order status (for seller)
export const updateOrderStatus = async (orderId, status) => {
  try {
    const response = await axios.put(`${BASE_URL}/orders/${orderId}/status`, {
      status: status
    });
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || "Order status updated successfully",
        order: response.data.data || response.data.order
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Failed to update order status"
      };
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to update order status. Please try again."
    };
  }
};

// Update ordered_status (for seller)
export const updateOrderedStatus = async (orderId, orderedStatus) => {
  try {
    const response = await axios.put(`${BASE_URL}/seller/orders/${orderId}/ordered-status`, {
      ordered_status: orderedStatus
    });
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || "Order status updated successfully",
        order: response.data.data || response.data.order
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Failed to update order status"
      };
    }
  } catch (error) {
    console.error("Error updating ordered status:", error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to update order status. Please try again."
    };
  }
};

