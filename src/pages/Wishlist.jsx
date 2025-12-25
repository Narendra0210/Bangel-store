import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { X } from "lucide-react";
import { FaRegHeart, FaHeart } from "react-icons/fa6";
import { getWishlistItems, removeFromWishlist, isInWishlist, fetchWishlistItemsFromAPI } from "../services/wishlistService";
import { addToCart, getCartCount } from "../services/cartService";
import { searchProducts } from "../services/searchService";
import { initializeProducts, getCategoriesWithIcons } from "../services/productService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Header from "../components/common/Header";
import "../styles/Wishlist.css";
import "../styles/Home.css";

const Wishlist = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlistItems = async () => {
      setLoading(true);
      try {
        if (user?.user_id) {
          // Fetch wishlist items from API
          const apiWishlistItems = await fetchWishlistItemsFromAPI(user.user_id);
          setWishlistItems(apiWishlistItems);
          // Also update localStorage
          localStorage.setItem("wishlist", JSON.stringify(apiWishlistItems));
        } else {
          // Fallback to localStorage if user_id is not available
          const items = getWishlistItems();
          setWishlistItems(items);
        }
      } catch (error) {
        console.error("Error loading wishlist items:", error);
        // Fallback to localStorage on error
        const items = getWishlistItems();
        setWishlistItems(items);
      } finally {
        setLoading(false);
      }
    };

    loadWishlistItems();
    
    // Get cart count from localStorage only
    setCartCount(getCartCount());
  }, [user?.user_id]);

  // Initialize products and get categories from API
  useEffect(() => {
    const loadCategories = async () => {
      await initializeProducts();
      const apiCategories = getCategoriesWithIcons();
      setCategories(apiCategories);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    // Update cart count from localStorage only (no API call)
    setCartCount(getCartCount());
    
    const handleWishlistUpdate = async () => {
      // Reload wishlist items from API if user is logged in
      if (user?.user_id) {
        try {
          const apiWishlistItems = await fetchWishlistItemsFromAPI(user.user_id);
          setWishlistItems(apiWishlistItems);
          localStorage.setItem("wishlist", JSON.stringify(apiWishlistItems));
        } catch (error) {
          // Fallback to localStorage on error
          const items = getWishlistItems();
          setWishlistItems(items);
        }
      } else {
        const items = getWishlistItems();
        setWishlistItems(items);
      }
    };
    window.addEventListener("wishlistUpdated", handleWishlistUpdate);
    
    return () => {
      window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
    };
  }, [user?.user_id]);

  const handleRemoveItem = async (productId) => {
    const result = await removeFromWishlist(productId, user?.user_id);
    if (result && result.message) {
      showToast(result.message, "success");
    }
    window.dispatchEvent(new Event("wishlistUpdated"));
  };

  const handleMoveToBag = async (product) => {
    try {
      await addToCart(product, null, 1, user?.user_id);
      // Remove item from wishlist after adding to cart (silently, no message)
      await removeFromWishlist(product.id, user?.user_id);
      
      // Update wishlist items state
      const updatedWishlist = getWishlistItems();
      setWishlistItems(updatedWishlist);
      
      // Update cart count from localStorage only (no API call)
      setCartCount(getCartCount());
      
      // Show "moved to bag" message instead of remove API message
      showToast("Product moved to bag!", "success");
      
      // Dispatch wishlist update event
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      // Cart is already updated in localStorage, just show success
      setCartCount(getCartCount());
      showToast("Product moved to bag!", "success");
    }
  };

  const formatPrice = (price) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  // Filter wishlist items based on selected category and search query
  const filteredWishlistItems = useMemo(() => {
    let filtered = selectedCategory === "All"
      ? wishlistItems
      : wishlistItems.filter((item) => item.category === selectedCategory);
    
    // Apply search filter if search query exists
    if (searchQuery && searchQuery.trim() !== "") {
      const searchTerm = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const nameMatch = item.name?.toLowerCase().includes(searchTerm);
        const descriptionMatch = item.description?.toLowerCase().includes(searchTerm);
        const categoryMatch = item.category?.toLowerCase().includes(searchTerm);
        return nameMatch || descriptionMatch || categoryMatch;
      });
    }
    
    return filtered;
  }, [wishlistItems, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="wishlist-page">
        <Header
          pageType="wishlist"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          onSearchKeyPress={(e) => {}}
          searchPlaceholder="Search in wishlist..."
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          cartCount={cartCount}
          activeNavItem="wishlist"
        />
        <div className="wishlist-container">
          <div className="loading-container" style={{ textAlign: "center", padding: "50px" }}>
            <p>Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <Header
        pageType="wishlist"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        onSearchKeyPress={(e) => {
          // Search is handled locally via filteredWishlistItems
          // No need to navigate, just filter the list
        }}
        searchPlaceholder="Search in wishlist..."
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        cartCount={cartCount}
        activeNavItem="wishlist"
      />

      {/* Wishlist Content */}
      <div className="wishlist-container">
        <h1 className="wishlist-title">
          My Wishlist <span className="item-count">{filteredWishlistItems.length} items</span>
        </h1>

        {filteredWishlistItems.length > 0 ? (
          <div className="wishlist-grid">
            {filteredWishlistItems.map((item) => {
              const discount = item.mrp ? item.mrp - item.price : 0;
              const discountPercentage = item.mrp
                ? Math.round((discount / item.mrp) * 100)
                : 0;
              return (
                <Link
                  key={item.id}
                  to={`/product/${item.id}`}
                  className="wishlist-item-card-link"
                >
                  <div className="wishlist-item-card">
                    <div className="wishlist-item-image">
                      <img
                        src={item.images?.[0] || item.image}
                        alt={item.name}
                      />
                      <button
                        className="remove-wishlist-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveItem(item.id);
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="wishlist-item-details">
                      <h3 className="wishlist-item-name">{item.name}</h3>
                      <div className="wishlist-item-pricing">
                        <span className="wishlist-current-price">
                          {formatPrice(item.price)}
                        </span>
                        {item.mrp && (
                          <>
                            <span className="wishlist-mrp-price">
                              {formatPrice(item.mrp)}
                            </span>
                            <span className="wishlist-discount">
                              {discountPercentage > 0
                                ? `(${discountPercentage}% OFF)`
                                : `(Rs. ${discount.toLocaleString("en-IN")} OFF)`}
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        className="move-to-bag-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMoveToBag(item);
                        }}
                      >
                        MOVE TO BAG
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-wishlist">
            <FaRegHeart size={64} className="empty-wishlist-icon" />
            <p className="empty-wishlist-text">
              {searchQuery && searchQuery.trim() !== ""
                ? "No items found matching your search"
                : selectedCategory === "All"
                ? "Your wishlist is empty"
                : `No ${selectedCategory} items in your wishlist`}
            </p>
            <Link to="/home" className="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="bottom-nav">
        <Link to="/home" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </Link>
        <Link to="/profile" className="nav-item">
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </Link>
        <div className="nav-item active" onClick={() => navigate("/wishlist")}>
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
      </nav>
    </div>
  );
};

export default Wishlist;

