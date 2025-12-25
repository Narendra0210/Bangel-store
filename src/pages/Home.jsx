import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { LogOut } from "lucide-react";
import { FaRegHeart, FaHeart } from "react-icons/fa6";
import { getProductsByCategory, initializeProducts, getCategories } from "../services/productService";
import { getCartCount } from "../services/cartService";
import { isInWishlist, addToWishlist, removeFromWishlist } from "../services/wishlistService";
import { searchProducts, debounce, getSearchSuggestions } from "../services/searchService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Header from "../components/common/Header";
import "../styles/Home.css";

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistUpdate, setWishlistUpdate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiCategories, setApiCategories] = useState([]);
  const [productsReady, setProductsReady] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { showToast } = useToast();

  // Initialize products from API
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      const result = await initializeProducts();
      if (result.categories && result.categories.length > 0) {
        // Map API categories to display format with icons
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
        const mappedCategories = [
          { name: "All", icon: "🛍️" },
          ...result.categories.map(cat => ({
            name: cat.name,
            icon: categoryIcons[cat.name] || "🛍️"
          }))
        ];
        setApiCategories(mappedCategories);
      } else {
        // No fallback categories - wait for API
        setApiCategories([]);
      }
      setLoading(false);
      setProductsReady(true);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    setCartCount(getCartCount());
    // Update cart count when component mounts or when navigating back
    const interval = setInterval(() => {
      setCartCount(getCartCount());
    }, 500);
    
    const handleWishlistUpdate = () => {
      setWishlistUpdate(prev => prev + 1);
    };
    window.addEventListener("wishlistUpdated", handleWishlistUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const categories = apiCategories;

  // Use efficient search service
  const filteredProducts = useMemo(() => {
    if (searchQuery && searchQuery.trim() !== "") {
      // Search across all products when search query exists
      return searchProducts(searchQuery, selectedCategory);
    }
    // Otherwise show products by category
    // When "All" is selected, show all products
    return getProductsByCategory(selectedCategory);
  }, [searchQuery, selectedCategory, productsReady, loading]);

  // Debounced search suggestions
  const debouncedSearchSuggestions = useMemo(
    () =>
      debounce((query) => {
        if (query && query.trim() !== "") {
          const suggestions = getSearchSuggestions(query, 5);
          setSearchSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        } else {
          setSearchSuggestions([]);
          setShowSuggestions(false);
        }
      }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Update URL with search query
    if (value.trim() !== "") {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
    
    // Show suggestions
    debouncedSearchSuggestions(value);
  };

  // Handle search suggestion click
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.name);
    setSearchParams({ q: suggestion.name });
    setShowSuggestions(false);
  };

  // Handle search on Enter
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      if (searchQuery.trim() !== "") {
        setSearchParams({ q: searchQuery });
      }
    }
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "₹0";
    }
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  return (
    <div className="home-container">
      <Header
        pageType="home"
        showLocation={true}
        showSearchSuggestions={true}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchSuggestions={searchSuggestions}
        showSuggestions={showSuggestions}
        onSearchChange={handleSearchChange}
        onSearchKeyPress={handleSearchKeyPress}
        onSuggestionClick={handleSuggestionClick}
        onSearchFocus={() => {
          if (searchSuggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onSearchBlur={() => {
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        searchPlaceholder="Search for products..."
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        cartCount={cartCount}
        onLogout={handleLogout}
      />

      {/* Products Grid */}
      <main className="products-section">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Please Wait...</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const inWishlist = isInWishlist(product.id);
                return (
                  <div key={product.id} className="product-card-wrapper">
                    <Link
                      to={`/product/${product.id}`}
                      className="product-card-link"
                    >
                      <div className="product-card">
                        <div className="product-image">
                          <img src={product.image} alt={product.name} />
                          <button
                            className="wishlist-icon-btn"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (inWishlist) {
                                const result = await removeFromWishlist(product.id, user?.user_id);
                                if (result && result.message) {
                                  showToast(result.message, "success");
                                }
                              } else {
                                const result = await addToWishlist(product, user?.user_id);
                                if (result && result.message) {
                                  showToast(result.message, "success");
                                }
                              }
                              // Force re-render
                              window.dispatchEvent(new Event("wishlistUpdated"));
                            }}
                          >
                            {inWishlist ? (
                              <FaHeart size={20} className="wishlist-icon filled" />
                            ) : (
                              <FaRegHeart size={20} className="wishlist-icon" />
                            )}
                          </button>
                        </div>
                        <div className="product-info">
                          <h3 className="product-name">{product.name}</h3>
                          <div className="product-pricing">
                            <div className="price-row">
                              <span className="discounted-price">{formatPrice(product.discounted_price || product.price)}</span>
                              {product.discounted_price && product.price && 
                               Number(product.discounted_price) < Number(product.price) && (
                                <>
                                  <span className="original-price">{formatPrice(product.price)}</span>
                                  {product.discount_percent > 0 && (
                                    <span className="discount-badge">{product.discount_percent}% OFF</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="no-products">
                <p>No products found</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/home" className="nav-item active">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </Link>
        <Link to="/profile" className="nav-item">
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </Link>
        <div className="nav-item" onClick={() => navigate("/wishlist")}>
          <span className="nav-icon">
            <FaRegHeart size={22} />
          </span>
          <span className="nav-label">Wishlist</span>
        </div>
        <Link to="/order-details" className="nav-item">
          <span className="nav-icon">🛒</span>
          <span className="nav-label">Cart</span>
          {cartCount > 0 && (
            <span className="cart-badge">{cartCount}</span>
          )}
        </Link>
        <div className="nav-item logout-item" onClick={handleLogout}>
          <span className="nav-icon">
            <LogOut size={22} />
          </span>
          <span className="nav-label">Logout</span>
        </div>
      </nav>
    </div>
  );
};

export default Home;

