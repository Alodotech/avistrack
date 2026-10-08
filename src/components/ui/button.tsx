import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

/** Le rouge est réservé à l'action principale et aux actions destructrices (§13.1). */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-red text-white hover:bg-black",
  secondary: "border border-black bg-white text-black hover:bg-gray-100",
  ghost: "text-black underline underline-offset-4 hover:text-red",
};

const BASE =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export function buttonClass(variant: Variant = "primary", className = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}
