import { useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import { registerUser } from "../../services/authService";
import { useToast } from "../../context/ToastContext";

const RegisterForm = ({ switchToLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: ""
  });
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const handleRegister = async () => {
    setError("");
    if (!formData.name || !formData.email || !formData.password || !formData.mobile) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const response = await registerUser(formData);
      if (response.success) {
        // Registration successful - show success message and redirect to login
        // Don't auto-login since verification email is sent
        showToast(response.message || "Registration successful! Please check your email for verification.", "success");
        // Switch to login form after a short delay
        setTimeout(() => {
          switchToLogin();
        }, 1000);
      } else {
        setError(response.message || "Registration failed");
        showToast(response.message || "Registration failed", "error");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      showToast("An error occurred. Please try again.", "error");
    }
  };

  return (
    <div className="auth-form">
      <h2>Create Account</h2>
      <p className="subtitle">Sign up to get started</p>

      {error && <div className="error-message">{error}</div>}

      <Input
        label="Full Name"
        placeholder="Enter full name"
        value={formData.name}
        onChange={(e) =>
          setFormData({ ...formData, name: e.target.value })
        }
      />

      <Input
        label="Email"
        type="email"
        placeholder="Enter email"
        value={formData.email}
        onChange={(e) =>
          setFormData({ ...formData, email: e.target.value })
        }
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter password"
        value={formData.password}
        onChange={(e) =>
          setFormData({ ...formData, password: e.target.value })
        }
      />

      <Input
        label="Mobile"
        type="tel"
        placeholder="Enter mobile number"
        value={formData.mobile}
        onChange={(e) =>
          setFormData({ ...formData, mobile: e.target.value })
        }
      />

      <Button text="Create Account" onClick={handleRegister} />

      <p className="switch-form-link" onClick={switchToLogin}>
        Back to Login
      </p>
    </div>
  );
};

export default RegisterForm;
