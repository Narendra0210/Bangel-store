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
  const existingItemIndex = cart.findIndex(
    (item) => item.id === product.id && item.selectedSize === size
  );

  if (existingItemIndex >= 0) {
    cart[existingItemIndex].quantity += quantity;
  } else {
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
      await addItemToCartAPI(userId, product.id, quantity, product.price);
    } catch (error) {
      console.error("Failed to sync cart item to API, but kept in localStorage:", error);
      // Continue even if API call fails - localStorage is already updated
    }
  }

  return cart;
};

export const removeFromCart = (productId, size = null) => {
  const cart = getCartItems();
  const filteredCart = cart.filter(
    (item) => !(item.id === productId && item.selectedSize === size)
  );
  localStorage.setItem("cart", JSON.stringify(filteredCart));
  return filteredCart;
};

export const updateCartItemQuantity = (productId, size, quantity) => {
  const cart = getCartItems();
  const itemIndex = cart.findIndex(
    (item) => item.id === productId && item.selectedSize === size
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
  return cart.reduce((total, item) => total + item.quantity, 0);
};

// Get cart count from API (for real-time count from server)
export const getCartCountFromAPI = async (userId) => {
  try {
    const cartItems = await fetchCartItemsFromAPI(userId);
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
        return [];
      }
      
      console.log("Cart items array:", apiCartItems); // Debug log
      
      // Map API response to our cart item format
      return apiCartItems.map(item => {
        // Handle different field name variations from API
        const itemId = item.product_id || item.item_id || item.id;
        const itemName = item.item_name || item.product_name || item.name;
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseInt(item.quantity || 1);
        const itemSize = item.size || item.selectedSize || null;
        const itemMRP = item.mrp ? parseFloat(item.mrp) : (itemPrice * 1.5); // Default MRP if not provided
        const itemDescription = item.description || item.item_name || item.product_name || item.name || "";
        const itemRating = item.rating || 4.0;
        const itemSizes = item.sizes || [];
        const itemCategory = item.category || item.category_name || "";
        
        const image = getProductImage(itemId);
        
        const mappedItem = {
          id: itemId,
          name: itemName,
          price: itemPrice,
          mrp: itemMRP,
          quantity: itemQuantity,
          selectedSize: itemSize,
          image: image,
          images: [image, image],
          description: itemDescription,
          rating: itemRating,
          sizes: itemSizes,
          category: itemCategory,
          order_item_id: item.order_item_id, // Keep order_item_id for reference
          total_price: item.total_price ? parseFloat(item.total_price) : (itemPrice * itemQuantity)
        };
        
        console.log("Mapped item:", mappedItem); // Debug log
        return mappedItem;
      });
    } else {
      console.log("API returned success: false");
      return [];
    }
  } catch (error) {
    console.error("Error fetching cart items:", error);
    console.error("Error details:", error.response?.data || error.message);
    // Return empty array on error to show API data only
    return [];
  }
};

// Sync cart items from API to localStorage (called after login)
export const syncCartItemsFromAPI = async (userId) => {
  try {
    const apiCartItems = await fetchCartItemsFromAPI(userId);
    // Update localStorage with cart items from API
    localStorage.setItem("cart", JSON.stringify(apiCartItems));
    return apiCartItems;
  } catch (error) {
    console.error("Error syncing cart items:", error);
    // On error, keep existing localStorage cart
    return getCartItems();
  }
};

