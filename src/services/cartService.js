// Cart service to manage cart items
import axios from "axios";
import { getProductImage } from "./productService";

const BASE_URL = "https://ecommerce-node-api-1-8ug3.onrender.com/api";

let cartItems = [];

export const getCartItems = () => {
  const savedCart = localStorage.getItem("cart");
  if (savedCart) {
    cartItems = JSON.parse(savedCart);
  }
  // Ensure all cart items have images assigned
  // Also replace any placeholder URLs with correct bangle images
  return cartItems.map(item => {
    const hasPlaceholder = item.image && item.image.includes('via.placeholder');
    const needsImage = !item.image || hasPlaceholder || !item.images || item.images.length === 0;
    
    if (needsImage) {
      const image = getProductImage(item.id);
      return {
        ...item,
        image: image,
        images: [image, image]
      };
    }
    return item;
  });
};

// Add item to cart via API
export const addItemToCartAPI = async (userId, productId, quantity, price) => {
  try {
    const response = await axios.post(`${BASE_URL}/cart/item`, {
      product_id: productId,
      quantity: quantity,
      price: price
    });
    return response.data;
  } catch (error) {
    console.error("Error adding item to cart via API:", error);
    throw error;
  }
};

export const addToCart = async (product, size = null, quantity = 1, userId = null) => {
  // First, update localStorage immediately for responsive UI
  const cart = getCartItems();
  // Normalize size for consistent comparison
  const normalizedSize = size || "default";
  const existingItemIndex = cart.findIndex(
    (item) => item.id === product.id && (item.selectedSize || "default") === normalizedSize
  );

  if (existingItemIndex >= 0) {
    // Item exists - increase quantity but preserve position in array
    cart[existingItemIndex].quantity += quantity;
  } else {
    // New item - add to end to preserve order
    cart.push({
      ...product,
      selectedSize: size,
      quantity: quantity,
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  // If userId is provided, also sync with API
  if (userId) {
    try {
      const priceToUse = product.discounted_price || product.price;
      await addItemToCartAPI(userId, product.id, quantity, priceToUse);
    } catch (error) {
      console.error("Failed to sync cart item to API, but kept in localStorage:", error);
      // Continue even if API call fails - localStorage is already updated
    }
  }

  return cart;
};

export const removeFromCart = (productId, size = null) => {
  const cart = getCartItems();
  // Normalize size to "default" if null/undefined for consistent comparison
  const normalizedSize = size || "default";
  const filteredCart = cart.filter(
    (item) => !(item.id === productId && (item.selectedSize || "default") === normalizedSize)
  );
  localStorage.setItem("cart", JSON.stringify(filteredCart));
  return filteredCart;
};

export const updateCartItemQuantity = (productId, size, quantity) => {
  const cart = getCartItems();
  // Normalize size to "default" if null/undefined for consistent comparison
  const normalizedSize = size || "default";
  const itemIndex = cart.findIndex(
    (item) => item.id === productId && (item.selectedSize || "default") === normalizedSize
  );

  if (itemIndex >= 0) {
    if (quantity <= 0) {
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].quantity = quantity;
    }
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  return cart;
};

export const getCartCount = () => {
  const cart = getCartItems();
  
  // Get unchecked items from localStorage
  const savedUncheckedItems = localStorage.getItem("uncheckedCartItems");
  const uncheckedItems = savedUncheckedItems ? JSON.parse(savedUncheckedItems) : [];
  
  // Create a set of unchecked item keys for quick lookup
  const uncheckedKeys = new Set(
    uncheckedItems.map(item => `${item.id}-${item.selectedSize || "default"}`)
  );
  
  // Filter out unchecked items and count only checked items
  const checkedItems = cart.filter(item => {
    const itemKey = `${item.id}-${item.selectedSize || "default"}`;
    return !uncheckedKeys.has(itemKey);
  });
  
  return checkedItems.reduce((total, item) => total + item.quantity, 0);
};

// Get cart count from API (for real-time count from server)
export const getCartCountFromAPI = async (userId) => {
  try {
    const response = await fetchCartItemsFromAPI(userId);
    const cartItems = response.items || [];
    // Sum all quantities: if item 1 has qty 2 and item 2 has qty 3, total = 5
    return cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
  } catch (error) {
    console.error("Error getting cart count from API:", error);
    // Fallback to localStorage count
    return getCartCount();
  }
};

export const clearCart = () => {
  localStorage.removeItem("cart");
  cartItems = [];
};

export const getCartTotal = () => {
  const cart = getCartItems();
  return cart.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
};

export const getCartMRPTotal = () => {
  const cart = getCartItems();
  return cart.reduce((total, item) => {
    return total + (item.mrp || item.price) * item.quantity;
  }, 0);
};

// Fetch cart items from API
export const fetchCartItemsFromAPI = async (userId) => {
  try {
    const response = await axios.get(`${BASE_URL}/cart/${userId}`);
    
    console.log("Cart API Response:", response.data); // Debug log
    
    if (response.data.success) {
      // The actual data is in response.data.data (array)
      const apiCartItems = response.data.data || 
                          response.data.cart_items || 
                          response.data.items || 
                          response.data.cart || 
                          (Array.isArray(response.data) ? response.data : []);
      
      if (!Array.isArray(apiCartItems) || apiCartItems.length === 0) {
        console.log("No cart items found in API response");
        return { items: [], total_price: null };
      }
      
      console.log("Cart items array:", apiCartItems); // Debug log
      
      // Get total_price from API response
      const apiTotalPrice = response.data.total_price || response.data.totalPrice || null;
      
      // Map API response to our cart item format
      const mappedItems = apiCartItems.map(item => {
        // Handle different field name variations from API
        const itemId = item.product_id || item.item_id || item.id;
        const itemName = item.item_name || item.product_name || item.name;
        const originalPrice = parseFloat(item.price || 0);
        const discountedPrice = parseFloat(item.discounted_price) || originalPrice;
        const discountPercent = parseFloat(item.discount_percent) || 0;
        const itemQuantity = parseInt(item.quantity || 1);
        const itemSize = item.size || item.selectedSize || null;
        const itemDescription = item.description || item.item_name || item.product_name || item.name || "";
        const itemRating = item.rating || 4.0;
        const itemSizes = item.sizes || [];
        const itemCategory = item.category || item.category_name || "";
        
        const image = getProductImage(itemId);
        
        const mappedItem = {
          id: itemId,
          name: itemName,
          price: originalPrice, // Original price (to be shown crossed out)
          discounted_price: discountedPrice, // Discounted price (main price to display)
          discount_percent: discountPercent, // Discount percentage
          quantity: itemQuantity,
          selectedSize: itemSize,
          image: image,
          images: [image, image],
          description: itemDescription,
          rating: itemRating,
          sizes: itemSizes,
          category: itemCategory,
          order_item_id: item.order_item_id, // Keep order_item_id for reference
          total_price: item.total_price ? parseFloat(item.total_price) : (discountedPrice * itemQuantity)
        };
        
        console.log("Mapped item:", mappedItem); // Debug log
        return mappedItem;
      });
      
      return { items: mappedItems, total_price: apiTotalPrice };
    } else {
      console.log("API returned success: false");
      return { items: [], total_price: null };
    }
  } catch (error) {
    console.error("Error fetching cart items:", error);
    console.error("Error details:", error.response?.data || error.message);
    // Return empty array on error to show API data only
    return { items: [], total_price: null };
  }
};

// Sync cart items from API to localStorage (called after login)
export const syncCartItemsFromAPI = async (userId) => {
  try {
    const response = await fetchCartItemsFromAPI(userId);
    const apiCartItems = response.items || [];
    // Update localStorage with cart items from API
    localStorage.setItem("cart", JSON.stringify(apiCartItems));
    return apiCartItems;
  } catch (error) {
    console.error("Error syncing cart items:", error);
    // On error, keep existing localStorage cart
    return getCartItems();
  }
};

