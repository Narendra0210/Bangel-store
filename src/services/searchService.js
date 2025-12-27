// Enhanced Search service with tokenization, normalization, scoring, and ranking
import { getAllProducts } from "./productService";

// Product index cache
let productIndex = null;
let indexVersion = 0;

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

/**
 * Tokenize and normalize search text
 * @param {string} text - Input text to tokenize
 * @returns {string[]} - Array of normalized tokens
 */
const tokenizeAndNormalize = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  return text
    .toLowerCase()
    .trim()
    // Remove special characters except spaces and hyphens
    .replace(/[^\w\s-]/g, ' ')
    // Split by whitespace and hyphens
    .split(/[\s-]+/)
    // Remove empty strings
    .filter(token => token.length > 0)
    // Remove common stop words (optional - can be expanded)
    .filter(token => {
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      return !stopWords.includes(token) && token.length > 1;
    });
};

/**
 * Build product index for fast searching
 * @returns {Object} - Product index with tokens mapped to product IDs
 */
const buildProductIndex = () => {
  const products = getAllProducts();
  const index = {
    tokens: {}, // token -> Set of product IDs
    products: {}, // product ID -> full product data
    version: indexVersion++
  };

  products.forEach(product => {
    // Store product data
    index.products[product.id] = product;

    // Tokenize product fields
    const fields = [
      product.name || '',
      product.description || '',
      product.category || ''
    ];

    fields.forEach(field => {
      const tokens = tokenizeAndNormalize(field);
      tokens.forEach(token => {
        if (!index.tokens[token]) {
          index.tokens[token] = new Set();
        }
        index.tokens[token].add(product.id);
      });
    });
  });

  return index;
};

/**
 * Get or build product index
 * @returns {Object} - Product index
 */
const getProductIndex = () => {
  if (!productIndex) {
    productIndex = buildProductIndex();
  }
  return productIndex;
};

/**
 * Calculate relevance score for a product
 * @param {Object} product - Product object
 * @param {string[]} queryTokens - Normalized search tokens
 * @returns {number} - Relevance score
 */
const calculateRelevanceScore = (product, queryTokens) => {
  let score = 0;
  const name = (product.name || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const fullText = `${name} ${description} ${category}`.toLowerCase();

  queryTokens.forEach(token => {
    // Exact name match (highest weight)
    if (name === token) {
      score += 100;
    } else if (name.startsWith(token)) {
      score += 50;
    } else if (name.includes(token)) {
      score += 30;
    }

    // Word boundary matches in name (higher weight)
    const nameWordBoundaryRegex = new RegExp(`\\b${token}\\b`, 'i');
    if (nameWordBoundaryRegex.test(name)) {
      score += 20;
    }

    // Description match (medium weight)
    if (description.includes(token)) {
      score += 15;
    }

    // Category match (medium weight)
    if (category.includes(token)) {
      score += 20;
    }

    // Partial token matches (lower weight)
    if (fullText.includes(token)) {
      score += 5;
    }
  });

  return score;
};

/**
 * Calculate business signal score
 * @param {Object} product - Product object
 * @returns {number} - Business signal score
 */
const calculateBusinessSignalScore = (product) => {
  let score = 0;

  // Rating boost (higher rating = higher score)
  const rating = parseFloat(product.rating) || 0;
  score += rating * 10; // Max 50 points for 5.0 rating

  // Ratings count boost (more reviews = more trust)
  const ratingsCount = parseInt(product.ratingsCount) || 0;
  score += Math.min(Math.log10(ratingsCount + 1) * 5, 20); // Max 20 points

  // Discount boost (higher discount = more attractive)
  const originalPrice = parseFloat(product.price) || 0;
  const discountedPrice = parseFloat(product.discounted_price) || originalPrice;
  const discountPercent = parseFloat(product.discount_percent) || 0;
  
  if (discountPercent > 0 || discountedPrice < originalPrice) {
    const discount = originalPrice > 0 ? ((originalPrice - discountedPrice) / originalPrice) * 100 : 0;
    score += Math.min(discount * 0.5, 15); // Max 15 points for 30%+ discount
  }

  // Popularity boost (can be enhanced with actual sales data)
  // For now, using ratings count as popularity proxy
  if (ratingsCount > 100) {
    score += 10;
  } else if (ratingsCount > 50) {
    score += 5;
  }

  return score;
};

/**
 * Search products with advanced scoring and ranking
 * @param {string} query - Search query
 * @param {string} category - Category filter (default: "All")
 * @param {Object} options - Search options (page, limit, sortBy)
 * @returns {Object} - Search results with products and metadata
 */
export const searchProducts = (query, category = "All", options = {}) => {
  const {
    page = 1,
    limit = 100, // Default to show all, can be paginated
    sortBy = 'relevance' // 'relevance', 'price-asc', 'price-desc', 'rating'
  } = options;

  // If no query, return all products (optionally filtered by category)
  if (!query || query.trim() === "") {
    const allProducts = getAllProducts();
    let filtered = category === "All" 
      ? allProducts 
      : allProducts.filter(product => product.category === category);
    
    // Apply sorting
    filtered = sortProducts(filtered, sortBy);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      products: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit)
    };
  }

  // Tokenize and normalize search query
  const queryTokens = tokenizeAndNormalize(query);
  
  if (queryTokens.length === 0) {
    return {
      products: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 0
    };
  }

  // Get product index
  const index = getProductIndex();
  
  // Find matching products using index
  const matchingProductIds = new Set();
  
  queryTokens.forEach(token => {
    if (index.tokens[token]) {
      index.tokens[token].forEach(productId => {
        matchingProductIds.add(productId);
      });
    }
  });

  // If no matches found, try fuzzy matching (partial token matches)
  if (matchingProductIds.size === 0) {
    Object.keys(index.tokens).forEach(indexToken => {
      queryTokens.forEach(queryToken => {
        if (indexToken.includes(queryToken) || queryToken.includes(indexToken)) {
          index.tokens[indexToken].forEach(productId => {
            matchingProductIds.add(productId);
          });
        }
      });
    });
  }

  // Score and rank products
  const scoredProducts = Array.from(matchingProductIds).map(productId => {
    const product = index.products[productId];
    
    // Calculate relevance score
    const relevanceScore = calculateRelevanceScore(product, queryTokens);
    
    // Calculate business signal score
    const businessScore = calculateBusinessSignalScore(product);
    
    // Combined score (weighted)
    const totalScore = relevanceScore * 0.7 + businessScore * 0.3;
    
    return {
      ...product,
      _relevanceScore: relevanceScore,
      _businessScore: businessScore,
      _totalScore: totalScore
    };
  });

  // Filter by category if specified
  let filtered = category === "All" 
    ? scoredProducts 
    : scoredProducts.filter(product => product.category === category);

  // Sort by relevance score (default) or other criteria
  if (sortBy === 'relevance') {
    filtered.sort((a, b) => b._totalScore - a._totalScore);
  } else {
    filtered = sortProducts(filtered, sortBy);
  }

  // Remove scoring metadata before returning (optional - can keep for debugging)
  const products = filtered.map(({ _relevanceScore, _businessScore, _totalScore, ...product }) => product);

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    products: products.slice(startIndex, endIndex),
    total: products.length,
    page,
    limit,
    totalPages: Math.ceil(products.length / limit)
  };
};

/**
 * Sort products by various criteria
 * @param {Array} products - Array of products
 * @param {string} sortBy - Sort criteria
 * @returns {Array} - Sorted products
 */
const sortProducts = (products, sortBy) => {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price-asc':
      sorted.sort((a, b) => {
        const priceA = parseFloat(a.discounted_price) || parseFloat(a.price) || 0;
        const priceB = parseFloat(b.discounted_price) || parseFloat(b.price) || 0;
        return priceA - priceB;
      });
      break;
    
    case 'price-desc':
      sorted.sort((a, b) => {
        const priceA = parseFloat(a.discounted_price) || parseFloat(a.price) || 0;
        const priceB = parseFloat(b.discounted_price) || parseFloat(b.price) || 0;
        return priceB - priceA;
      });
      break;
    
    case 'rating':
      sorted.sort((a, b) => {
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        return ratingB - ratingA;
      });
      break;
    
    case 'relevance':
    default:
      // Already sorted by relevance in searchProducts
      break;
  }
  
  return sorted;
};

/**
 * Get search suggestions based on query
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of suggestions
 * @returns {Array} - Array of suggestion objects
 */
export const getSearchSuggestions = (query, limit = 5) => {
  if (!query || query.trim() === "") {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length === 0) {
    return [];
  }

  const index = getProductIndex();
  const matchingProductIds = new Set();
  
  // For single character or short queries, do prefix matching on all tokens
  if (normalizedQuery.length <= 2) {
    // Find all tokens that start with the query
    Object.keys(index.tokens).forEach(token => {
      if (token.startsWith(normalizedQuery)) {
        index.tokens[token].forEach(productId => {
          matchingProductIds.add(productId);
        });
      }
    });
  } else {
    // For longer queries, use tokenization
    const queryTokens = tokenizeAndNormalize(query);
    if (queryTokens.length > 0) {
      // Find products matching the query tokens
      queryTokens.forEach(token => {
        if (index.tokens[token]) {
          index.tokens[token].forEach(productId => {
            matchingProductIds.add(productId);
          });
        }
      });
      
      // Also do prefix matching for partial matches
      Object.keys(index.tokens).forEach(token => {
        queryTokens.forEach(queryToken => {
          if (token.startsWith(queryToken) || queryToken.startsWith(token)) {
            index.tokens[token].forEach(productId => {
              matchingProductIds.add(productId);
            });
          }
        });
      });
    } else {
      // Fallback: prefix match on all tokens
      Object.keys(index.tokens).forEach(token => {
        if (token.startsWith(normalizedQuery)) {
          index.tokens[token].forEach(productId => {
            matchingProductIds.add(productId);
          });
        }
      });
    }
  }

  // Score and sort suggestions
  const queryTokens = normalizedQuery.length <= 2 
    ? [normalizedQuery] 
    : tokenizeAndNormalize(query);
  
  const suggestions = Array.from(matchingProductIds)
    .map(productId => {
      const product = index.products[productId];
      const score = calculateRelevanceScore(product, queryTokens);
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        _score: score
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...suggestion }) => suggestion);

  return suggestions;
};

/**
 * Highlight search term in text
 * @param {string} text - Text to highlight
 * @param {string} searchTerm - Search term to highlight
 * @returns {string} - Text with highlighted search term
 */
export const highlightSearchTerm = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  
  const tokens = tokenizeAndNormalize(searchTerm);
  let highlightedText = text;
  
  tokens.forEach(token => {
    const regex = new RegExp(`(${token})`, "gi");
    highlightedText = highlightedText.replace(regex, "<mark>$1</mark>");
  });
  
  return highlightedText;
};

/**
 * Invalidate product index (call when products are updated)
 */
export const invalidateProductIndex = () => {
  productIndex = null;
};
