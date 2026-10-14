"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, FolderOpen } from "lucide-react"
import { NuevoCasoModal } from "@/components/casos/NuevoCasoModal"
import { CasosTable } from "@/components/casos/CasosTable"
import { MurLogo } from "@/components/brand/MurLogo"
import { UserMenu } from "@/components/auth/UserMenu"
import { useAuth } from "@/context/AuthContext"

export default function CasosPage() {
  const { esAdmin } = useAuth()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.push('/')} 
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
              title="Volver al panel"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <MurLogo size="sm" showSubtitle={false} />
            <nav className="hidden md:flex items-center gap-1 border-l border-slate-200 pl-6">
              <button 
                onClick={() => router.push('/')} 
                className="px-3 py-1.5 text-xs font-semibold text-[#2369A1] bg-[#2369A1]/8 rounded-md flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#2369A1]" />
                Expedientes Técnicos (Casos)
              </button>
              <button 
                onClick={() => router.push('/clientes')} 
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Clientes Corporativos
              </button>
              {esAdmin && (
                <button 
                  onClick={() => router.push('/usuarios')} 
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Gestión de Usuarios
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NuevoCasoModal />
            <div className="border-l border-slate-200 pl-3">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#2369A1]" />
            Expedientes de Servicio Técnico (CASOS)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión unificada del ciclo de vida del activo: Incidencias, Diagnósticos (DT), Órdenes de Trabajo (OS), Alquileres y Garantías.
          </p>
        </div>

        {/* Tabla de Expedientes en Tiempo Real */}
        <CasosTable />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MUR Tecnología S.A.C. • Av. Alfredo Benavides 3082, Of. 503, Miraflores</p>
          <p className="text-[11px]">ServiTrack • Expediente Único de Activos</p>
        </div>
      </footer>

    </div>
  )
}
