// Wishlist service to manage wishlist items
import axios from "axios";
import { getProductImage } from "./productService";

const BASE_URL = "https://ecommerce-node-api-1-8ug3.onrender.com/api";

let wishlistItems = [];

export const getWishlistItems = () => {
  const savedWishlist = localStorage.getItem("wishlist");
  if (savedWishlist) {
    wishlistItems = JSON.parse(savedWishlist);
  }
  // Ensure all wishlist items have images assigned
  // Also replace any placeholder URLs with correct bangle images
  return wishlistItems.map(item => {
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

// Add item to wishlist via API
export const addItemToWishlistAPI = async (userId, productId) => {
  try {
    const response = await axios.post(`${BASE_URL}/wishlist/add`, {
      user_id: userId,
      product_id: productId
    });
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || "Item added to wishlist"
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Failed to add item to wishlist"
      };
    }
  } catch (error) {
    console.error("Error adding item to wishlist via API:", error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to add item to wishlist. Please try again."
    };
  }
};

export const addToWishlist = async (product, userId = null) => {
  const wishlist = getWishlistItems();
  const existingItem = wishlist.find((item) => item.id === product.id);

  if (!existingItem) {
    // First, update localStorage immediately for responsive UI
    wishlist.push(product);
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
    
    // If userId is provided, also sync with API
    if (userId) {
      try {
        const response = await addItemToWishlistAPI(userId, product.id);
        if (response.success && response.message) {
          return {
            wishlist,
            message: response.message
          };
        } else {
          // API call succeeded but no message, or success is false
          return {
            wishlist,
            message: response.message || "Item added to wishlist"
          };
        }
      } catch (error) {
        console.error("Failed to sync wishlist item to API, but kept in localStorage:", error);
        // Continue even if API call fails - localStorage is already updated
        return {
          wishlist,
          message: "Item added to wishlist (local only)"
        };
      }
    } else {
      // User not logged in, but item was added to localStorage
      return {
        wishlist,
        message: "Item added to wishlist"
      };
    }
  }
  return {
    wishlist,
    message: null // No message if item already exists
  };
};

// Remove item from wishlist via API
export const removeItemFromWishlistAPI = async (userId, productId) => {
  try {
    const response = await axios.delete(`${BASE_URL}/wishlist/remove`, {
      data: {
        user_id: userId,
        product_id: productId
      }
    });
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || "Item removed from wishlist"
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Failed to remove item from wishlist"
      };
    }
  } catch (error) {
    console.error("Error removing item from wishlist via API:", error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to remove item from wishlist. Please try again."
    };
  }
};

export const removeFromWishlist = async (productId, userId = null) => {
  const wishlist = getWishlistItems();
  const filteredWishlist = wishlist.filter((item) => item.id !== productId);
  
  // First, update localStorage immediately for responsive UI
  localStorage.setItem("wishlist", JSON.stringify(filteredWishlist));
  
  // If userId is provided, also sync with API
  if (userId) {
    try {
      const response = await removeItemFromWishlistAPI(userId, productId);
      if (response.success && response.message) {
        return {
          wishlist: filteredWishlist,
          message: response.message
        };
      } else {
        // API call succeeded but no message, or success is false
        return {
          wishlist: filteredWishlist,
          message: response.message || "Item removed from wishlist"
        };
      }
    } catch (error) {
      console.error("Failed to sync wishlist removal to API, but kept in localStorage:", error);
      // Continue even if API call fails - localStorage is already updated
      return {
        wishlist: filteredWishlist,
        message: "Item removed from wishlist (local only)"
      };
    }
  } else {
    // User not logged in, but item was removed from localStorage
    return {
      wishlist: filteredWishlist,
      message: "Item removed from wishlist"
    };
  }
};

export const isInWishlist = (productId) => {
  const wishlist = getWishlistItems();
  return wishlist.some((item) => item.id === productId);
};

export const getWishlistCount = () => {
  const wishlist = getWishlistItems();
  return wishlist.length;
};

export const clearWishlist = () => {
  localStorage.removeItem("wishlist");
  wishlistItems = [];
};

// Fetch wishlist items from API
export const fetchWishlistItemsFromAPI = async (userId) => {
  try {
    const response = await axios.get(`${BASE_URL}/wishlist/${userId}`);
    
    console.log("Wishlist API Response:", response.data); // Debug log
    
    if (response.data.success) {
      // The actual data is in response.data.data (array)
      const apiWishlistItems = response.data.data || 
                               response.data.wishlist_items || 
                               response.data.items || 
                               response.data.wishlist || 
                               (Array.isArray(response.data) ? response.data : []);
      
      if (!Array.isArray(apiWishlistItems) || apiWishlistItems.length === 0) {
        console.log("No wishlist items found in API response");
        return [];
      }
      
      console.log("Wishlist items array:", apiWishlistItems); // Debug log
      
      // Map API response to our wishlist item format
      return apiWishlistItems.map(item => {
        // Handle different field name variations from API
        const itemId = item.product_id || item.item_id || item.id;
        const itemName = item.item_name || item.product_name || item.name;
        const itemPrice = parseFloat(item.price || 0);
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
          image: image,
          images: [image, image],
          description: itemDescription,
          rating: itemRating,
          sizes: itemSizes,
          category: itemCategory
        };
        
        console.log("Mapped wishlist item:", mappedItem); // Debug log
        return mappedItem;
      });
    } else {
      console.log("API returned success: false");
      return [];
    }
  } catch (error) {
    console.error("Error fetching wishlist items:", error);
    console.error("Error details:", error.response?.data || error.message);
    // Return empty array on error to show API data only
    return [];
  }
};

// Sync wishlist items from API to localStorage (called after login)
export const syncWishlistItemsFromAPI = async (userId) => {
  try {
    const apiWishlistItems = await fetchWishlistItemsFromAPI(userId);
    // Update localStorage with wishlist items from API
    localStorage.setItem("wishlist", JSON.stringify(apiWishlistItems));
    return apiWishlistItems;
  } catch (error) {
    console.error("Error syncing wishlist items:", error);
    // On error, keep existing localStorage wishlist
    return getWishlistItems();
  }
};

