import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

/** L'accent est réservé à l'action principale ; le rouge reste aux alertes (§13.1). */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-deep",
  secondary: "border border-black bg-white text-black hover:bg-gray-100",
  ghost: "text-black underline underline-offset-4 hover:text-accent",
};

type Size = "md" | "sm";

/** `sm` sert aux actions de ligne dans les tableaux ; la hauteur reste confortable au clic. */
const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4",
  sm: "min-h-10 px-3",
};

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export function buttonClass(
  variant: Variant = "primary",
  className = "",
  size: Size = "md",
): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button className={buttonClass(variant, className, size)} {...props} />
  );
}
