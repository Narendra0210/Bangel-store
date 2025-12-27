import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductById, initializeProducts, getCategoriesWithIcons } from "../services/productService";
import { addToCart, getCartCount, getCartCountFromAPI } from "../services/cartService";
import { ShoppingBag, LogOut } from "lucide-react";
import { FaRegHeart, FaHeart, FaCartShopping } from "react-icons/fa6";
import { CgProfile } from "react-icons/cg";
import { IoHome } from "react-icons/io5";
import { isInWishlist, addToWishlist, removeFromWishlist } from "../services/wishlistService";
import { getSearchSuggestions, debounce } from "../services/searchService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Header from "../components/common/Header";
import "../styles/ProductDetail.css";
import "../styles/Home.css";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [categories, setCategories] = useState([]);

  // Initialize products and get categories from API
  useEffect(() => {
    const loadCategories = async () => {
      await initializeProducts();
      const apiCategories = getCategoriesWithIcons();
      setCategories(apiCategories);
    };
    loadCategories();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const productData = getProductById(parseInt(id));
    setProduct(productData);
    if (productData && productData.sizes && productData.sizes.length > 0) {
      setSelectedSize(productData.sizes[0]);
    }
    
    // Update cart count
    const updateCartCount = async () => {
      if (user?.user_id) {
        try {
          const count = await getCartCountFromAPI(user.user_id);
          setCartCount(count);
        } catch (error) {
          setCartCount(getCartCount());
        }
      } else {
        setCartCount(getCartCount());
      }
    };
    updateCartCount();
    
    if (productData) {
      setInWishlist(isInWishlist(productData.id));
    }
  }, [id, user?.user_id]);

  useEffect(() => {
    const handleWishlistUpdate = () => {
      if (product) {
        setInWishlist(isInWishlist(product.id));
      }
    };
    window.addEventListener("wishlistUpdated", handleWishlistUpdate);
    return () => window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
  }, [product]);

  // Debounced search suggestions for autocomplete
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
      }, 150),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearchSuggestions(value);
  };

  // Handle search suggestion click
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    navigate(`/product/${suggestion.id}`);
  };

  if (!product) {
    return (
      <div className="product-detail-container">
        <div className="loading">Product not found</div>
      </div>
    );
  }

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "₹0";
    }
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  const discountedPrice = Number(product.discounted_price) || Number(product.price) || 0;
  const originalPrice = Number(product.price) || 0;
  const discountPercent = Number(product.discount_percent) || 0;
  const discount = originalPrice - discountedPrice;
  const discountPercentage = originalPrice > 0 ? Math.round((discount / originalPrice) * 100) : 0;

  const handleAddToBag = async () => {
    if (product) {
      try {
        await addToCart(product, selectedSize || null, 1, user?.user_id);
        // Update cart count from API
        if (user?.user_id) {
          try {
            const count = await getCartCountFromAPI(user.user_id);
            setCartCount(count);
          } catch (error) {
            setCartCount(getCartCount());
          }
        } else {
          setCartCount(getCartCount());
        }
        showToast("Product added to bag!", "success");
      } catch (error) {
        // Cart is already updated in localStorage, just show error toast
        setCartCount(getCartCount());
        showToast("Product added to bag! (Sync pending)", "success");
      }
    }
  };

  const handleBuyNow = async () => {
    if (product) {
      try {
        await addToCart(product, selectedSize || null, 1, user?.user_id);
        navigate("/order-details");
      } catch (error) {
        // Cart is already updated in localStorage, navigate anyway
        navigate("/order-details");
      }
    }
  };

  return (
    <div className="product-detail-page">
      <Header
        pageType="product"
        showSearchSuggestions={true}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchSuggestions={searchSuggestions}
        showSuggestions={showSuggestions}
        onSearchChange={handleSearchChange}
        onSearchKeyPress={(e) => {
          if (e.key === "Enter") {
            setShowSuggestions(false);
            if (searchQuery.trim() !== "") {
              navigate(`/home?q=${encodeURIComponent(searchQuery)}`);
            } else {
              navigate("/home");
            }
          }
        }}
        onSuggestionClick={handleSuggestionClick}
        onSearchFocus={() => {
          if (searchSuggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onSearchBlur={() => {
          // Shorter delay on desktop for better single-click experience
          const isDesktop = window.innerWidth >= 768;
          setTimeout(() => setShowSuggestions(false), isDesktop ? 100 : 200);
        }}
        searchPlaceholder="Search for products..."
        categories={categories}
        selectedCategory=""
        onCategoryChange={() => navigate("/home")}
        cartCount={cartCount}
        onLogout={handleLogout}
      />

      {/* Product Detail Content */}
      <div className="product-detail-container">
        <div className="product-detail-wrapper">
          {/* Product Images */}
          <div className="product-images-section">
            <div className="main-image">
              <img
                src={product.images?.[selectedImageIndex] || product.image}
                alt={product.name}
              />
              <button
                className="wishlist-icon-btn product-detail-wishlist"
                onClick={async () => {
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
                  setInWishlist(!inWishlist);
                  window.dispatchEvent(new Event("wishlistUpdated"));
                }}
              >
                {inWishlist ? (
                  <FaHeart size={24} className="wishlist-icon filled" />
                ) : (
                  <FaRegHeart size={24} className="wishlist-icon" />
                )}
              </button>
            </div>
          </div>

          {/* Product Details */}
          <div className="product-details-section">
            <h1 className="product-title">{product.name}</h1>
            <p className="product-description">{product.description}</p>

            {/* Rating */}
            <div className="product-rating">
              <span className="rating-value">{product.rating}</span>
              <span className="stars">★★★★★</span>
              <span className="ratings-count">({product.ratingsCount} Ratings)</span>
            </div>

            {/* Price */}
            <div className="product-price-section">
              <div className="current-price">{formatPrice(discountedPrice)}</div>
              {discountedPrice < originalPrice && originalPrice > 0 && (
                <>
                  <div className="mrp">
                    <span className="mrp-label">MRP</span>
                    <span className="mrp-value" style={{ textDecoration: 'line-through' }}>{formatPrice(originalPrice)}</span>
                  </div>
                  {(discount > 0 || discountPercent > 0) && (
                    <div className="discount">
                      (₹{Number(discount).toLocaleString("en-IN")} OFF - {discountPercent > 0 ? discountPercent : discountPercentage}%)
                    </div>
                  )}
                </>
              )}
              <div className="tax-info">inclusive of all taxes</div>
            </div>

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="size-selection">
                <div className="size-header">
                  <span className="size-title">SELECT SIZE</span>
                  <span className="size-chart-link">SIZE CHART &gt;</span>
                </div>
                <div className="size-options">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className={`size-button ${selectedSize === size ? "selected" : ""} ${size === "2.4" ? "unavailable" : ""}`}
                      onClick={() => setSelectedSize(size)}
                      disabled={size === "2.4"}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="add-to-bag-btn" onClick={handleAddToBag}>
                <ShoppingBag size={20} />
                ADD TO BAG
              </button>
              <button className="buy-now-btn" onClick={handleBuyNow}>
                BUY NOW
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="bottom-nav">
        <Link to="/home" className="nav-item active">
          <span className="nav-icon">
            <IoHome size={22} />
          </span>
          <span className="nav-label">Home</span>
        </Link>
        <Link to="/profile" className="nav-item">
          <span className="nav-icon">
            <CgProfile size={22} />
          </span>
          <span className="nav-label">Profile</span>
        </Link>
        <div className="nav-item" onClick={() => navigate("/wishlist")}>
          <span className="nav-icon">
            <FaRegHeart size={22} />
          </span>
          <span className="nav-label">Wishlist</span>
        </div>
        <Link to="/order-details" className="nav-item">
          <span className="nav-icon">
            <FaCartShopping size={22} />
          </span>
          <span className="nav-label">Cart</span>
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

export default ProductDetail;

