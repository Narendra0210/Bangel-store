import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../common/Input";
import Button from "../common/Button";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { syncCartItemsFromAPI } from "../../services/cartService";

const LoginForm = ({ switchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
    const response = await loginUser(email, password);
      if (response.success) {
        login(response.user, response.token);
        
        // Check role from API response and redirect accordingly
        const userRole = response.user?.role || response.role;
        
        if (userRole === 'seller') {
          // Seller login - navigate to seller dashboard
          navigate("/seller/dashboard");
        } else if (userRole === 'user' || !userRole) {
          // Regular user login - sync cart and navigate to home
          if (response.user?.user_id) {
            try {
              await syncCartItemsFromAPI(response.user.user_id);
            } catch (cartError) {
              console.error("Error syncing cart items:", cartError);
              // Continue with login even if cart sync fails
            }
          }
          navigate("/home");
        } else {
          // Unknown role - default to home
          navigate("/home");
        }
      } else {
        setError(response.message || "Invalid credentials");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      <p className="subtitle">Login to get started</p>

      {error && <div className="error-message">{error}</div>}

      <Input
        label="Email Address"
        type="email"
        placeholder="Enter Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon="📧"
      />

      <div className="forgot-password">
        <span>Forgot Password?</span>
      </div>

      <Input
        label="Password"
        type={showPassword ? "text" : "password"}
        placeholder="Enter Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        icon="🔒"
        rightIcon={showPassword ? "🙈" : "👁️"}
        onRightIconClick={() => setShowPassword(!showPassword)}
      />

      <Button text={loading ? "Please wait..." : "Login"} onClick={handleLogin} disabled={loading} />

      <p className="switch-form-link" onClick={switchToRegister}>
        Create Account
      </p>
    </div>
  );
};

export default LoginForm;
