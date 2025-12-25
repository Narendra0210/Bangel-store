import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { FaRegHeart } from "react-icons/fa6";

const Header = ({
  pageType = "home", // 'home', 'product', 'wishlist', 'order', or null
  showLocation = false,
  showSearchSuggestions = false,
  searchQuery = "",
  setSearchQuery = () => {},
  searchSuggestions = [],
  showSuggestions = false,
  onSearchChange = () => {},
  onSearchKeyPress = () => {},
  onSuggestionClick = () => {},
  onSearchFocus = () => {},
  onSearchBlur = () => {},
  searchPlaceholder = "Search for products...",
  categories = [],
  selectedCategory = "All",
  onCategoryChange = () => {},
  cartCount = 0,
  onLogout = () => {},
  activeNavItem = null, // 'wishlist', 'cart', etc.
}) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate("/login");
  };

  // Don't render header for order details page and profile page
  if (pageType === "order" || pageType === "profile" || !pageType) {
    return null;
  }

  const handleCategoryClick = (categoryName) => {
    if (pageType === "home" || pageType === "wishlist") {
      onCategoryChange(categoryName);
    } else {
      navigate("/home");
    }
  };

  return (
    <header className="home-header">
      {/* Logo and Location Row - Mobile Only (Home page) */}
      {pageType === "home" && showLocation && (
        <div className="logo-location-row">
          {/* Logo */}
          <div className="logo-container">
            <img src="/aurora-logo.png" alt="Aurora Bangles" className="logo" />
          </div>

          {/* Location Bar */}
          <div className="location-bar">
            <span className="location-icon">🏠</span>
            <span className="location-text">
              HOME 13, Mona luxury PG, Stage 2, 5th Cross...
            </span>
          </div>
        </div>
      )}

      {/* Search and Navigation Row */}
      <div className="search-nav-row">
        {/* Logo - Mobile Only (when no address) */}
        {pageType !== "home" && (
          <div className="logo-container mobile-logo">
            <img src="/aurora-logo.png" alt="Aurora Bangles" className="logo" />
          </div>
        )}

        {/* Logo - Desktop Only */}
        <div className="logo-container desktop-logo">
          <img src="/aurora-logo.png" alt="Aurora Bangles" className="logo" />
        </div>

        {/* Search Bar */}
        <div className="search-bar-wrapper">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={onSearchChange}
              onKeyPress={onSearchKeyPress}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => {
                  setSearchQuery("");
                  if (pageType === "home") {
                    navigate("/home");
                  }
                }}
              >
                ✕
              </button>
            )}
            <span className="grid-icon">☰</span>
          </div>
          {/* Search Suggestions - Only for Home page */}
          {showSearchSuggestions && showSuggestions && searchSuggestions.length > 0 && (
            <div className="search-suggestions">
              {searchSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="search-suggestion-item"
                  onClick={() => onSuggestionClick(suggestion)}
                >
                  <span className="suggestion-icon">🔍</span>
                  <span className="suggestion-text">{suggestion.name}</span>
                  <span className="suggestion-category">{suggestion.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Navigation - Desktop Only */}
        <nav className="top-nav">
          <div className="nav-item" onClick={() => navigate("/profile")}>
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </div>
          <div
            className={`nav-item ${activeNavItem === "wishlist" ? "active" : ""}`}
            onClick={() => navigate("/wishlist")}
          >
            <span className="nav-icon">
              <FaRegHeart size={20} />
            </span>
            <span className="nav-label">Wishlist</span>
          </div>
          <div
            className={`nav-item ${activeNavItem === "cart" ? "active" : ""}`}
            onClick={() => navigate("/order-details")}
          >
            <span className="nav-icon">🛒</span>
            <span className="nav-label">Cart</span>
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
          </div>
          <div className="nav-item logout-item" onClick={handleLogout}>
            <span className="nav-icon">
              <LogOut size={20} />
            </span>
            <span className="nav-label">Logout</span>
          </div>
        </nav>
      </div>

      {/* Category Navigation */}
      {categories.length > 0 && (
        <div className={`category-nav ${pageType === "home" ? "home-category-nav" : ""}`}>
          {categories.map((category) => (
            <div
              key={category.name}
              className={`category-item ${
                selectedCategory === category.name ? "active" : ""
              }`}
              onClick={() => handleCategoryClick(category.name)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;

