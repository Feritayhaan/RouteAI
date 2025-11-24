import React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-black px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 ${className}`}
      {...props}
    />
  )
);

Button.displayName = "Button";

