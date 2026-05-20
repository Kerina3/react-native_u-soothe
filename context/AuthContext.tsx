import React, { createContext, useContext, useState } from "react";

export interface UserData {
  _id?: string;
  Name: string;
  Gmail: string;
  Role: string; // 患者端、照護者端
  Age?: string | number;
  Gender?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  user: UserData | null;
  login: (userData: UserData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);

  const login = (userData: UserData) => {
    setIsAuthenticated(true);
    setUserRole(userData.Role);
    setUser(userData);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
