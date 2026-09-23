"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getOrdenesServicio } from "@/services/ordenServicioService"
import { OrdenServicio } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, Laptop, RefreshCw, ChevronRight } from "lucide-react"
import { TicketModal } from "@/components/tickets/TicketModal"
import { MurLogo } from "@/components/brand/MurLogo"

export default function TicketsList() {
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS")
  const router = useRouter()

  const cargar = async () => {
    setLoading(true)
    try {
      const data = await getOrdenesServicio()
      setOrdenes(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const ordenesFiltradas = ordenes.filter(o => {
    const q = filtro.toLowerCase().trim()
    const matchText = !q ||
      o.codigoDT.toLowerCase().includes(q) ||
      o.ingreso.equipo.numeroSerie.toLowerCase().includes(q) ||
      o.ingreso.cliente.razonSocial.toLowerCase().includes(q) ||
      o.ingreso.cliente.ruc.includes(q) ||
      o.ingreso.equipo.modelo.toLowerCase().includes(q)

    if (!matchText) return false
    if (filtroEstado !== 'TODOS' && o.estadoGeneral !== filtroEstado) return false
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')} 
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <MurLogo size="sm" showSubtitle={false} />
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-900">Órdenes de Servicio</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={cargar} 
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2369A1]' : ''}`} />
            </button>
            <TicketModal onSuccess={() => cargar()} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Directorio de Órdenes Técnicas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico y trazabilidad completa de equipos en laboratorio
          </p>
        </div>

        {/* Card Contenedor */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          
          {/* Filtros */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por DT, serie, cliente o modelo..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2369A1] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'REGISTRADO', label: 'Recepción' },
                { id: 'EN_DIAGNOSTICO', label: 'Diagnóstico' },
                { id: 'APROBADO_PARA_REPARACION', label: 'Aprobados' },
                { id: 'EN_REPARACION', label: 'En Taller' },
                { id: 'REPARADO', label: 'Reparados' },
                { id: 'ENTREGADO', label: 'Entregados' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setFiltroEstado(st.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                    filtroEstado === st.id
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listado */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#2369A1]" />
              <span className="text-xs">Cargando órdenes de Firestore...</span>
            </div>
          ) : ordenesFiltradas.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Laptop className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">No se encontraron órdenes que coincidan con la búsqueda.</p>
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
