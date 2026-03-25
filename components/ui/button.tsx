import type { ButtonHTMLAttributes, ReactNode } from "react";

import { joinClasses } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  block = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={joinClasses("button", `button-${variant}`, block && "button-block", className)}
      {...props}
    >
      {children}
    </button>
  );
}

