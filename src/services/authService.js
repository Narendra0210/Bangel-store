import axios from "axios";

const BASE_URL = "https://ecommerce-node-api-1-8ug3.onrender.com/api";

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });

    if (response.data.success) {
    return {
      success: true,
        message: response.data.message,
        token: response.data.token,
        user: response.data.user,
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Login failed",
    };
  }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Login failed. Please try again.",
    };
  }
};

export const registerUser = async (userData) => {
  try {
    // Validate required fields
    if (!userData.name || !userData.email || !userData.password || !userData.mobile) {
      return {
        success: false,
        message: "Please fill in all fields"
      };
    }

    const response = await axios.post(`${BASE_URL}/auth/register`, {
      full_name: userData.name,
      email: userData.email,
      password: userData.password,
      mobile: userData.mobile
    });

    if (response.data.success) {
  return {
    success: true,
        message: response.data.message || "Registration successful. Verification email sent."
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Registration failed"
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Registration failed. Please try again."
    };
  }
};
