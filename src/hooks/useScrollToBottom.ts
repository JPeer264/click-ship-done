import { useEffect, useRef } from "react";

export function useScrollToBottom<T>(dependency: T) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [dependency]);

  return ref;
}
