"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TicketsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/")
  }, [router])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500 gap-2">
      <div className="w-6 h-6 border-2 border-[#2369A1] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-medium text-slate-600">Redirigiendo a Expedientes Técnicos (Casos)...</p>
    </div>
  )
}

