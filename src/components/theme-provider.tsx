
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
// Fix the import by using the correct path
import { type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
