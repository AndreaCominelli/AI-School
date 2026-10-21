import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode; //@cms-ignore
  variant?: "solid" | "outline" | "ghost";
  color?: "primary" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean; //@cms-ignore
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "solid",
  color = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "ds-btn",
    `ds-btn--${variant}`,
    `ds-btn--${color}`,
    `ds-btn--${size}`,
    fullWidth && "ds-btn--full",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="ds-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
