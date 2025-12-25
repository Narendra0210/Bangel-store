// Service to fetch categories and items from API
import axios from "axios";

const BASE_URL = "https://ecommerce-node-api-1-8ug3.onrender.com/api";

// Fetch categories and items
export const fetchCategoriesAndItems = async () => {
  try {
    // Token is already set in axios defaults from AuthContext
    const response = await axios.get(`${BASE_URL}/menu/categories-items`);

    if (response.data.success) {
      return {
        success: true,
        categories: response.data.categories || [],
        items: response.data.items || [],
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Failed to fetch categories and items",
        categories: [],
        items: [],
      };
    }
  } catch (error) {
    console.error("Error fetching categories and items:", error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to fetch categories and items",
      categories: [],
      items: [],
    };
  }
};

