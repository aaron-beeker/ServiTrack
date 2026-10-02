"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { RolUsuario } from "@/types"
import { MurLogo } from "@/components/brand/MurLogo"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  ShieldCheck, 
  Wrench, 
  Briefcase, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Lock,
  ArrowLeft
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { user, perfil, rol, loginConGoogle, loginDemo, logout, loading } = useAuth()
  const [rolInicial, setRolInicial] = useState<RolUsuario>("VENTAS")
  const [iniciandoGoogle, setIniciandoGoogle] = useState(false)

  const handleGoogleLogin = async () => {
    setIniciandoGoogle(true)
    try {
      await loginConGoogle(rolInicial)
      router.push("/")
    } catch (err) {
      // Manejado con toast en AuthContext
    } finally {
      setIniciandoGoogle(false)
    }
  }

  const handleDemoLogin = (rolDeseado: RolUsuario) => {
    loginDemo(rolDeseado)
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans">
      
      {/* Barra superior mínima */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/')} 
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
            title="Volver a la aplicación"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <MurLogo size="sm" showSubtitle={false} />
        </div>

        <span className="text-xs text-slate-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          Acceso Seguro • Google Firebase
        </span>
      </header>

      {/* Contenedor Central */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6">
          
          {/* Encabezado */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <MurLogo size="md" showSubtitle={false} />
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              Control de Acceso y Gestión de Roles
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Inicia sesión con tu cuenta corporativa de <strong>Google Workspace o Gmail</strong> para acceder según tus permisos de taller.
            </p>
          </div>

          {/* Si ya hay sesión activa */}
          {perfil && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sesión actual</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2369A1]/10 text-[#2369A1] border border-[#2369A1]/20">
                  {perfil.rol}
                </span>
              </div>
              <p className="font-bold text-slate-900">{perfil.nombreCompleto}</p>
              <p className="text-slate-500 font-mono text-[11px]">{perfil.correo}</p>
              
              <div className="pt-2 flex gap-2">
                <Button 
                  onClick={() => router.push("/")}
                  className="flex-1 bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
                >
                  Ir al Panel
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => logout()}
                  className="text-xs border-slate-300 text-slate-600 hover:text-rose-600"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* Selector de Rol Deseado para Google */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-700 font-semibold block">
              1. Selecciona tu perfil operativo de acceso:
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRolInicial("VENTAS")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  rolInicial === "VENTAS"
                    ? "bg-blue-50 border-[#2369A1] text-[#2369A1] shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Briefcase className="w-4 h-4 mx-auto mb-1 text-[#2369A1]" />
                <span className="text-xs font-bold block">Ventas</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Comercial</span>
              </button>

              <button
                type="button"
                onClick={() => setRolInicial("TECNICO")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  rolInicial === "TECNICO"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Wrench className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-xs font-bold block">Técnico</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Laboratorio</span>
              </button>

              <button
                type="button"
                onClick={() => setRolInicial("ADMIN")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  rolInicial === "ADMIN"
                    ? "bg-amber-50 border-amber-600 text-amber-800 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span className="text-xs font-bold block">Admin</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Operaciones</span>
              </button>
            </div>
          </div>

          {/* Botón de Google Sign-In Oficial */}
          <div className="space-y-3 pt-1">
            <Button
              onClick={handleGoogleLogin}
              disabled={iniciandoGoogle || loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-5 rounded-xl font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-3"
            >
              {iniciandoGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#2369A1]" />
              ) : (
                /* Google "G" SVG Icon */
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              Continuar con Google (Gmail)
            </Button>
          </div>

          {/* Separador */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
              O probar roles al instante
            </span>
          </div>

          {/* Acceso Rápido por Rol (Para Demostraciones y Sustentación) */}
          <div className="space-y-2">
            <span className="text-[11px] text-slate-500 font-medium block text-center">
              Acceso rápido para sustentar pruebas:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("VENTAS")}
                className="p-2 rounded-lg bg-blue-50/70 hover:bg-blue-100 text-[#2369A1] border border-blue-200 text-xs font-semibold transition-colors flex flex-col items-center"
              >
                <Briefcase className="w-3.5 h-3.5 mb-0.5" />
                Ventas
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("TECNICO")}
                className="p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors flex flex-col items-center"
              >
                <Wrench className="w-3.5 h-3.5 mb-0.5" />
                Técnico
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("ADMIN")}
                className="p-2 rounded-lg bg-amber-50/70 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors flex flex-col items-center"
              >
                <ShieldCheck className="w-3.5 h-3.5 mb-0.5" />
                Admin
              </button>
            </div>
          </div>

          {/* Footer de Seguridad */}
          <div className="pt-2 text-center text-[11px] text-slate-400">
            MUR Tecnología S.A.C. • Sistema de Gestión de Calidad ISO 9001
          </div>

        </div>
      </main>

      {/* Footer corporativo */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        © 2026 MUR Tecnología S.A.C. — ServiTrack Soporte Técnico
      </footer>

    </div>
  )
}
