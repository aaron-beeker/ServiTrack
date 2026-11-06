"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { LogOut, LogIn, ChevronDown, ShieldCheck, Wrench, Briefcase } from "lucide-react"

function formatearNombreCorto(nombreCompleto?: string): string {
  if (!nombreCompleto) return "Usuario"
  const partes = nombreCompleto.trim().split(/\s+/)
  if (partes.length <= 2) return partes.join(" ")
  if (partes.length >= 4) return `${partes[0]} ${partes[2]}`
  return `${partes[0]} ${partes[1]}`
}

function obtenerIniciales(nombreCompleto?: string): string {
  if (!nombreCompleto) return "U"
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "U"
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase()
  const apellidoIdx = partes.length >= 4 ? 2 : 1
  return `${partes[0].charAt(0)}${partes[apellidoIdx].charAt(0)}`.toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const { perfil, logout, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse border border-slate-200 shrink-0" />
    )
  }

  if (!perfil) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
      >
        <LogIn className="w-3.5 h-3.5" />
        Iniciar Sesión
      </button>
    )
  }

  const nombreCorto = formatearNombreCorto(perfil.nombreCompleto)
  const iniciales = obtenerIniciales(perfil.nombreCompleto)

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border text-left transition-all whitespace-nowrap cursor-pointer ${
          open
            ? "bg-slate-100 border-slate-300 shadow-xs"
            : "bg-slate-50/80 hover:bg-slate-100/90 border-slate-200/90"
        }`}
        title={perfil.nombreCompleto}
      >
        {perfil.fotoUrl ? (
          <img
            src={perfil.fotoUrl}
            alt={perfil.nombreCompleto}
            className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#2369A1] text-white font-bold text-[10px] tracking-tight flex items-center justify-center shrink-0">
            {iniciales}
          </div>
        )}
        <span className="text-xs font-semibold text-slate-800 hidden sm:inline-block max-w-[130px] truncate">
          {nombreCorto}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            open ? "rotate-180 text-slate-600" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-lg ring-1 ring-slate-900/5 z-50 overflow-hidden">
          <div className="px-3.5 py-3 bg-slate-50/70 border-b border-slate-100 space-y-1.5">
            <p className="text-xs font-bold text-slate-900 leading-snug">
              {perfil.nombreCompleto}
            </p>
            {perfil.correo && (
              <p className="text-[11px] text-slate-500 truncate font-mono">
                {perfil.correo}
              </p>
            )}
            <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#2369A1]/10 text-[#2369A1] border border-[#2369A1]/20">
                {perfil.rol === "ADMIN" ? (
                  <ShieldCheck className="w-3 h-3" />
                ) : perfil.rol === "TECNICO" ? (
                  <Wrench className="w-3 h-3" />
                ) : (
                  <Briefcase className="w-3 h-3" />
                )}
                {perfil.rol}
              </span>
              {perfil.cargo && (
                <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                  {perfil.cargo}
                </span>
              )}
            </div>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              onClick={async () => {
                setOpen(false)
                await logout()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
