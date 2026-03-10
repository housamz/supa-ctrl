import { useCallback, useState } from "react";

/**
 * Simple toast manager hook that exposes toast messages and helpers.
 */
export function useToast() {
  const [toasts, set] = useState([]);

  const toast = useCallback((msg, type = "info") => {
    const id = Date.now();
    set((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => set((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id) => {
    set((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}

