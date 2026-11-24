"use client"

import { cn } from "@/lib/utils"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
}

export function Loader({ size = "md", className, text }: LoaderProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  }

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-2", className)}>
      <div className="relative">
        <div
          className={cn("animate-spin rounded-full border-2 border-gray-200 border-t-blue-600", sizeClasses[size])}
        />
      </div>
      {text && (
        <p
          className={cn(
            "text-gray-600 font-medium",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base",
          )}
        >
          {text}
        </p>
      )}
    </div>
  )
}

export function FullScreenLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg border p-6 max-w-sm w-full mx-4">
        <Loader size="lg" text={text} />
      </div>
    </div>
  )
}
