"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  FolderOpen, 
  Clock, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw 
} from "lucide-react"
import { NuevoCasoModal } from "@/components/casos/NuevoCasoModal"
import { CasosTable } from "@/components/casos/CasosTable"
import { MurLogo } from "@/components/brand/MurLogo"
import { UserMenu } from "@/components/auth/UserMenu"
import { useAuth } from "@/context/AuthContext"
import { getCasos, suscribirCasos } from "@/services/casoService"
import { Caso } from "@/types"

export default function Dashboard() {
  const { esAdmin } = useAuth()
  const [casos, setCasos] = useState<Caso[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const cargarCasos = async () => {
    setLoading(true)
    try {
      const data = await getCasos()
      setCasos(data)
    } catch (err) {
      console.error("Error cargando casos:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCasos()
    const desuscribir = suscribirCasos((data) => {
      setCasos(data)
      setLoading(false)
    })
    return () => {
      if (typeof desuscribir === "function") desuscribir()
    }
  }, [])

  // Métricas de las 4 Fases
  const registrados = casos.filter(c => c.estado === 'ABIERTO').length
  const enDiagnostico = casos.filter(c => ['EN_DIAGNOSTICO', 'PENDIENTE_DE_APROBACION'].includes(c.estado)).length
  const enTaller = casos.filter(c => ['EN_REPARACION', 'EN_PRUEBAS'].includes(c.estado)).length
  const concluidos = casos.filter(c => ['REPARADO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(c.estado)).length

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Barra de Navegación Superior Limpia y Corporativa */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            <MurLogo size="sm" showSubtitle={false} />
            
            <nav className="hidden md:flex items-center gap-1 border-l border-slate-200 pl-8">
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

          <div className="flex items-center gap-2.5">
            <button 
              onClick={cargarCasos}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2369A1]' : ''}`} />
            </button>

            <NuevoCasoModal>
              <Button className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-colors flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                Aperturar Caso
              </Button>
            </NuevoCasoModal>

            <div className="border-l border-slate-200 pl-3">
              <UserMenu />
            </div>
          </div>

        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Encabezado de Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#2369A1]" />
              Control de Expedientes y Servicio Técnico
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestión unificada del ciclo de vida del activo: Incidencias, Diagnósticos (DT), Órdenes de Trabajo (OS), Alquileres y Garantías.
            </p>
          </div>
        </div>

        {/* Tarjetas de Métricas - Colores Estandarizados según el Flujo de 4 Fases */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Recepción - Azul (#2369A1) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                1. Recepción
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#2369A1] group-hover:scale-105 transition-transform">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{registrados}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2369A1]" />
              <p className="text-[11px] text-slate-500 font-medium">Pendiente de evaluación</p>
            </div>
          </div>

          {/* 2. Diagnóstico - Ámbar */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs hover:border-amber-300 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                2. Diagnóstico
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{enDiagnostico}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <p className="text-[11px] text-slate-500 font-medium">En revisión o propuesta</p>
            </div>
          </div>

          {/* 3. En Taller / QA - Violeta */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs hover:border-violet-300 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                3. En Taller / QA
              </span>
              <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200/80 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform">
                <Wrench className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{enTaller}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <p className="text-[11px] text-slate-500 font-medium">Intervención y pruebas</p>
            </div>
          </div>

          {/* 4. Concluidos - Verde */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs hover:border-emerald-300 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                4. Concluidos
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{concluidos}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[11px] text-slate-500 font-medium">Listos, entregados o en garantía</p>
            </div>
          </div>

        </div>

        {/* Tabla de Expedientes en Tiempo Real */}
        <CasosTable />

      </main>

      {/* Pie de Página Limpio */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MUR Tecnología S.A.C. • Av. Alfredo Benavides 3082, Of. 503, Miraflores</p>
          <p className="text-[11px]">ServiTrack • Expediente Único de Activos</p>
        </div>
      </footer>

    </div>
  )
}
