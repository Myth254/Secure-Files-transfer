import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for managing localStorage with state
 * @param {string} key - localStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @returns {Array} [storedValue, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Get from localStorage then parse stored json or return initialValue
  const readValue = useCallback(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState(readValue);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value) => {
      if (typeof window === "undefined") {
        console.warn(`Cannot set localStorage key "${key}" on server`);
      }

      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Save to state
        setStoredValue(valueToStore);

        // Save to localStorage
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    if (typeof window === "undefined") {
      console.warn(`Cannot remove localStorage key "${key}" on server`);
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes to this localStorage key in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== JSON.stringify(storedValue)) {
        setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, storedValue, initialValue]);

  return [storedValue, setValue, removeValue];
};
