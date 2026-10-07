"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { OrdenServicio, EstadoGeneral } from "@/types"
import { suscribirOrdenesServicio, getOrdenesServicio } from "@/services/ordenServicioService"
import { 
  Search, 
  RefreshCw, 
  Laptop, 
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react"

interface OrdersTableProps {
  onSelectOrder?: (codigoDT: string) => void
  filtroEstadoInicial?: string
}

/**
 * Componente OrdersTable
 * Vista tabular general de órdenes de servicio en taller con reactividad en tiempo real (Firestore)
 */
export function OrdersTable({ onSelectOrder, filtroEstadoInicial = "TODOS" }: OrdersTableProps) {
  const router = useRouter()
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState(filtroEstadoInicial)

  // Reactividad en tiempo real con Firestore onSnapshot
  useEffect(() => {
    setLoading(true)

    // Carga inicial
    getOrdenesServicio()
      .then(data => {
        setOrdenes(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error al cargar órdenes:", err)
        setLoading(false)
      })

    // Suscripción reactiva en vivo
    const desuscribir = suscribirOrdenesServicio((nuevasOrdenes) => {
      setOrdenes(nuevasOrdenes)
      setLoading(false)
    })

    return () => {
      if (typeof desuscribir === "function") desuscribir()
    }
  }, [])

  // Filtrado reactivo en memoria por texto y estado
  const ordenesFiltradas = ordenes.filter(orden => {
    const q = busqueda.toLowerCase().trim()
    const coincideTexto = !q ||
      orden.codigoDT.toLowerCase().includes(q) ||
      orden.ingreso.equipo.numeroSerie.toLowerCase().includes(q) ||
      orden.ingreso.cliente.razonSocial.toLowerCase().includes(q) ||
      orden.ingreso.cliente.ruc.toLowerCase().includes(q) ||
      orden.ingreso.equipo.modelo.toLowerCase().includes(q) ||
      orden.ingreso.equipo.marca.toLowerCase().includes(q) ||
      orden.ingreso.fallaReportada.toLowerCase().includes(q)

    if (!coincideTexto) return false

    if (filtroEstado === "TODOS") return true
    if (filtroEstado === "REGISTRADO") return orden.estadoGeneral === "REGISTRADO"
    if (filtroEstado === "EN_DIAGNOSTICO") {
      return orden.estadoGeneral === "EN_DIAGNOSTICO" || orden.estadoGeneral === "DIAGNOSTICADO"
    }
    if (filtroEstado === "REPARADO") {
      return orden.estadoGeneral === "REPARADO" || orden.estadoGeneral === "EN_REPARACION" || orden.estadoGeneral === "APROBADO_PARA_REPARACION"
    }
    if (filtroEstado === "ENTREGADO") {
      return orden.estadoGeneral === "ENTREGADO" || orden.estadoGeneral === "CERRADO_SIN_REPARACION"
    }

    return orden.estadoGeneral === filtroEstado
  })

  const handleRowClick = (codigoDT: string) => {
    if (onSelectOrder) {
      onSelectOrder(codigoDT)
    } else {
      router.push(`/tickets/${codigoDT}`)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden font-sans">
      
      {/* Barra de Controles: Búsqueda y Filtros por Estado */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        
        {/* Campo de Búsqueda */}
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

        {/* Pestañas de Estado con diferenciación visual */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "TODOS", label: "Todos", dot: "" },
            { id: "REGISTRADO", label: "Registrado", dot: "bg-[#2369A1]" },
            { id: "EN_DIAGNOSTICO", label: "En Diagnóstico", dot: "bg-amber-500" },
            { id: "REPARADO", label: "Reparado", dot: "bg-emerald-500" },
            { id: "ENTREGADO", label: "Entregado", dot: "bg-slate-400" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                filtroEstado === tab.id
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
              )}
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Contenido: Tabla de Órdenes */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#2369A1]" />
          <span className="text-xs">Sincronizando órdenes con Firestore en tiempo real...</span>
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <Laptop className="w-9 h-9 mx-auto text-slate-300" />
          <p className="text-xs">
            {busqueda 
              ? `No se encontraron órdenes que coincidan con "${busqueda}".` 
              : "No hay órdenes técnicas en este estado."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Código DT</th>
                <th className="py-3 px-4">Fecha de Recepción</th>
                <th className="py-3 px-4">Cliente Empresarial</th>
                <th className="py-3 px-4">Equipo / Modelo</th>
                <th className="py-3 px-4">Número de Serie</th>
                <th className="py-3 px-4">Falla Reportada</th>
                <th className="py-3 px-4 text-center">Estado Operativo</th>
                <th className="py-3 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {ordenesFiltradas.map((orden) => {
                const fechaFormat = orden.ingreso?.fechaIngreso
                  ? new Date(orden.ingreso.fechaIngreso).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    })
                  : "N/A"

                return (
                  <tr
                    key={orden.codigoDT}
                    onClick={() => handleRowClick(orden.codigoDT)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* 1. Código DT */}
                    <td className="py-3 px-4 font-mono font-bold text-[#2369A1] group-hover:underline whitespace-nowrap">
                      {orden.codigoDT}
                    </td>

                    {/* 2. Fecha de Recepción */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {fechaFormat}
                    </td>

                    {/* 3. Cliente Empresarial */}
                    <td className="py-3 px-4">
                      <div className="max-w-[190px]">
                        <p className="font-semibold text-slate-900 truncate" title={orden.ingreso.cliente.razonSocial}>
                          {orden.ingreso.cliente.razonSocial}
                        </p>
                        <span className="text-[11px] text-slate-400 font-mono">
                          RUC: {orden.ingreso.cliente.ruc}
                        </span>
                      </div>
                    </td>

                    {/* 4. Equipo / Modelo */}
                    <td className="py-3 px-4">
                      <div className="max-w-[180px]">
                        <p className="font-medium text-slate-800 truncate">
                          {orden.ingreso.equipo.marca} {orden.ingreso.equipo.modelo}
                        </p>
                        <span className="text-[11px] text-slate-400">
                          {orden.ingreso.equipo.tipoEquipo}
                        </span>
                      </div>
                    </td>

                    {/* 5. Número de Serie */}
                    <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {orden.ingreso.equipo.numeroSerie}
                    </td>

                    {/* 6. Falla Reportada */}
                    <td className="py-3 px-4 text-slate-600 max-w-[220px]">
                      <p className="truncate text-xs" title={orden.ingreso.fallaReportada}>
                        {orden.ingreso.fallaReportada}
                      </p>
                    </td>

                    {/* 7. Estado Operativo (Badges normalizados) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <OrderStateBadge estado={orden.estadoGeneral} />
                    </td>

                    {/* Acción / Flecha */}
                    <td className="py-3 px-2 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all inline-block" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pie de Tabla con Totalizadores */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-500">
        <span>Mostrando {ordenesFiltradas.length} de {ordenes.length} órdenes registradas</span>
        <span className="flex items-center gap-1.5 font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Sincronización en vivo activa
        </span>
      </div>

    </div>
  )
}

/**
 * Insignias de Estado (Badges) con diferenciación cromática normalizada:
 * - Azul para REGISTRADO
 * - Amarillo para EN_DIAGNOSTICO / DIAGNOSTICADO
 * - Verde para REPARADO
 * - Gris para ENTREGADO / CERRADO_SIN_REPARACION
 */
export function OrderStateBadge({ estado }: { estado: EstadoGeneral | string }) {
  const badgeConfig: Record<string, { label: string; className: string }> = {
    // Azul para REGISTRADO
    REGISTRADO: {
      label: "REGISTRADO",
      className: "bg-blue-50 text-[#2369A1] border-blue-200"
    },
    // Amarillo / Ámbar para EN_DIAGNOSTICO / DIAGNOSTICADO
    EN_DIAGNOSTICO: {
      label: "EN DIAGNÓSTICO",
      className: "bg-amber-50 text-amber-800 border-amber-300"
    },
    DIAGNOSTICADO: {
      label: "DIAGNOSTICADO",
      className: "bg-amber-50 text-amber-800 border-amber-300"
    },
    DIAGNOSTICADO_NO_APROBADO: {
      label: "NO APROBADO",
      className: "bg-amber-50 text-amber-800 border-amber-300"
    },
    OBSERVADO: {
      label: "OBSERVADO",
      className: "bg-amber-50 text-amber-800 border-amber-300"
    },
    // Aprobado / En Reparación
    APROBADO_PARA_REPARACION: {
      label: "APROBADO",
      className: "bg-sky-50 text-sky-800 border-sky-300"
    },
    EN_REPARACION: {
      label: "EN TALLER",
      className: "bg-violet-50 text-violet-800 border-violet-300"
    },
    // Verde para REPARADO
    REPARADO: {
      label: "REPARADO",
      className: "bg-emerald-50 text-emerald-700 border-emerald-300"
    },
    // Gris para ENTREGADO / CERRADO
    ENTREGADO: {
      label: "ENTREGADO",
      className: "bg-slate-100 text-slate-700 border-slate-300"
    },
    CERRADO_SIN_REPARACION: {
      label: "SIN REPARACIÓN",
      className: "bg-slate-100 text-slate-600 border-slate-300"
    },
    INOPERATIVO: {
      label: "INOPERATIVO",
      className: "bg-rose-50 text-rose-700 border-rose-300"
    }
  }

  const conf = badgeConfig[estado] || {
    label: estado.replace(/_/g, " "),
    className: "bg-slate-100 text-slate-700 border-slate-200"
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.className}`}>
      {conf.label}
    </span>
  )
}
