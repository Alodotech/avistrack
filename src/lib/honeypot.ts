export function hasFilledHoneypot(formData: FormData): boolean {
  const value = formData.get("website");
  return typeof value === "string" && value.trim().length > 0;
}
