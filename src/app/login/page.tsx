"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { RolUsuario } from "@/types"
import { MurLogo } from "@/components/brand/MurLogo"
import { Button } from "@/components/ui/button"
import { 
  ShieldCheck, 
  Wrench, 
  Briefcase, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Lock,
  Sparkles
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { perfil, loginConGoogle, loginDemo, logout, loading } = useAuth()
  const [iniciandoGoogle, setIniciandoGoogle] = useState(false)

  const handleGoogleLogin = async () => {
    setIniciandoGoogle(true)
    try {
      await loginConGoogle('VENTAS')
      router.push("/")
    } catch (err) {
      // Notificado en AuthContext
    } finally {
      setIniciandoGoogle(false)
    }
  }

  const handleDemoLogin = (rolDeseado: RolUsuario) => {
    loginDemo(rolDeseado)
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between items-center font-sans p-4 sm:p-6">
      
      {/* Top Tag */}
      <div className="w-full max-w-md pt-4 flex justify-between items-center text-xs text-slate-400">
        <span className="font-semibold text-slate-500">ServiTrack v1.2</span>
        <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] font-medium">
          <Lock className="w-3 h-3 text-emerald-600" />
          Conexión Segura Firebase
        </span>
      </div>

      {/* Tarjeta de Login Centrada */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 space-y-6 animate-in fade-in-50 zoom-in-95 my-auto">
        
        {/* Encabezado Corporativo MUR */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center mb-1">
            <MurLogo size="md" showSubtitle={true} />
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Sistema de Control de Atenciones Técnicas
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Ingrese con su cuenta institucional o Gmail para acceder al laboratorio y control de taller.
          </p>
        </div>

        {/* Si ya existe una sesión abierta */}
        {perfil ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sesión Iniciada</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                perfil.rol === 'ADMIN'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : perfil.rol === 'TECNICO'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-blue-50 text-[#2369A1] border-blue-300'
              }`}>
                {perfil.rol}
              </span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{perfil.nombreCompleto}</p>
              <p className="text-slate-500 font-mono text-[11px]">{perfil.correo}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{perfil.cargo}</p>
            </div>
            
            <div className="pt-2 flex gap-2">
              <Button 
                onClick={() => router.push("/")}
                className="flex-1 bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold py-2"
              >
                Ingresar al Sistema
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => logout()}
                className="text-xs border-slate-300 text-slate-600 hover:text-rose-600"
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Botón Principal: Continuar con Google */}
            <div className="space-y-3">
              <Button
                onClick={handleGoogleLogin}
                disabled={iniciandoGoogle || loading}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-5 rounded-xl font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                {iniciandoGoogle ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#2369A1]" />
                ) : (
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
                <span>Continuar con Google (Gmail)</span>
              </Button>
            </div>

            {/* Separador */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                Acceso directo por roles de prueba
              </span>
            </div>

            {/* Acceso Rápido para Pruebas / Sustentación */}
            <div className="space-y-2">
              {/* Botón especial para beeker147@gmail.com */}
              <button
                type="button"
                onClick={() => handleDemoLogin("ADMIN")}
                className="w-full p-2.5 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 text-amber-900 border border-amber-200 text-xs font-semibold transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="text-left">
                    <span className="block font-bold">beeker147@gmail.com</span>
                    <span className="block text-[10px] text-amber-700">Administrador de Operaciones y TI</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("TECNICO")}
                  className="p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Rol Técnico</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("VENTAS")}
                  className="p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100 text-[#2369A1] border border-blue-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#2369A1]" />
                  <span>Rol Ventas</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Políticas y Sello */}
        <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100">
          MUR Tecnología S.A.C. • Sistema Certificado ISO 9001
        </div>

      </div>

      {/* Footer corporativo */}
      <footer className="w-full max-w-md pb-4 text-center text-xs text-slate-400">
        © 2026 MUR Tecnología S.A.C. — ServiTrack Soporte Técnico
      </footer>

    </div>
  )
}
