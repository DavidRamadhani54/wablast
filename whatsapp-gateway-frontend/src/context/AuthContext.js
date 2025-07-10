import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    username: "",
    lastLogin: null,
  });

  // Default credentials (in production, this should be server-side)
  const userCredentials = {
    username: "admin",
    password: "admin123",
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const remembered = localStorage.getItem("whatsapp_gateway_remember");
    const lastUser = localStorage.getItem("whatsapp_gateway_user");

    if (remembered === "true" && lastUser) {
      const userData = JSON.parse(lastUser);
      if (userData.username === userCredentials.username) {
        performLogin(userData.username, false);
        return true;
      }
    }
    return false;
  };

  const performLogin = (username, saveSession = true) => {
    setIsAuthenticated(true);
    const userData = {
      username: username,
      lastLogin: new Date().toLocaleString("id-ID"),
    };
    setCurrentUser(userData);

    // Save to localStorage if remember me is checked
    if (saveSession) {
      localStorage.setItem("whatsapp_gateway_remember", "true");
      localStorage.setItem("whatsapp_gateway_user", JSON.stringify(userData));
    }
  };

  const login = async (username, password, rememberMe = false) => {
    if (
      username === userCredentials.username &&
      password === userCredentials.password
    ) {
      performLogin(username, rememberMe);
      return { success: true };
    } else {
      return { success: false, error: "Username atau password salah" };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser({ username: "", lastLogin: null });

    // Clear remember me
    localStorage.removeItem("whatsapp_gateway_remember");
    localStorage.removeItem("whatsapp_gateway_user");
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (currentPassword !== userCredentials.password) {
      return { success: false, error: "Password saat ini salah" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Password baru minimal 6 karakter" };
    }

    // In a real app, this would be an API call
    userCredentials.password = newPassword;
    return { success: true };
  };

  const value = {
    isAuthenticated,
    currentUser,
    login,
    logout,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export the context as well
export { AuthContext };
