import { useEffect, useRef } from "react";

/**
 * Custom hook for setInterval with proper cleanup
 * @param {Function} callback - Function to call on each interval
 * @param {number|null} delay - Delay in milliseconds (null to pause)
 */
export const useInterval = (callback, delay) => {
  const savedCallback = useRef();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    const tick = () => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    };

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};
