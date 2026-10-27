import type { HTMLAttributes, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode; //@cms-ignore
  /** Colore semantico */
  color?: "primary" | "success" | "warning" | "danger" | "neutral";
  /** soft = sfondo tenue, solid = sfondo pieno */
  variant?: "soft" | "solid";
  size?: "sm" | "md";
}

export function Badge({
  children,
  color = "neutral",
  variant = "soft",
  size = "md",
  className = "",
  ...rest
}: BadgeProps) {
  const classes = [
    "ds-badge",
    `ds-badge--${color}`,
    `ds-badge--${variant}`,
    `ds-badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
