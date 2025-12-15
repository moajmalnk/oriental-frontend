import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Admin } from "../types";
import api from "../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../services/constants";

interface AuthContextType {
  isAuthenticated: boolean;
  user: Admin | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to map backend role to frontend role
const mapRole = (
  backendRole: string
): "super_admin" | "admin" | "moderator" => {
  switch (backendRole) {
    case "superadmin":
      return "super_admin";
    case "admin":
      return "admin";
    case "moderator":
      return "moderator";
    default:
      return "admin";
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (token) {
        try {
          // Verify token by fetching user profile
          const response = await api.get("/api/users/profile/");
          const userData = response.data;

          setUser({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            full_name: userData.full_name,
            role: mapRole(userData.role),
            created_at: userData.created_at,
          });
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem(ACCESS_TOKEN);
          localStorage.removeItem(REFRESH_TOKEN);
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Authenticate with backend
      const response = await api.post("/api/token/", {
        username,
        password,
      });

      const { access, refresh } = response.data;

      // Store tokens
      localStorage.setItem(ACCESS_TOKEN, access);
      localStorage.setItem(REFRESH_TOKEN, refresh);

      // Fetch user profile
      const profileResponse = await api.get("/api/users/profile/");
      const userData = profileResponse.data;

      setUser({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: mapRole(userData.role),
        created_at: userData.created_at,
      });
      setIsAuthenticated(true);
      return true;
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.response?.data?.detail || "Login failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
