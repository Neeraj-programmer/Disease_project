import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

// ==========================================
// 🔐 AuthContext
// ==========================================
// Context ek tarah ka "Global Store" hota hai. Yahan hum user ki detail aur login/logout 
// ka data store karte hain taaki kisi bhi page par (Home, Profile, Navbar) hum use access kar sakein 
// bina data ko har jagah pass kiye.

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ── STATES ──
  // user: Abhi kon sa user login hai (uska naam, email, avatar)
  const [user, setUser] = useState(null);
  
  // token: Ye ek secret key hoti hai jo backend batati hai ki hum logged in hain. (Local Storage se milti hai)
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  // loading: Jab tak hum backend se check kar rahe hain ki token sahi hai ya nahi
  const [loading, setLoading] = useState(true);

  // useEffect ka matlab hai: Jab bhi app start ho, ya token change ho, tab ye code run hoga.
  useEffect(() => {
    // Agar hamare paas token hai, toh backend se pucho ki ye token kis user ka hai
    if (token) {
      getMe()
        .then((res) => {
          // Agar token sahi nikla, toh backend user ki details bhejega
          setUser(res.data.user);
        })
        .catch(() => {
          // Agar token galat ya purana (expire) ho gaya hai, toh logout kardo
          logout();
        })
        .finally(() => {
          // Sab kuch hone ke baad loading band kardo
          setLoading(false);
        });
    } else {
      // Agar token hai hi nahi, iska matlab user guest hai. Loading band kardo.
      setLoading(false);
    }
  }, [token]);

  // ── FUNCTIONS ──
  
  // Login Function: Jab user apna email/password dalta hai aur backend sahi bolta hai
  const login = (userData, tokenStr) => {
    // Token aur user data ko browser ki memory (Local Storage) me save kardo taaki refresh karne pe delete na ho
    localStorage.setItem('token', tokenStr);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // State me bhi save kardo taaki website turant update ho jaye
    setToken(tokenStr);
    setUser(userData);
  };

  // Logout Function: User ka data delete kar do
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Update User Function: Jab user apni profile (jaise bio ya photo) change karta hai
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Jo bhi data hum chahte hain ki puri app ko mile, usko 'value' me dalte hain
  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Ye ek chota sa shortcut function (Hook) hai.
// Ab kisi bhi page me bas `const { user, login } = useAuth();` likhna hoga.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
