import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { syncCartItemsFromAPI, addItemToCartAPI } from "../services/cartService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const authData = localStorage.getItem("auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      setIsAuthenticated(true);
      setUser(parsed.user);
      // Set token in axios default headers if token exists
      if (parsed.token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${parsed.token}`;
      }
      // Sync cart items from API when user is restored from localStorage
      if (parsed.user?.user_id) {
        syncCartItemsFromAPI(parsed.user.user_id).catch((error) => {
          console.error("Error syncing cart items on page load:", error);
        });
      }
    }
  }, []);

  const login = (userData, token) => {
    setIsAuthenticated(true);
    setUser(userData);
    // Store both user and token
    localStorage.setItem("auth", JSON.stringify({ user: userData, token }));
    // Set token in axios default headers
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  };

  const logout = async () => {
    // Check for unchecked items in cart before logging out
    const currentUser = user; // Store user before clearing state
    if (currentUser?.user_id) {
      try {
        const savedUncheckedItems = localStorage.getItem("uncheckedCartItems");
        if (savedUncheckedItems) {
          const uncheckedItems = JSON.parse(savedUncheckedItems);
          if (uncheckedItems.length > 0) {
            // Add all unchecked items back to cart via API
            const addPromises = uncheckedItems.map(item =>
              addItemToCartAPI(currentUser.user_id, item.id, item.quantity, item.price)
            );
            await Promise.all(addPromises);
            
            // Clear unchecked items from localStorage after adding them back
            localStorage.removeItem("uncheckedCartItems");
          }
        }
      } catch (error) {
        console.error("Error adding unchecked items to cart before logout:", error);
        // Continue with logout even if API call fails
      }
    }
    
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("auth");
    // Remove token from axios default headers
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

