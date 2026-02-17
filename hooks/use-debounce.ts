"use client";

import { useCallback, useRef, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValue = useCallback(
    (next: T) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(next);
        timeoutRef.current = null;
      }, delay);
    },
    [delay]
  );

  if (value !== debouncedValue && timeoutRef.current === null) {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      timeoutRef.current = null;
    }, delay);
  }

  return debouncedValue;
}

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    (...args: A) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [delay]
  );
}
