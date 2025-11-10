import React, { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, signup as apiSignup } from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      // You might want to verify the token with the backend here
      // and fetch user data. For simplicity, we'll just decode it.
      try {
        const parts = token.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid token format");
        }

        const decoded = JSON.parse(atob(parts[1]));
        setUser({ email: decoded.sub });
      } catch (error) {
        console.error("Failed to decode token:", error);
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
      }
    }
  }, [token]);

  const login = async (email, password) => {
    const response = await apiLogin(email, password);
    setToken(response.data.access_token);
    localStorage.setItem("token", response.data.access_token);
  };

  const signup = async (email, password, fullName) => {
    await apiSignup(email, password, fullName);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};
