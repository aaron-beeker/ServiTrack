"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { RolUsuario } from "@/types"
import { 
  User, 
  ShieldCheck, 
  Wrench, 
  Briefcase, 
  LogOut, 
  ChevronDown, 
  Check, 
  LogIn, 
  Sparkles,
  ArrowRight
} from "lucide-react"

export function UserMenu() {
  const router = useRouter()
  const { user, perfil, rol, esAdmin, logout, cambiarRol, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar menú al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  // Estilos de badge según rol
  const badgeConfig = {
    ADMIN: {
      label: "ADMINISTRADOR",
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      icon: ShieldCheck
    },
    TECNICO: {
      label: "TÉCNICO",
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
      icon: Wrench
    },
    VENTAS: {
      label: "VENTAS",
      bg: "bg-blue-50",
      text: "text-[#2369A1]",
      border: "border-blue-200",
      icon: Briefcase
    }
  }[rol] || {
    label: rol,
    bg: "bg-slate-50",
    text: "text-slate-800",
    border: "border-slate-200",
    icon: User
  }

  const BadgeIcon = badgeConfig.icon

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2.5 p-1.5 pl-2 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors bg-white text-left"
      >
        {/* Avatar */}
        {perfil.fotoUrl ? (
          <img
            src={perfil.fotoUrl}
            alt={perfil.nombreCompleto}
            className="w-7 h-7 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#2369A1]/10 text-[#2369A1] font-bold text-xs flex items-center justify-center border border-[#2369A1]/20">
            {perfil.nombreCompleto ? perfil.nombreCompleto.charAt(0).toUpperCase() : "U"}
          </div>
        )}

        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-slate-900 leading-tight max-w-[130px] truncate">
            {perfil.nombreCompleto}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badgeConfig.bg} ${badgeConfig.text} ${badgeConfig.border}`}>
              {badgeConfig.label}
            </span>
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
      </button>

      {/* Menú Desplegable */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in-50 zoom-in-95 text-xs">
          {/* Header de Usuario */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="font-bold text-slate-900 truncate">{perfil.nombreCompleto}</p>
            <p className="text-[11px] text-slate-500 font-mono truncate">{perfil.correo}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{perfil.cargo}</p>
          </div>

          {/* Selector Rápido de Roles (Simulador de Prueba) */}
          <div className="px-3 py-2 border-b border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#2369A1]" />
              Cambiar Rol de Usuario
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(['ADMIN', 'TECNICO', 'VENTAS'] as RolUsuario[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    cambiarRol(r)
                    setMenuOpen(false)
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                    rol === r
                      ? 'bg-[#2369A1] text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  {r}
                  {rol === r && <Check className="w-2.5 h-2.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Opciones */}
          <div className="py-1">
            {esAdmin && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  router.push('/usuarios')
                }}
                className="w-full text-left px-4 py-2 text-[#2369A1] font-semibold hover:bg-blue-50 flex items-center justify-between border-b border-slate-100"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2369A1]" />
                  Gestión de Usuarios (Roles)
                </span>
                <ArrowRight className="w-3 h-3 text-[#2369A1]" />
              </button>
            )}
            <button
              onClick={() => {
                setMenuOpen(false)
                router.push('/login')
              }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center justify-between"
            >
              <span>Gestionar Cuenta / Iniciar con Google</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                logout()
              }}
              className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
