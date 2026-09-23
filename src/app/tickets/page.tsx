"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getOrdenesServicio } from "@/services/ordenServicioService"
import { OrdenServicio } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LayoutDashboard, Search, Laptop, Building2, RefreshCw } from "lucide-react"
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
    <div className="min-h-screen bg-[#090E17] text-slate-100 p-8 max-w-7xl mx-auto font-sans">
      {/* Top Bar con Logo Corporativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#2369A1]/20">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/')} 
            className="border-slate-800 bg-[#0F1A2C] hover:bg-[#192A45] text-slate-300 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <MurLogo size="sm" showSubtitle={false} />
              <span className="text-slate-600">|</span>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Directorio de Órdenes Técnicas</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Control de atenciones en laboratorio de hardware y taller especializado</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={cargar} 
            disabled={loading}
            className="border-slate-800 bg-[#0F1A2C] hover:bg-[#192A45] text-slate-300 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#38BDF8]' : ''}`} />
          </Button>
          <TicketModal onSuccess={() => cargar()} />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#0F1A2C]/80 border border-[#2369A1]/20 backdrop-blur-sm rounded-2xl p-4 mb-6 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Código DT, S/N de serie, RUC, cliente o modelo..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#090E17] border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#2369A1]"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {[
            'TODOS', 
            'REGISTRADO', 
            'EN_DIAGNOSTICO', 
            'DIAGNOSTICADO', 
            'APROBADO_PARA_REPARACION', 
            'CERRADO_SIN_REPARACION',
            'EN_REPARACION', 
            'REPARADO', 
            'OBSERVADO', 
            'INOPERATIVO', 
            'ENTREGADO'
          ].map(st => (
            <button
              key={st}
              onClick={() => setFiltroEstado(st)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                filtroEstado === st
                  ? 'bg-[#2369A1] text-white font-semibold shadow-sm'
                  : 'text-slate-400 bg-[#090E17] hover:text-slate-200 border border-slate-800/80 hover:bg-[#142238]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-[#0F1A2C]/80 border border-[#2369A1]/20 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2369A1]" />
            <span className="text-xs">Consultando órdenes en Firestore...</span>
          </div>
        ) : ordenesFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#132238] flex items-center justify-center">
              <Laptop className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-xs">No se encontraron órdenes que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2369A1]/15">
            {ordenesFiltradas.map(orden => (
              <div 
                key={orden.codigoDT} 
                onClick={() => router.push(`/tickets/${orden.codigoDT}`)}
                className="p-4 hover:bg-[#142238]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-100 group-hover:text-[#38BDF8] transition-colors">
                      {orden.codigoDT}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-sm font-semibold text-slate-200">
                      {orden.ingreso.cliente.razonSocial}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      (RUC: {orden.ingreso.cliente.ruc})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <Laptop className="w-3.5 h-3.5 text-slate-500" />
                    <span>{orden.ingreso.equipo.tipoEquipo}: {orden.ingreso.equipo.marca} {orden.ingreso.equipo.modelo}</span>
                    <span>•</span>
                    <span>S/N: <strong className="text-slate-300 font-mono">{orden.ingreso.equipo.numeroSerie}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${
                    orden.estadoGeneral === 'ENTREGADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                    orden.estadoGeneral === 'REPARADO' ? 'bg-teal-500/10 text-teal-400 border-teal-500/25' :
                    orden.estadoGeneral === 'APROBADO_PARA_REPARACION' ? 'bg-[#2369A1]/20 text-[#38BDF8] border-[#2369A1]/40' :
                    orden.estadoGeneral === 'CERRADO_SIN_REPARACION' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                    orden.estadoGeneral === 'INOPERATIVO' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                    orden.estadoGeneral === 'OBSERVADO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                    orden.estadoGeneral === 'EN_REPARACION' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                    orden.estadoGeneral === 'DIAGNOSTICADO' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' :
                    orden.estadoGeneral === 'EN_DIAGNOSTICO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/25'
                  }`}>
                    {orden.estadoGeneral}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
