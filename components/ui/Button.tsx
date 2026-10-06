import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-glow text-white",
  ghost: "text-slate-300 hover:bg-white/5",
  outline:
    "border border-white/15 bg-white/[.03] text-slate-200 backdrop-blur-md hover:border-indigo-300/40 hover:bg-white/[.07]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3.5 text-base rounded-xl",
};

/**
 * Shared class recipe. Use it directly on a <Link> to get button styling
 * without nesting a <button> inside an anchor (invalid HTML, poor a11y).
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  }
>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={buttonStyles({ variant, size, className })}
    {...props}
  />
));

Button.displayName = "Button";
