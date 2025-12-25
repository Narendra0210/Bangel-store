// Import API service
import { fetchCategoriesAndItems } from "./categoryItemsService";

// All product images - defined in one place
const PRODUCT_IMAGES = Array.from({ length: 20 }, (_, i) => `/bangle-${i + 1}.jpg`);

// State for products and categories
let products = [];
let categories = [];
let isLoading = false;
let isInitialized = false;

// Helper function to get image for a product by ID
export const getProductImage = (productId) => {
  const index = (productId - 1) % PRODUCT_IMAGES.length; // Use modulo to cycle through images
  return PRODUCT_IMAGES[index] || PRODUCT_IMAGES[0]; // Fallback to first image if ID is out of range
};

// Helper function to ensure product has images assigned
const ensureProductImages = (product) => {
  if (!product) return product;
  const hasPlaceholder = product.image && product.image.includes('via.placeholder');
  const needsImage = !product.image || hasPlaceholder || !product.images || product.images.length === 0;
  
  if (needsImage) {
    const image = getProductImage(product.id);
    return {
      ...product,
      image: image,
      images: [image, image]
    };
  }
  return product;
};

// Transform API items to product format
const transformApiItemsToProducts = (apiItems, apiCategories) => {
  // Create category map for quick lookup
  const categoryMap = {};
  apiCategories.forEach(cat => {
    categoryMap[cat.category_id] = cat.category_name;
  });

  // Transform items to products
  return apiItems.map((item, index) => {
    const price = parseFloat(item.price) || 0;
    const mrp = Math.round(price * 1.5); // Calculate MRP as 50% markup
    const categoryName = categoryMap[item.category_id] || "Other";
    const image = getProductImage(item.item_id);

    return {
      id: item.item_id,
      name: item.item_name,
      price: price,
      mrp: mrp,
      category: categoryName,
      image: image,
      images: [image, image],
      description: `${item.item_name} - Premium quality product`,
      rating: 4.0 + (index % 5) * 0.2, // Random rating between 4.0 and 4.8
      ratingsCount: Math.floor(Math.random() * 500) + 50, // Random count between 50-550
      sizes: [], // Default empty sizes
    };
  });
};

// Mock product data (fallback)
const mockProducts = [
  // Fashion
  { 
    id: 1, 
    name: "Men's T-Shirt", 
    price: 499, 
    mrp: 999,
    category: "Fashion", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Premium Quality Cotton T-Shirt",
    rating: 4.5,
    ratingsCount: 120,
    sizes: ["S", "M", "L", "XL"]
  },
  { 
    id: 2, 
    name: "Women's Dress", 
    price: 1299, 
    mrp: 2599,
    category: "Fashion", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Elegant Designer Women's Dress",
    rating: 4.7,
    ratingsCount: 89,
    sizes: ["XS", "S", "M", "L"]
  },
  { 
    id: 3, 
    name: "Jeans", 
    price: 899, 
    mrp: 1799,
    category: "Fashion", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Classic Fit Denim Jeans",
    rating: 4.3,
    ratingsCount: 156,
    sizes: ["28", "30", "32", "34", "36"]
  },
  { 
    id: 4, 
    name: "Sneakers", 
    price: 1999, 
    mrp: 3999,
    category: "Fashion", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Comfortable Sports Sneakers",
    rating: 4.6,
    ratingsCount: 234,
    sizes: ["6", "7", "8", "9", "10"]
  },
  
  // Mobiles
  { 
    id: 5, 
    name: "Smartphone Pro", 
    price: 24999, 
    mrp: 34999,
    category: "Mobiles", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Latest Smartphone with Advanced Features",
    rating: 4.8,
    ratingsCount: 567,
    sizes: []
  },
  { 
    id: 6, 
    name: "Budget Phone", 
    price: 8999, 
    mrp: 12999,
    category: "Mobiles", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Affordable Smartphone with Great Features",
    rating: 4.4,
    ratingsCount: 312,
    sizes: []
  },
  { 
    id: 7, 
    name: "Premium Phone", 
    price: 59999, 
    mrp: 79999,
    category: "Mobiles", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Flagship Premium Smartphone",
    rating: 4.9,
    ratingsCount: 189,
    sizes: []
  },
  { 
    id: 8, 
    name: "Gaming Phone", 
    price: 34999, 
    mrp: 44999,
    category: "Mobiles", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "High Performance Gaming Smartphone",
    rating: 4.7,
    ratingsCount: 445,
    sizes: []
  },
  
  // Electronics
  { 
    id: 9, 
    name: "Laptop", 
    price: 49999, 
    mrp: 69999,
    category: "Electronics", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "High Performance Laptop",
    rating: 4.6,
    ratingsCount: 278,
    sizes: []
  },
  { 
    id: 10, 
    name: "Headphones", 
    price: 2999, 
    mrp: 4999,
    category: "Electronics", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Wireless Noise Cancelling Headphones",
    rating: 4.5,
    ratingsCount: 412,
    sizes: []
  },
  { 
    id: 11, 
    name: "Smart Watch", 
    price: 4999, 
    mrp: 7999,
    category: "Electronics", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Feature Rich Smart Watch",
    rating: 4.4,
    ratingsCount: 356,
    sizes: []
  },
  { 
    id: 12, 
    name: "Tablet", 
    price: 19999, 
    mrp: 29999,
    category: "Electronics", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Premium Tablet with Large Display",
    rating: 4.6,
    ratingsCount: 223,
    sizes: []
  },
  
  // Appliances
  { 
    id: 13, 
    name: "Washing Machine", 
    price: 24999, 
    mrp: 34999,
    category: "Appliances", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Fully Automatic Washing Machine",
    rating: 4.5,
    ratingsCount: 189,
    sizes: []
  },
  { 
    id: 14, 
    name: "Refrigerator", 
    price: 34999, 
    mrp: 49999,
    category: "Appliances", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Energy Efficient Refrigerator",
    rating: 4.7,
    ratingsCount: 267,
    sizes: []
  },
  { 
    id: 15, 
    name: "Microwave", 
    price: 8999, 
    mrp: 14999,
    category: "Appliances", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Convection Microwave Oven",
    rating: 4.4,
    ratingsCount: 334,
    sizes: []
  },
  { 
    id: 16, 
    name: "Air Conditioner", 
    price: 39999, 
    mrp: 54999,
    category: "Appliances", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Inverter Split AC",
    rating: 4.6,
    ratingsCount: 445,
    sizes: []
  },
  
  // Beauty
  { 
    id: 17, 
    name: "Lipstick", 
    price: 499, 
    mrp: 999,
    category: "Beauty", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Long Lasting Matte Lipstick",
    rating: 4.5,
    ratingsCount: 678,
    sizes: []
  },
  { 
    id: 18, 
    name: "Face Cream", 
    price: 699, 
    mrp: 1299,
    category: "Beauty", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Moisturizing Face Cream",
    rating: 4.3,
    ratingsCount: 512,
    sizes: []
  },
  { 
    id: 19, 
    name: "Perfume", 
    price: 1299, 
    mrp: 2499,
    category: "Beauty", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Premium Fragrance Perfume",
    rating: 4.6,
    ratingsCount: 389,
    sizes: []
  },
  { 
    id: 20, 
    name: "Makeup Kit", 
    price: 2499, 
    mrp: 4999,
    category: "Beauty", 
    image: null, // Will be assigned by map function
    images: [], // Will be assigned by map function
    description: "Complete Makeup Kit with All Essentials",
    rating: 4.7,
    ratingsCount: 456,
    sizes: []
  },
].map(product => ({
  ...product,
  image: getProductImage(product.id),
  images: [getProductImage(product.id), getProductImage(product.id)]
}));

// Initialize products from API
export const initializeProducts = async () => {
  if (isInitialized && !isLoading) {
    return { success: true, products, categories };
  }

  isLoading = true;
  try {
    const result = await fetchCategoriesAndItems();
    
    if (result.success && result.items.length > 0) {
      // Transform API data to products
      products = transformApiItemsToProducts(result.items, result.categories);
      categories = result.categories.map(cat => ({
        id: cat.category_id,
        name: cat.category_name,
      }));
      isInitialized = true;
      isLoading = false;
      return { success: true, products, categories };
    } else {
      // Fallback to mock data if API fails
      console.warn("API fetch failed, using mock data");
      products = mockProducts;
      categories = [
        { id: 1, name: "Fashion" },
        { id: 2, name: "Mobiles" },
        { id: 3, name: "Electronics" },
        { id: 4, name: "Appliances" },
        { id: 5, name: "Beauty" },
      ];
      isInitialized = true;
      isLoading = false;
      return { success: false, products: mockProducts, categories, message: result.message };
    }
  } catch (error) {
    console.error("Error initializing products:", error);
    // Fallback to mock data
    products = mockProducts;
    categories = [
      { id: 1, name: "Fashion" },
      { id: 2, name: "Mobiles" },
      { id: 3, name: "Electronics" },
      { id: 4, name: "Appliances" },
      { id: 5, name: "Beauty" },
    ];
    isInitialized = true;
    isLoading = false;
    return { success: false, products: mockProducts, categories, message: error.message };
  }
};

// Get categories
export const getCategories = () => {
  return categories;
};

// Get categories with icons for display
export const getCategoriesWithIcons = () => {
  const categoryIcons = {
    "Food": "🍔",
    "Beverages": "🥤",
    "Desserts": "🍰",
    "Fashion": "👕",
    "Mobiles": "📱",
    "Electronics": "💻",
    "Appliances": "📺",
    "Beauty": "💄",
  };

  if (categories.length > 0) {
    return [
      { name: "All", icon: "🛍️" },
      ...categories.map(cat => ({
        name: cat.name,
        icon: categoryIcons[cat.name] || "🛍️"
      }))
    ];
  }

  // No fallback categories - return empty array
  return [];
};

export const getProductsByCategory = (category) => {
  let filteredProducts;
  if (category === "All") {
    filteredProducts = products;
  } else {
    filteredProducts = products.filter(product => product.category === category);
  }
  // Ensure all products have images assigned
  return filteredProducts.map(product => ensureProductImages(product));
};

export const getAllProducts = () => {
  // Ensure all products have images assigned
  return products.map(product => ensureProductImages(product));
};

export const getProductById = (id) => {
  const product = products.find(product => product.id === id);
  // Ensure product has images assigned
  return ensureProductImages(product);
};

