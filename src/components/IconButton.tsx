import type { ReactNode } from "react";

interface IconButtonProps {
  onClick: () => void;
  label: string;
  title?: string;
  children: ReactNode;
}

export function IconButton({ onClick, label, title, children }: IconButtonProps) {
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </button>
  );
}
