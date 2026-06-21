import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, createContext, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useTheme } from "next-themes";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRegion, setUserRegion] = useState(null);
  const { setTheme } = useTheme();

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      login(response.data.result);
    } catch (error) {
      console.error(error);
    }
  };

  // 1. Initial localstorage user recovery (essential for OTP logins)
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Error parsing user from localStorage:", err);
      }
    }
  }, []);

  // 2. Geolocation Lookup with sessionStorage cache
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const cached = sessionStorage.getItem("userRegion");
        if (cached) {
          setUserRegion(JSON.parse(cached));
          return;
        }
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          sessionStorage.setItem("userRegion", JSON.stringify(data));
          setUserRegion(data);
        } else {
          setUserRegion({ region: "Unknown", city: "Unknown" });
        }
      } catch (error) {
        console.error("Error fetching location:", error);
        setUserRegion({ region: "Unknown", city: "Unknown" });
      }
    };
    fetchLocation();
  }, []);

  // 3. Time-Location theme switcher (IST 10am-12pm + South India)
  useEffect(() => {
    if (!userRegion) return;

    const southIndianStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
    const detectedRegion = userRegion.region || "";
    const isSouthIndia = southIndianStates.some((state) =>
      detectedRegion.toLowerCase().includes(state.toLowerCase())
    );

    const getISTTime = () => {
      const now = new Date();
      // UTC milliseconds + offset
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istOffset = 5.5 * 60 * 60000; // IST is UTC + 5:30
      return new Date(utc + istOffset);
    };

    const istTime = getISTTime();
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 10 * 60; // 10:00 AM
    const endMinutes = 12 * 60;   // 12:00 PM
    const isTimeMatch = totalMinutes >= startMinutes && totalMinutes <= endMinutes;

    if (isSouthIndia && isTimeMatch) {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  }, [userRegion, setTheme]);

  // 4. Firebase listener for Google Sign In
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      // Only handle if not already logged in via other methods or no saved user
      if (firebaseuser && !localStorage.getItem("user")) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          login(response.data.result);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin, userRegion }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

