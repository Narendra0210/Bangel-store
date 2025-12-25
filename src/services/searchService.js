// Search service for efficient product searching
import { getAllProducts } from "./productService";

// Debounce function for search input
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Search products by query - searches in name, description, and category
export const searchProducts = (query, category = "All") => {
  if (!query || query.trim() === "") {
    return getAllProducts();
  }

  const searchTerm = query.toLowerCase().trim();
  const allProducts = getAllProducts();

  // Filter by category first if not "All"
  let products = category === "All" 
    ? allProducts 
    : allProducts.filter(product => product.category === category);

  // Search in name, description, and category
  return products.filter((product) => {
    const nameMatch = product.name?.toLowerCase().includes(searchTerm);
    const descriptionMatch = product.description?.toLowerCase().includes(searchTerm);
    const categoryMatch = product.category?.toLowerCase().includes(searchTerm);
    
    return nameMatch || descriptionMatch || categoryMatch;
  });
};

// Get search suggestions based on query
export const getSearchSuggestions = (query, limit = 5) => {
  if (!query || query.trim() === "") {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();
  const allProducts = getAllProducts();

  // Get unique product names that match
  const suggestions = [];
  const seen = new Set();

  for (const product of allProducts) {
    if (suggestions.length >= limit) break;
    
    const name = product.name?.toLowerCase() || "";
    if (name.includes(searchTerm) && !seen.has(product.name)) {
      suggestions.push({
        id: product.id,
        name: product.name,
        category: product.category
      });
      seen.add(product.name);
    }
  }

  return suggestions;
};

// Highlight search term in text
export const highlightSearchTerm = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  
  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
};

