"use client"

export function FloatingElements() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating geometric shapes */}
      <div
        className="absolute top-20 left-10 w-4 h-4 bg-blue-200 rounded-full animate-bounce opacity-20"
        style={{ animationDelay: "0s", animationDuration: "3s" }}
      />
      <div
        className="absolute top-40 right-20 w-6 h-6 bg-purple-200 rounded-full animate-bounce opacity-20"
        style={{ animationDelay: "1s", animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-40 left-20 w-3 h-3 bg-pink-200 rounded-full animate-bounce opacity-20"
        style={{ animationDelay: "2s", animationDuration: "5s" }}
      />
      <div
        className="absolute bottom-20 right-40 w-5 h-5 bg-indigo-200 rounded-full animate-bounce opacity-20"
        style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}
      />

      {/* Floating lines */}
      <div className="absolute top-1/4 left-1/4 w-20 h-0.5 bg-gradient-to-r from-blue-200 to-transparent rotate-45 opacity-10 animate-pulse" />
      <div
        className="absolute top-3/4 right-1/4 w-16 h-0.5 bg-gradient-to-r from-purple-200 to-transparent -rotate-45 opacity-10 animate-pulse"
        style={{ animationDelay: "1s" }}
      />
    </div>
  )
}
