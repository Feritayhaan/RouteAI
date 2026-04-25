/* eslint-disable @typescript-eslint/no-explicit-any */

// Minimal module shims for packages without bundled types in this setup.
declare module "@radix-ui/react-slot" {
  import * as React from "react"
  export const Slot: React.ComponentType<React.PropsWithChildren>
}

declare module "class-variance-authority" {
  type ClassValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | ClassValue[]
    | Record<string, ClassValue>

  type CVAVariantRecord = Record<string, ClassValue>
  type CVAConfig = {
    variants?: Record<string, CVAVariantRecord>
    defaultVariants?: Record<string, ClassValue>
    compoundVariants?: Array<Record<string, ClassValue>>
  }

  export type VariantProps<T extends (...args: any[]) => string> = T extends (
    options?: infer O,
    ...rest: any[]
  ) => string
    ? O
    : never

  export function cva(
    base?: ClassValue,
    config?: CVAConfig,
  ): (options?: Record<string, ClassValue>) => string
}
