import { useRef, useEffect } from "react";

/**
 * Custom hook to get the previous value of a prop or state
 * @param {any} value - Current value
 * @returns {any} Previous value (or undefined on first render)
 */
export const usePrevious = (value) => {
  // Create a ref to store both current and previous values
  const valueRef = useRef({
    current: value,
    previous: undefined,
  });

  // Update the ref after render
  useEffect(() => {
    valueRef.current = {
      current: value,
      previous: valueRef.current.current,
    };
  }, [value]);

  // Return the previous value (which is stored in the ref's state)
  // eslint-disable-next-line react-hooks/refs
  return valueRef.current.previous;
};
