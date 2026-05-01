export const brand = {
  parent: "SELECT-PX",
  code: process.env.NEXT_PUBLIC_PRODUCT_CODE ?? "LIC",
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Licence Manager",
  suffix: process.env.NEXT_PUBLIC_PRODUCT_SUFFIX ?? "PORTAL",
} as const;

export type Brand = typeof brand;
