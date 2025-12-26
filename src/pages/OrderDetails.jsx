import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { X, Check, Clock } from "lucide-react";
import {
  getCartItems,
  removeFromCart,
  updateCartItemQuantity,
  getCartTotal,
  getCartMRPTotal,
  fetchCartItemsFromAPI,
  addItemToCartAPI,
} from "../services/cartService";
import { placeOrder } from "../services/orderService";
import { addToWishlist } from "../services/wishlistService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ConfirmationDialog from "../components/common/ConfirmationDialog";
import "../styles/OrderDetails.css";
import "../styles/Home.css";

const OrderDetails = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeItemToDelete, setRemoveItemToDelete] = useState(null);
  const [removeType, setRemoveType] = useState(null); // 'single' or 'selected'
  const [loading, setLoading] = useState(true);
  const [uncheckedItems, setUncheckedItems] = useState([]); // Items that are unchecked but should remain visible
  const [apiTotalPrice, setApiTotalPrice] = useState(null); // Total price from API
  const [currentStep, setCurrentStep] = useState("bag"); // 'bag', 'address', 'payment'
  const [addresses, setAddresses] = useState([]); // List of saved addresses
  const [selectedAddressId, setSelectedAddressId] = useState(null); // Selected address ID
  const [showAddressForm, setShowAddressForm] = useState(false); // Show/hide address form
  const [editingAddressId, setEditingAddressId] = useState(null); // ID of address being edited
  const [showDeleteAddressConfirm, setShowDeleteAddressConfirm] = useState(false); // Show delete confirmation
  const [addressToDelete, setAddressToDelete] = useState(null); // Address to delete
  const [newAddress, setNewAddress] = useState({
    fullName: "",
    phone: "",
    pincode: "",
    address: "",
    city: "",
    state: "",
    landmark: "",
    addressType: "home" // 'home', 'work', 'other'
  });

  useEffect(() => {
    const loadCartItems = async () => {
      setLoading(true);
      try {
        // Load unchecked items from localStorage
        const savedUncheckedItems = localStorage.getItem("uncheckedCartItems");
        const uncheckedItemsList = savedUncheckedItems ? JSON.parse(savedUncheckedItems) : [];
        setUncheckedItems(uncheckedItemsList);

        if (user?.user_id) {
          // Fetch cart items from API
          const apiResponse = await fetchCartItemsFromAPI(user.user_id);
          const apiCartItems = apiResponse.items || [];
          const totalPrice = apiResponse.total_price;
          
          // Store API total price
          if (totalPrice !== null && totalPrice !== undefined) {
            setApiTotalPrice(parseFloat(totalPrice));
          } else {
            setApiTotalPrice(null);
          }
          
          // Merge API items with unchecked items
          // Create a map of unchecked items by itemKey
          const uncheckedMap = new Map();
          uncheckedItemsList.forEach(item => {
            const key = `${item.id}-${item.selectedSize || "default"}`;
            uncheckedMap.set(key, item);
          });
          
          // Create a set of API item keys for quick lookup
          const apiItemKeys = new Set(
            apiCartItems.map(item => `${item.id}-${item.selectedSize || "default"}`)
          );
          
          // Combine API items with unchecked items that are not in API response
          const allItems = [...apiCartItems];
          uncheckedMap.forEach((uncheckedItem, key) => {
            // Only add if not already in API items
            if (!apiItemKeys.has(key)) {
              allItems.push(uncheckedItem);
            }
          });
          
          setCartItems(allItems);
          
          // Initialize only API items as selected (unchecked items remain unchecked)
          const initialSelected = new Set(
            apiCartItems.map((item) => `${item.id}-${item.selectedSize || "default"}`)
          );
          setSelectedItems(initialSelected);
        } else {
          // Fallback to localStorage if user_id is not available
          const items = getCartItems();
          
          // Create a set of localStorage item keys
          const localItemKeys = new Set(
            items.map(item => `${item.id}-${item.selectedSize || "default"}`)
          );
          
          // Combine localStorage items with unchecked items that are not in localStorage
          const allItems = [...items];
          uncheckedItemsList.forEach(uncheckedItem => {
            const key = `${uncheckedItem.id}-${uncheckedItem.selectedSize || "default"}`;
            if (!localItemKeys.has(key)) {
              allItems.push(uncheckedItem);
            }
          });
          
          setCartItems(allItems);
          const initialSelected = new Set(
            items.map((item) => `${item.id}-${item.selectedSize || "default"}`)
          );
          setSelectedItems(initialSelected);
        }
      } catch (error) {
        console.error("Error loading cart items:", error);
        // If API fails and user is logged in, show empty cart
        // Otherwise fallback to localStorage
        if (user?.user_id) {
          // Still show unchecked items even if API fails
          const savedUncheckedItems = localStorage.getItem("uncheckedCartItems");
          const uncheckedItemsList = savedUncheckedItems ? JSON.parse(savedUncheckedItems) : [];
          setCartItems(uncheckedItemsList);
          setSelectedItems(new Set());
          showToast("Failed to load cart items from server.", "error");
        } else {
          // Fallback to localStorage only if user is not logged in
          const items = getCartItems();
          const savedUncheckedItems = localStorage.getItem("uncheckedCartItems");
          const uncheckedItemsList = savedUncheckedItems ? JSON.parse(savedUncheckedItems) : [];
          const allItems = [...items, ...uncheckedItemsList];
          setCartItems(allItems);
          const initialSelected = new Set(
            items.map((item) => `${item.id}-${item.selectedSize || "default"}`)
          );
          setSelectedItems(initialSelected);
        }
      } finally {
        setLoading(false);
      }
    };

    loadCartItems();
  }, [user?.user_id, showToast]);

  // Load saved addresses from localStorage
  useEffect(() => {
    const savedAddresses = localStorage.getItem("userAddresses");
    if (savedAddresses) {
      const parsedAddresses = JSON.parse(savedAddresses);
      setAddresses(parsedAddresses);
      // Set first address as selected if available and none is selected
      if (parsedAddresses.length > 0 && selectedAddressId === null) {
        setSelectedAddressId(parsedAddresses[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle address form input change
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setNewAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle add/update address
  const handleAddAddress = () => {
    if (!newAddress.fullName || !newAddress.phone || !newAddress.pincode || !newAddress.address || !newAddress.city || !newAddress.state) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    if (editingAddressId) {
      // Update existing address
      const updatedAddresses = addresses.map(addr => 
        addr.id === editingAddressId 
          ? { ...addr, ...newAddress }
          : addr
      );
      setAddresses(updatedAddresses);
      localStorage.setItem("userAddresses", JSON.stringify(updatedAddresses));
      showToast("Address updated successfully!", "success");
      setEditingAddressId(null);
    } else {
      // Add new address
      const addressId = Date.now().toString();
      const addressToAdd = {
        id: addressId,
        ...newAddress
      };

      const updatedAddresses = [...addresses, addressToAdd];
      setAddresses(updatedAddresses);
      localStorage.setItem("userAddresses", JSON.stringify(updatedAddresses));
      
      // Select the newly added address
      setSelectedAddressId(addressId);
      showToast("Address added successfully!", "success");
    }
    
    // Reset form
    setNewAddress({
      fullName: "",
      phone: "",
      pincode: "",
      address: "",
      city: "",
      state: "",
      landmark: "",
      addressType: "home"
    });
    setShowAddressForm(false);
  };

  // Handle edit address
  const handleEditAddress = (addressId) => {
    const addressToEdit = addresses.find(addr => addr.id === addressId);
    if (addressToEdit) {
      setNewAddress({
        fullName: addressToEdit.fullName,
        phone: addressToEdit.phone,
        pincode: addressToEdit.pincode,
        address: addressToEdit.address,
        city: addressToEdit.city,
        state: addressToEdit.state,
        landmark: addressToEdit.landmark || "",
        addressType: addressToEdit.addressType || "home"
      });
      setEditingAddressId(addressId);
      setShowAddressForm(true);
    }
  };

  // Handle delete address
  const handleDeleteAddress = (addressId) => {
    const addressToDelete = addresses.find(addr => addr.id === addressId);
    setAddressToDelete(addressToDelete);
    setShowDeleteAddressConfirm(true);
  };

  // Confirm delete address
  const confirmDeleteAddress = () => {
    if (addressToDelete) {
      const updatedAddresses = addresses.filter(addr => addr.id !== addressToDelete.id);
      setAddresses(updatedAddresses);
      localStorage.setItem("userAddresses", JSON.stringify(updatedAddresses));
      
      // If deleted address was selected, clear selection or select first available
      if (selectedAddressId === addressToDelete.id) {
        if (updatedAddresses.length > 0) {
          setSelectedAddressId(updatedAddresses[0].id);
        } else {
          setSelectedAddressId(null);
        }
      }
      
      showToast("Address deleted successfully!", "success");
    }
    setShowDeleteAddressConfirm(false);
    setAddressToDelete(null);
  };

  // Handle address selection
  const handleSelectAddress = (addressId) => {
    setSelectedAddressId(addressId);
  };

  // Handle step navigation
  const handleStepClick = (step) => {
    if (step === "address" && cartItems.length === 0) {
      showToast("Please add items to cart first", "warning");
      return;
    }
    setCurrentStep(step);
  };

  const handleRemoveItem = (productId, size) => {
    const item = cartItems.find(
      (item) => item.id === productId && (item.selectedSize || "default") === (size || "default")
    );
    setRemoveItemToDelete({ productId, size, itemName: item?.name || "item" });
    setRemoveType("single");
    setShowRemoveConfirm(true);
  };

  const confirmRemoveItem = async () => {
    if (removeItemToDelete && removeType === "single") {
      const { productId, size } = removeItemToDelete;
      const itemKey = `${productId}-${size || "default"}`;
      
      // Find the item to get its price
      const item = cartItems.find(
        (item) => item.id === productId && (item.selectedSize || "default") === (size || "default")
      );
      
      // Remove from localStorage immediately
      const updatedCart = removeFromCart(productId, size);
      setCartItems(updatedCart);
      const newSelected = new Set(selectedItems);
      newSelected.delete(itemKey);
      setSelectedItems(newSelected);
      
      // If user is logged in, remove from API by setting quantity to 0
      if (user?.user_id && item) {
        try {
          await addItemToCartAPI(user.user_id, productId, 0, item.discounted_price || item.price);
        } catch (error) {
          console.error("Error removing item from cart via API:", error);
          showToast("Item removed locally. Sync pending.", "warning");
        }
      }
      
      showToast("Item removed from cart", "success");
    }
    setShowRemoveConfirm(false);
    setRemoveItemToDelete(null);
    setRemoveType(null);
  };

  const handleQuantityChange = async (productId, size, newQuantity) => {
    // Update localStorage immediately for responsive UI
    const updatedCart = updateCartItemQuantity(productId, size, newQuantity);
    setCartItems(updatedCart);
    
    // Find the item to get its price
    const item = updatedCart.find(
      (item) => item.id === productId && (item.selectedSize || "default") === (size || "default")
    );
    
    // If user is logged in, sync with API
    if (user?.user_id && item) {
      try {
        await addItemToCartAPI(user.user_id, productId, newQuantity, item.discounted_price || item.price);
      } catch (error) {
        console.error("Error updating cart quantity via API:", error);
        showToast("Quantity updated locally. Sync pending.", "warning");
      }
    }
  };

  const handleToggleItem = async (itemKey) => {
    const newSelected = new Set(selectedItems);
    const wasSelected = newSelected.has(itemKey);
    
    // Find the item being toggled
    const toggledItem = cartItems.find(item => 
      `${item.id}-${item.selectedSize || "default"}` === itemKey
    );
    
    if (wasSelected) {
      // Item is being unchecked - remove from cart API but keep in UI
      newSelected.delete(itemKey);
      setSelectedItems(newSelected);
      
      // Save to unchecked items list in localStorage
      if (toggledItem) {
        const updatedUnchecked = [...uncheckedItems];
        const existsIndex = updatedUnchecked.findIndex(item => 
          `${item.id}-${item.selectedSize || "default"}` === itemKey
        );
        if (existsIndex === -1) {
          updatedUnchecked.push({ ...toggledItem });
          setUncheckedItems(updatedUnchecked);
          localStorage.setItem("uncheckedCartItems", JSON.stringify(updatedUnchecked));
        }
      }
      
      if (user?.user_id && toggledItem) {
        try {
          // Remove from cart by setting quantity to 0
          await addItemToCartAPI(user.user_id, toggledItem.id, 0, toggledItem.discounted_price || toggledItem.price);
        } catch (error) {
          console.error("Error removing item from cart via API:", error);
          showToast("Failed to remove item from cart.", "error");
          // Revert selection on error
          newSelected.add(itemKey);
          setSelectedItems(newSelected);
        }
      }
    } else {
      // Item is being checked - add back to cart API
      newSelected.add(itemKey);
      setSelectedItems(newSelected);
      
      // Remove from unchecked items list
      if (toggledItem) {
        const updatedUnchecked = uncheckedItems.filter(item => 
          `${item.id}-${item.selectedSize || "default"}` !== itemKey
        );
        setUncheckedItems(updatedUnchecked);
        localStorage.setItem("uncheckedCartItems", JSON.stringify(updatedUnchecked));
      }
      
      if (user?.user_id && toggledItem) {
        try {
          // Add back to cart with current quantity
          await addItemToCartAPI(user.user_id, toggledItem.id, toggledItem.quantity, toggledItem.discounted_price || toggledItem.price);
        } catch (error) {
          console.error("Error adding item back to cart via API:", error);
          showToast("Failed to add item back to cart.", "error");
          // Revert selection on error
          newSelected.delete(itemKey);
          setSelectedItems(newSelected);
        }
      }
    }
  };

  const handleSelectAll = async () => {
    const isSelectingAll = selectedItems.size !== cartItems.length;
    const newSelected = isSelectingAll 
      ? new Set(cartItems.map((item) => `${item.id}-${item.selectedSize || "default"}`))
      : new Set();
    
    setSelectedItems(newSelected);
    
    // Update unchecked items list
    if (isSelectingAll) {
      // Selecting all - clear unchecked items
      setUncheckedItems([]);
      localStorage.removeItem("uncheckedCartItems");
    } else {
      // Deselecting all - add all items to unchecked list
      setUncheckedItems([...cartItems]);
      localStorage.setItem("uncheckedCartItems", JSON.stringify(cartItems));
    }
    
    // If user is logged in, update API for all items
    if (user?.user_id) {
      try {
        // Call API for all items in parallel
        const apiPromises = cartItems.map(item =>
          addItemToCartAPI(
            user.user_id, 
            item.id, 
            isSelectingAll ? item.quantity : 0, 
            item.discounted_price || item.price
          )
        );
        await Promise.all(apiPromises);
      } catch (error) {
        console.error("Error updating cart via API:", error);
        showToast("Cart update failed. Please try again.", "error");
        // Revert selection on error
        setSelectedItems(selectedItems);
      }
    }
  };

  const isAllSelected = cartItems.length > 0 && selectedItems.size === cartItems.length;

  const handleRemoveSelected = () => {
    if (selectedItems.size === 0) {
      showToast("Please select at least one item to remove!", "warning");
      return;
    }
    setRemoveType("selected");
    setShowRemoveConfirm(true);
  };

  const confirmRemoveSelected = async () => {
    if (removeType === "selected") {
      const itemsToRemove = Array.from(selectedItems);
      
      // Get the actual items to remove
      const itemsToRemoveData = cartItems.filter((item) =>
        itemsToRemove.includes(`${item.id}-${item.selectedSize || "default"}`)
      );
      
      // Remove from localStorage immediately
      itemsToRemove.forEach((itemKey) => {
        const [productId, size] = itemKey.split("-");
        removeFromCart(parseInt(productId), size === "default" ? null : size);
      });
      
      // Remove from unchecked items if present
      const updatedUnchecked = uncheckedItems.filter(item => 
        !itemsToRemove.includes(`${item.id}-${item.selectedSize || "default"}`)
      );
      setUncheckedItems(updatedUnchecked);
      localStorage.setItem("uncheckedCartItems", JSON.stringify(updatedUnchecked));
      
      // Remove from cart items
      const updatedCartItems = cartItems.filter(item => 
        !itemsToRemove.includes(`${item.id}-${item.selectedSize || "default"}`)
      );
      setCartItems(updatedCartItems);
      
      // If user is logged in, remove from API by setting quantity to 0
      if (user?.user_id) {
        try {
          // Call API to remove each item (set quantity to 0)
          const removePromises = itemsToRemoveData.map(item =>
            addItemToCartAPI(user.user_id, item.id, 0, item.discounted_price || item.price)
          );
          await Promise.all(removePromises);
        } catch (error) {
          console.error("Error removing items from cart via API:", error);
          showToast("Items removed locally. Sync pending.", "warning");
        }
      }
      
      setSelectedItems(new Set());
      showToast(`${itemsToRemove.length} item(s) removed from cart`, "success");
    }
    setShowRemoveConfirm(false);
    setRemoveItemToDelete(null);
    setRemoveType(null);
  };

  const handleMoveToWishlist = async () => {
    if (selectedItems.size === 0) {
      showToast("Please select at least one item to move to wishlist!", "warning");
      return;
    }

    // Get selected items
    const itemsToMove = cartItems.filter((item) =>
      selectedItems.has(`${item.id}-${item.selectedSize || "default"}`)
    );

    // Add each selected item to wishlist
    let apiMessage = null;
    for (const item of itemsToMove) {
      const result = await addToWishlist(item, user?.user_id);
      if (result?.message && !apiMessage) {
        apiMessage = result.message; // Store the first API message
      }
    }
    
    // Remove selected items from cart
    itemsToMove.forEach((item) => {
      removeFromCart(item.id, item.selectedSize);
    });

    // Update cart items
    const updatedCart = getCartItems();
    setCartItems(updatedCart);

    // Clear selected items
    setSelectedItems(new Set());

    // Dispatch wishlist update event
    window.dispatchEvent(new Event("wishlistUpdated"));

    // Show toast with API message if available, otherwise show generic message
    if (apiMessage) {
      showToast(apiMessage, "success");
    } else {
      showToast(`${itemsToMove.length} item(s) moved to wishlist!`, "success");
    }
  };

  const handlePlaceOrder = async () => {
    if (selectedItems.size === 0) {
      showToast("Please select at least one item to place order!", "warning");
      return;
    }

    if (!user?.user_id) {
      showToast("Please login to place an order", "error");
      return;
    }

    // Check if address is selected
    if (!selectedAddressId || addresses.length === 0) {
      showToast("Please select a delivery address to place order!", "warning");
      setCurrentStep("address");
      return;
    }

    // Verify the selected address still exists
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (!selectedAddress) {
      showToast("Selected address is invalid. Please select a valid address.", "warning");
      setCurrentStep("address");
      return;
    }

    // Get selected items for order
    const itemsToOrder = selectedItemsArray.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      price: item.discounted_price || item.price,
      size: item.selectedSize || null
    }));

    try {
      const response = await placeOrder(user.user_id, itemsToOrder);
      
      if (response.success) {
        showToast(response.message || "Order placed successfully!", "success");
        
        // Remove selected items from cart after successful order
        selectedItemsArray.forEach((item) => {
          removeFromCart(item.id, item.selectedSize);
        });
        
        // Remove from unchecked items if present
        const updatedUnchecked = uncheckedItems.filter(item => 
          !selectedItems.has(`${item.id}-${item.selectedSize || "default"}`)
        );
        setUncheckedItems(updatedUnchecked);
        localStorage.setItem("uncheckedCartItems", JSON.stringify(updatedUnchecked));
        
        // Update cart items state
        const updatedCart = getCartItems();
        const remainingUnchecked = updatedUnchecked.filter(item => 
          !updatedCart.some(cartItem => 
            `${cartItem.id}-${cartItem.selectedSize || "default"}` === 
            `${item.id}-${item.selectedSize || "default"}`
          )
        );
        setCartItems([...updatedCart, ...remainingUnchecked]);
        
        // Clear selected items
        setSelectedItems(new Set());
        
        // Navigate to payment page with order data
        if (response.order) {
          setTimeout(() => {
            navigate("/payment", {
              state: {
                orderData: response.order
              }
            });
          }, 1000);
        } else {
          // Fallback if order data is not in expected format
          showToast("Order placed but payment information is missing.", "warning");
          setTimeout(() => {
            navigate("/home");
          }, 1500);
        }
      } else {
        showToast(response.message || "Failed to place order. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      showToast("An error occurred while placing the order. Please try again.", "error");
    }
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "₹0";
    }
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  // Calculate totals only for selected items
  const selectedItemsArray = cartItems.filter(
    (item) => selectedItems.has(`${item.id}-${item.selectedSize || "default"}`)
  );
  
  const totalOriginalPrice = selectedItemsArray.reduce(
    (total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return total + price * quantity;
    },
    0
  );
  const totalDiscountedPrice = selectedItemsArray.reduce(
    (total, item) => {
      const discountedPrice = Number(item.discounted_price) || Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return total + discountedPrice * quantity;
    },
    0
  );
  // Hard code 10% discount for total amount
  const totalDiscount = totalOriginalPrice * 0.10;
  const platformFee = selectedItemsArray.length > 0 ? 23 : 0;
  
  // Calculate total amount with 10% discount applied
  // Use API total_price if available, otherwise calculate from selected items
  const subtotalBeforeDiscount = (apiTotalPrice !== null && apiTotalPrice !== undefined && selectedItemsArray.length > 0)
    ? Number(apiTotalPrice)
    : totalOriginalPrice;
  const totalAmount = subtotalBeforeDiscount - totalDiscount + platformFee;

  const getConfirmationMessage = () => {
    if (removeType === "single" && removeItemToDelete) {
      return `Are you sure you want to remove "${removeItemToDelete.itemName}" from your cart?`;
    } else if (removeType === "selected") {
      return `Are you sure you want to remove ${selectedItems.size} selected item(s) from your cart?`;
    }
    return "Are you sure you want to proceed?";
  };

  if (loading) {
    return (
      <div className="order-details-page">
        <div className="order-details-container">
          <div className="loading-container" style={{ textAlign: "center", padding: "50px" }}>
            <p>Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-details-page">
      <ConfirmationDialog
        isOpen={showRemoveConfirm}
        onClose={() => {
          setShowRemoveConfirm(false);
          setRemoveItemToDelete(null);
          setRemoveType(null);
        }}
        onConfirm={removeType === "selected" ? confirmRemoveSelected : confirmRemoveItem}
        title="Remove Item"
        message={getConfirmationMessage()}
      />
      <ConfirmationDialog
        isOpen={showDeleteAddressConfirm}
        onClose={() => {
          setShowDeleteAddressConfirm(false);
          setAddressToDelete(null);
        }}
        onConfirm={confirmDeleteAddress}
        title="Delete Address"
        message={addressToDelete ? `Are you sure you want to delete the address at ${addressToDelete.address}?` : "Are you sure you want to delete this address?"}
      />
      {/* Order Details Content */}
      <div className="order-details-container">
        {/* Progress Steps */}
        <div className="progress-steps">
          <div 
            className={`step ${currentStep === "address" ? "active" : ""}`}
            onClick={() => handleStepClick("address")}
            style={{ cursor: "pointer" }}
          >
            <span className="step-label">ADDRESS</span>
          </div>
          <div 
            className={`step ${currentStep === "bag" ? "active" : ""}`}
            onClick={() => handleStepClick("bag")}
            style={{ cursor: "pointer" }}
          >
            <span className="step-label">BAG</span>
          </div>
          <div 
            className={`step ${currentStep === "payment" ? "active" : ""}`}
            onClick={() => handleStepClick("payment")}
            style={{ cursor: "pointer" }}
          >
            <span className="step-label">PAYMENT</span>
          </div>
        </div>

        <div className="order-details-wrapper">
          {/* Show Address Section when address step is active */}
          {currentStep === "address" ? (
            <div className="address-section">
              <h2 className="section-title">Select Delivery Address</h2>
              
              {/* Saved Addresses List */}
              {addresses.length > 0 && (
                <div className="addresses-list">
                  {addresses.map((address) => (
                    <div key={address.id} className="address-card">
                      <div className="address-radio">
                        <input
                          type="radio"
                          name="selectedAddress"
                          id={`address-${address.id}`}
                          checked={selectedAddressId === address.id}
                          onChange={() => handleSelectAddress(address.id)}
                        />
                        <label htmlFor={`address-${address.id}`} className="address-label">
                          <div className="address-header">
                            <span className="address-type">{address.addressType.toUpperCase()}</span>
                            <span className="address-name">{address.fullName}</span>
                          </div>
                          <div className="address-details">
                            <p>{address.address}</p>
                            <p>{address.landmark && `${address.landmark}, `}{address.city}, {address.state} - {address.pincode}</p>
                            <p>Phone: {address.phone}</p>
                          </div>
                        </label>
                      </div>
                      <div className="address-actions-buttons">
                        <button
                          className="edit-address-btn"
                          onClick={() => handleEditAddress(address.id)}
                          title="Edit Address"
                        >
                          Edit
                        </button>
                        <button
                          className="delete-address-btn"
                          onClick={() => handleDeleteAddress(address.id)}
                          title="Delete Address"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Address Form */}
              {showAddressForm ? (
                <div className="address-form-card">
                  <h3 className="form-title">{editingAddressId ? "Edit Address" : "Add New Address"}</h3>
                  <div className="address-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input
                          type="text"
                          name="fullName"
                          value={newAddress.fullName}
                          onChange={handleAddressChange}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={newAddress.phone}
                          onChange={handleAddressChange}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Pincode *</label>
                        <input
                          type="text"
                          name="pincode"
                          value={newAddress.pincode}
                          onChange={handleAddressChange}
                          placeholder="Enter pincode"
                        />
                      </div>
                      <div className="form-group">
                        <label>City *</label>
                        <input
                          type="text"
                          name="city"
                          value={newAddress.city}
                          onChange={handleAddressChange}
                          placeholder="Enter city"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>State *</label>
                      <input
                        type="text"
                        name="state"
                        value={newAddress.state}
                        onChange={handleAddressChange}
                        placeholder="Enter state"
                      />
                    </div>
                    <div className="form-group">
                      <label>Address *</label>
                      <textarea
                        name="address"
                        value={newAddress.address}
                        onChange={handleAddressChange}
                        placeholder="Enter full address"
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Landmark</label>
                      <input
                        type="text"
                        name="landmark"
                        value={newAddress.landmark}
                        onChange={handleAddressChange}
                        placeholder="Enter landmark (optional)"
                      />
                    </div>
                    <div className="form-group">
                      <label>Address Type</label>
                      <select
                        name="addressType"
                        value={newAddress.addressType}
                        onChange={handleAddressChange}
                      >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddressId(null);
                          setNewAddress({
                            fullName: "",
                            phone: "",
                            pincode: "",
                            address: "",
                            city: "",
                            state: "",
                            landmark: "",
                            addressType: "home"
                          });
                        }}
                      >
                        Cancel
                      </button>
                      <button className="btn-primary" onClick={handleAddAddress}>
                        {editingAddressId ? "Update Address" : "Save Address"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  className="add-address-btn"
                  onClick={() => {
                    setEditingAddressId(null);
                    setNewAddress({
                      fullName: "",
                      phone: "",
                      pincode: "",
                      address: "",
                      city: "",
                      state: "",
                      landmark: "",
                      addressType: "home"
                    });
                    setShowAddressForm(true);
                  }}
                >
                  + Add New Address
                </button>
              )}

              {/* Continue Button */}
              {addresses.length > 0 && selectedAddressId && (
                <div className="address-actions">
                  <button
                    className="continue-btn"
                    onClick={() => handleStepClick("payment")}
                  >
                    Continue to Payment
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Left Column - Cart Items */}
              <div className="cart-items-section">
            {/* Items Selected Header */}
            {cartItems.length > 0 && (
              <div className="items-header">
                <div className="items-count">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="select-all-checkbox"
                  />
                  <span>{selectedItems.size}/{cartItems.length} ITEMS SELECTED</span>
                </div>
                <div className="items-actions">
                  <button className="action-link-btn" onClick={handleRemoveSelected}>
                    REMOVE
                  </button>
                  <button className="action-link-btn" onClick={handleMoveToWishlist}>
                    MOVE TO WISHLIST
                  </button>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            {cartItems.length > 0 ? (
              <div className="cart-items-list">
                {cartItems.map((item, index) => {
                  const originalPrice = Number(item.price) || 0;
                  // Get discounted_price - if not set, calculate from discount_percent if available
                  let discountedPrice = originalPrice;
                  if (item.discounted_price !== undefined && item.discounted_price !== null) {
                    discountedPrice = Number(item.discounted_price);
                  } else if (item.discount_percent !== undefined && item.discount_percent !== null && Number(item.discount_percent) > 0 && originalPrice > 0) {
                    // Calculate discounted price from discount_percent if discounted_price is not provided
                    discountedPrice = originalPrice * (1 - Number(item.discount_percent) / 100);
                  }
                  const discountPercent = Number(item.discount_percent) || 0;
                  const quantity = Number(item.quantity) || 1;
                  const itemKey = `${item.id}-${item.selectedSize || "default"}`;
                  const isSelected = selectedItems.has(itemKey);
                  return (
                    <div key={itemKey} className="cart-item-card" style={{ opacity: isSelected ? 1 : 0.6 }}>
                      <div className="cart-item-check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(itemKey)}
                          className="item-checkbox"
                        />
                      </div>
                      <Link to={`/product/${item.id}`} className="cart-item-image-link">
                        <div className="cart-item-image">
                          <img
                            src={item.images?.[0] || item.image}
                            alt={item.name}
                          />
                        </div>
                      </Link>
                      <div className="cart-item-details">
                        <Link to={`/product/${item.id}`} className="cart-item-name-link">
                          <h3 className="cart-item-name">{item.name}</h3>
                        </Link>
                        <p className="cart-item-seller">Sold by: AK Enterprises</p>
                        
                        <div className="cart-item-options">
                          {item.selectedSize && (
                            <div className="option-select">
                              <label>Size:</label>
                              <select
                                value={item.selectedSize}
                                onChange={(e) => {
                                  // Handle size change
                                }}
                                className="option-dropdown"
                              >
                                {item.sizes?.map((size) => (
                                  <option key={size} value={size}>
                                    {size}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="option-select">
                            <label>Qty:</label>
                            <select
                              value={item.quantity || 1}
                              onChange={(e) => {
                                if (isSelected) {
                                  handleQuantityChange(
                                    item.id,
                                    item.selectedSize,
                                    parseInt(e.target.value)
                                  );
                                }
                              }}
                              className="option-dropdown"
                              disabled={!isSelected}
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qty) => (
                                <option key={qty} value={qty}>
                                  {qty}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="cart-item-pricing">
                          <div className="price-row">
                            <span className="current-price" style={{ opacity: isSelected ? 1 : 0.6 }}>
                              {formatPrice(discountedPrice * quantity)}
                            </span>
                          </div>
                          <div className="return-info">
                            <Clock size={14} />
                            <span>7 days return available</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="remove-item-btn"
                        onClick={() => handleRemoveItem(item.id, item.selectedSize)}
                      >
                        <X size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-cart">
                <p>Your cart is empty</p>
                <Link to="/home" className="continue-shopping-btn">
                  Continue Shopping
                </Link>
              </div>
            )}
          </div>

          {/* Right Column - Price Summary */}
          <div className="price-summary-section">
            <div className="price-summary-card">
              <h3 className="summary-title">PRICE DETAILS ({selectedItems.size} Item{selectedItems.size !== 1 ? "s" : ""})</h3>
              
              <div className="price-breakdown">
                <div className="price-row">
                  <span>Total Price</span>
                  <span >{formatPrice(totalOriginalPrice)}</span>
                </div>
                <div className="price-row discount-row">
                  <span>Discount</span>
                  <span className="discount-value">- {formatPrice(totalDiscount)}</span>
                </div>
                <div className="price-row">
                  <span>Platform Fee</span>
                  <span>
                    {formatPrice(platformFee)}
                    <span className="know-more-link"> Know More</span>
                  </span>
                </div>
              </div>

              <div className="total-amount">
                <span>Total Amount</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>

              <button
                className="place-order-btn"
                onClick={handlePlaceOrder}
                disabled={selectedItems.size === 0}
              >
                PLACE ORDER
              </button>
            </div>
          </div>
            </>
          )}
        </div>
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
        <Link to="/order-details" className="nav-item active">
          <span className="nav-icon">🛒</span>
          <span className="nav-label">Cart</span>
          {cartItems.length > 0 && (
            <span className="cart-badge">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </Link>
      </nav>
    </div>
  );
};

export default OrderDetails;

