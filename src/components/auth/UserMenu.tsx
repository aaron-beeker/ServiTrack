"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { LogOut, LogIn } from "lucide-react"

export function UserMenu() {
  const router = useRouter()
  const { perfil, logout, loading } = useAuth()

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse border border-slate-200" />
    )
  }

  if (!perfil) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
      >
        <LogIn className="w-3.5 h-3.5" />
        Iniciar Sesión
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Solo Nombre y Avatar (sin rol) */}
      <div className="flex items-center gap-2 min-w-0">
        {perfil.fotoUrl ? (
          <img
            src={perfil.fotoUrl}
            alt={perfil.nombreCompleto}
            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#2369A1]/10 text-[#2369A1] font-bold text-xs flex items-center justify-center border border-[#2369A1]/20 shrink-0">
            {perfil.nombreCompleto ? perfil.nombreCompleto.charAt(0).toUpperCase() : "U"}
          </div>
        )}
        <span 
          className="text-xs font-semibold text-slate-800 hidden sm:inline-block max-w-[160px] truncate"
          title={perfil.nombreCompleto}
        >
          {perfil.nombreCompleto}
        </span>
      </div>

      {/* Botón Salir */}
      <button
        onClick={() => logout()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200/80 transition-colors"
        title="Cerrar sesión"
      >
        <LogOut className="w-3.5 h-3.5 text-slate-500" />
        <span>Salir</span>
      </button>
    </div>
  )
}
