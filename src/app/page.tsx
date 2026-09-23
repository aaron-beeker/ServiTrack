"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  RefreshCw, 
  Search, 
  ChevronRight,
  Laptop,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  FileText
} from "lucide-react"
import { TicketModal } from "@/components/tickets/TicketModal"
import { MurLogo } from "@/components/brand/MurLogo"
import { getOrdenesServicio } from "@/services/ordenServicioService"
import { OrdenServicio } from "@/types"

export default function Dashboard() {
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS")
  const router = useRouter()

  const cargarOrdenes = async () => {
    setLoading(true)
    try {
      const data = await getOrdenesServicio()
      setOrdenes(data)
    } catch (err) {
      console.error("Error cargando órdenes de servicio", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarOrdenes()
  }, [])

  // Métricas
  const registrados = ordenes.filter(t => t.estadoGeneral === 'REGISTRADO').length
  const enDiagnostico = ordenes.filter(t => ['EN_DIAGNOSTICO', 'DIAGNOSTICADO', 'DIAGNOSTICADO_NO_APROBADO'].includes(t.estadoGeneral)).length
  const enTaller = ordenes.filter(t => ['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'OBSERVADO'].includes(t.estadoGeneral)).length
  const concluidos = ordenes.filter(t => ['REPARADO', 'INOPERATIVO', 'ENTREGADO', 'CERRADO_SIN_REPARACION'].includes(t.estadoGeneral)).length

  // Filtrado
  const ordenesFiltradas = ordenes.filter(ord => {
    const q = busqueda.toLowerCase().trim()
    const coincideTexto = !q || 
      ord.codigoDT.toLowerCase().includes(q) ||
      ord.ingreso.equipo.numeroSerie.toLowerCase().includes(q) ||
      ord.ingreso.cliente.razonSocial.toLowerCase().includes(q) ||
      ord.ingreso.cliente.ruc.includes(q) ||
      ord.ingreso.equipo.modelo.toLowerCase().includes(q)

    if (!coincideTexto) return false

    if (filtroEstado === 'TODOS') return true
    if (filtroEstado === 'REGISTRADO') return ord.estadoGeneral === 'REGISTRADO'
    if (filtroEstado === 'DIAGNOSTICO') return ['EN_DIAGNOSTICO', 'DIAGNOSTICADO', 'DIAGNOSTICADO_NO_APROBADO'].includes(ord.estadoGeneral)
    if (filtroEstado === 'REPARACION') return ['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'OBSERVADO'].includes(ord.estadoGeneral)
    if (filtroEstado === 'ENTREGADO') return ['ENTREGADO', 'REPARADO', 'CERRADO_SIN_REPARACION'].includes(ord.estadoGeneral)

    return true
  })

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
                className="px-3 py-1.5 text-xs font-semibold text-[#2369A1] bg-[#2369A1]/8 rounded-md"
              >
                Panel de Control
              </button>
              <button 
                onClick={() => router.push('/tickets')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Órdenes de Servicio
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={cargarOrdenes}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2369A1]' : ''}`} />
            </button>

            <TicketModal onSuccess={() => cargarOrdenes()}>
              <Button className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors">
                <Plus className="w-4 h-4 mr-1.5" />
                Nueva Orden
              </Button>
            </TicketModal>
          </div>

        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Encabezado de Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Control de Servicio Técnico
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestión y trazabilidad de atenciones en laboratorio de hardware • MUR Tecnología
            </p>
          </div>
        </div>

        {/* Tarjetas de Métricas - Diseño Minimalista y Funcional */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">1. Recepción</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{registrados}</div>
            <p className="text-[11px] text-slate-500 mt-1">Pendiente de evaluación</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">2. Diagnóstico</span>
              <AlertCircle className="w-4 h-4 text-[#2369A1]" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{enDiagnostico}</div>
            <p className="text-[11px] text-slate-500 mt-1">En revisión o propuesta</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">3. En Taller / QA</span>
              <Wrench className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{enTaller}</div>
            <p className="text-[11px] text-slate-500 mt-1">Intervención y pruebas</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">4. Concluidos</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{concluidos}</div>
            <p className="text-[11px] text-slate-500 mt-1">Listos o entregados</p>
          </div>
        </div>

        {/* Sección de Tabla y Búsqueda */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
            
            {/* Buscador */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por DT, serie, cliente o modelo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2369A1] transition-all"
              />
            </div>

            {/* Pestañas de Estado */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'REGISTRADO', label: '1. Recepción' },
                { id: 'DIAGNOSTICO', label: '2. Diagnóstico' },
                { id: 'REPARACION', label: '3. En Taller' },
                { id: 'ENTREGADO', label: '4. Concluidos' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFiltroEstado(tab.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                    filtroEstado === tab.id
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>

          {/* Listado de Órdenes */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#2369A1]" />
              <span className="text-xs">Cargando órdenes...</span>
            </div>
          ) : ordenesFiltradas.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Laptop className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">
                {busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay órdenes técnicas en este estado."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ordenesFiltradas.map(orden => (
                <div
                  key={orden.codigoDT}
                  onClick={() => router.push(`/tickets/${orden.codigoDT}`)}
                  className="px-5 py-3.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <StatusDot estado={orden.estadoGeneral} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#2369A1] group-hover:underline">
                          {orden.codigoDT}
                        </span>
                        <span className="text-slate-300 text-xs">•</span>
                        <span className="text-xs font-semibold text-slate-900">
                          {orden.ingreso.cliente.razonSocial}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          (RUC: {orden.ingreso.cliente.ruc})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {orden.ingreso.equipo.marca} {orden.ingreso.equipo.modelo} — S/N: <span className="font-mono text-slate-700">{orden.ingreso.equipo.numeroSerie}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge estado={orden.estadoGeneral} />
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </main>

      {/* Pie de Página Limpio */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MUR Tecnología S.A.C. • Av. Alfredo Benavides 3082, Of. 503, Miraflores</p>
          <p className="text-[11px]">Sistema de Control Técnico • SRT</p>
        </div>
      </footer>

    </div>
  )
}

function StatusDot({ estado }: { estado: string }) {
  const dotColors: Record<string, string> = {
    ENTREGADO: "bg-emerald-500",
    REPARADO: "bg-teal-500",
    APROBADO_PARA_REPARACION: "bg-[#2369A1]",
    EN_REPARACION: "bg-violet-500",
    DIAGNOSTICADO: "bg-sky-500",
    EN_DIAGNOSTICO: "bg-sky-500",
    REGISTRADO: "bg-amber-500",
    OBSERVADO: "bg-amber-500",
    INOPERATIVO: "bg-rose-500",
    CERRADO_SIN_REPARACION: "bg-rose-500",
  }

  return (
    <span className={`w-2 h-2 rounded-full shrink-0 ${dotColors[estado] || 'bg-slate-400'}`} />
  )
}

function StatusBadge({ estado }: { estado: string }) {
  const badgeStyles: Record<string, string> = {
    ENTREGADO: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    REPARADO: "bg-teal-50 text-teal-700 border-teal-200/80",
    APROBADO_PARA_REPARACION: "bg-blue-50 text-blue-700 border-blue-200/80",
    EN_REPARACION: "bg-violet-50 text-violet-700 border-violet-200/80",
    DIAGNOSTICADO: "bg-sky-50 text-sky-700 border-sky-200/80",
    EN_DIAGNOSTICO: "bg-sky-50 text-sky-700 border-sky-200/80",
    REGISTRADO: "bg-amber-50 text-amber-700 border-amber-200/80",
    OBSERVADO: "bg-amber-50 text-amber-700 border-amber-200/80",
    INOPERATIVO: "bg-rose-50 text-rose-700 border-rose-200/80",
    CERRADO_SIN_REPARACION: "bg-rose-50 text-rose-700 border-rose-200/80",
  }

  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeStyles[estado] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {estado.replace(/_/g, ' ')}
    </span>
  )
}
