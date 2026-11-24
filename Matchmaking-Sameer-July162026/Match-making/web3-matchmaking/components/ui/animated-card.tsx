"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  gradient?: "blue" | "green" | "purple" | "pink" | "orange"
}

export function AnimatedCard({ children, className, hover = true, gradient = "blue" }: AnimatedCardProps) {
  const gradientClasses = {
    blue: "from-blue-50 to-indigo-50 border-blue-100 hover:border-blue-200",
    green: "from-green-50 to-emerald-50 border-green-100 hover:border-green-200",
    purple: "from-purple-50 to-violet-50 border-purple-100 hover:border-purple-200",
    pink: "from-pink-50 to-rose-50 border-pink-100 hover:border-rose-200",
    orange: "from-orange-50 to-amber-50 border-orange-100 hover:border-orange-200",
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 bg-gradient-to-br transition-all duration-300 shadow-lg",
        gradientClasses[gradient],
        hover && "hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1",
        className,
      )}
    >
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent rounded-full -translate-y-16 translate-x-16 opacity-50" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/30 to-transparent rounded-full translate-y-12 -translate-x-12 opacity-40" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </Card>
  )
}
