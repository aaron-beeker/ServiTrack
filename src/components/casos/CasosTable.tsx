"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Caso } from "@/types"
import { referenciaServicioCaso } from "@/lib/pdf/pdfTheme"
import {
  suscribirCasos,
  getCasos,
  sincronizarOrdenesExistentesACasos,
  repararYOrdenarTrazabilidadCasos,
  asegurarTrazabilidadOrdenadaEnSesion
} from "@/services/casoService"
import { CasoStateBadge } from "./CasoStateBadge"
import { 
  Search, 
  RefreshCw, 
  ChevronRight, 
  ShieldCheck, 
  FolderOpen,
  GitBranch
} from "lucide-react"
import { toast } from "sonner"

interface CasosTableProps {
  onSelectCaso?: (codigoCaso: string) => void
  filtroEstadoInicial?: string
}

export function CasosTable({ onSelectCaso, filtroEstadoInicial = "TODOS" }: CasosTableProps) {
  const router = useRouter()
  const [casos, setCasos] = useState<Caso[]>([])
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [ordenando, setOrdenando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState(filtroEstadoInicial)

  useEffect(() => {
    setLoading(true)
    asegurarTrazabilidadOrdenadaEnSesion().catch((err) => {
      console.warn("Auditoría inicial de trazabilidad:", err)
    })

    getCasos()
      .then(data => {
        setCasos(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error cargando casos:", err)
        setLoading(false)
      })

    const desuscribir = suscribirCasos((nuevosCasos) => {
      setCasos(nuevosCasos)
      setLoading(false)
    })

    return () => {
      if (typeof desuscribir === "function") desuscribir()
    }
  }, [])

  const handleSincronizarHistoricos = async () => {
    setSincronizando(true)
    try {
      const migrados = await sincronizarOrdenesExistentesACasos()
      if (migrados > 0) {
        toast.success(`Se sincronizaron ${migrados} órdenes existentes a expedientes de Caso.`)
      } else {
        toast.info("Todos los expedientes ya están sincronizados.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al sincronizar.")
    } finally {
      setSincronizando(false)
    }
  }

  const handleOrdenarTrazabilidad = async () => {
    setOrdenando(true)
    try {
      const res = await repararYOrdenarTrazabilidadCasos()
      if (res.casosActualizados > 0) {
        toast.success(
          `Trazabilidad ordenada: ${res.casosActualizados} expediente(s) normalizado(s)${
            res.informesGenerados > 0 ? ` y ${res.informesGenerados} Informe(s) Técnico(s) IT numerado(s)` : ""
          }.`
        )
      } else {
        toast.success(
          `Trazabilidad verificada: ${res.casosRevisados} expediente(s) con numeración y vínculos conformes.`
        )
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al ordenar la trazabilidad.")
    } finally {
      setOrdenando(false)
    }
  }

  // Filtrado por Caso, serie, cliente, contrato o cualquier documento vinculado (INC, DT, OS, IT, CA)
  const casosFiltrados = casos.filter(caso => {
    const q = busqueda.toLowerCase().trim()
    const coincideTexto = !q ||
      caso.codigoCaso.toLowerCase().includes(q) ||
      caso.equipo.numeroSerie.toLowerCase().includes(q) ||
      caso.cliente.razonSocial.toLowerCase().includes(q) ||
      caso.cliente.ruc.includes(q) ||
      caso.equipo.modelo.toLowerCase().includes(q) ||
      (caso.contratoAlquiler && caso.contratoAlquiler.toLowerCase().includes(q)) ||
      (caso.ordenServicioCliente && caso.ordenServicioCliente.toLowerCase().includes(q)) ||
      Boolean(caso.incidencias?.some(i => i.codigoINC.toLowerCase().includes(q))) ||
      Boolean(caso.diagnosticos?.some(d => d.codigoDT.toLowerCase().includes(q))) ||
      Boolean(caso.ordenesServicio?.some(o => o.codigoOS.toLowerCase().includes(q))) ||
      Boolean(caso.informesTecnicos?.some(it => it.codigoInforme.toLowerCase().includes(q))) ||
      Boolean(caso.constancias?.some(c => c.codigoConstancia.toLowerCase().includes(q)))

    if (!coincideTexto) return false

    if (filtroEstado === "TODOS") return true
    if (filtroEstado === "ABIERTO") return caso.estado === "ABIERTO"
    if (filtroEstado === "EN_DIAGNOSTICO") return caso.estado === "EN_DIAGNOSTICO" || caso.estado === "DIAGNOSTICADO" || caso.estado === "PENDIENTE_DE_APROBACION" || caso.estado === "APROBADO_PARA_REPARACION"
    if (filtroEstado === "EN_REPARACION") return caso.estado === "EN_REPARACION" || caso.estado === "EN_PRUEBAS" || caso.estado === "REPARADO"
    if (filtroEstado === "EN_GARANTIA") return caso.estado === "EN_GARANTIA" || Boolean(caso.garantia?.activa)
    if (filtroEstado === "ENTREGADO") return caso.estado === "ENTREGADO" || caso.estado === "CERRADO" || caso.estado === "CERRADO_SIN_REPARACION" || caso.estado === "DIAGNOSTICADO_NO_APROBADO" || caso.estado === "INOPERATIVO"

    return caso.estado === filtroEstado
  })

  const irAlCaso = (codigoCaso: string) => {
    if (onSelectCaso) {
      onSelectCaso(codigoCaso)
    } else {
      router.push(`/casos/${codigoCaso}`)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden font-sans">
      
      {/* Controles de Búsqueda y Pestañas de Estado */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        
        <div className="relative w-full md:w-84">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar Caso, DT, OS, IT, CA, serie, cliente o contrato..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2369A1] transition-all"
          />
        </div>

        {/* Pestañas de Filtrado Alineadas a las 4 Etapas */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "TODOS", label: "Todos", dot: "" },
            { id: "ABIERTO", label: "1. Ingreso", dot: "bg-[#2369A1]" },
            { id: "EN_DIAGNOSTICO", label: "2. Diagnóstico", dot: "bg-amber-500" },
            { id: "EN_REPARACION", label: "3. Taller & QA", dot: "bg-violet-500" },
            { id: "EN_GARANTIA", label: "En Garantía", dot: "bg-emerald-500" },
            { id: "ENTREGADO", label: "4. Entregado / Finalizado", dot: "bg-slate-400" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
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

          {casos.length > 0 && !loading && (
            <button
              onClick={handleOrdenarTrazabilidad}
              disabled={ordenando}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 font-semibold flex items-center gap-1 ml-1 transition-colors"
              title="Auditar, numerar y vincular todos los expedientes (CASO, INC, DT, OS, IT, CA)"
            >
              <GitBranch className={`w-3.5 h-3.5 text-[#2369A1] ${ordenando ? 'animate-pulse' : ''}`} />
              {ordenando ? "Ordenando..." : "Ordenar Trazabilidad"}
            </button>
          )}

          {/* Sincronización transparente de órdenes previas si la base de datos está vacía */}
          {casos.length === 0 && !loading && (
            <button
              onClick={handleSincronizarHistoricos}
              disabled={sincronizando}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#2369A1] border border-blue-200 hover:bg-blue-100 font-semibold flex items-center gap-1 ml-2"
              title="Importar órdenes técnicas existentes a la nueva estructura de Casos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
              Sincronizar Órdenes Previas
            </button>
          )}
        </div>

      </div>

      {/* Contenido: Tabla de Expedientes */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#2369A1]" />
          <span className="text-xs">Sincronizando expedientes en tiempo real...</span>
        </div>
      ) : casosFiltrados.length === 0 ? (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <FolderOpen className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs">
            {busqueda ? `No se encontraron expedientes para "${busqueda}".` : "No hay casos en este estado."}
          </p>
          {casos.length === 0 && (
            <div className="pt-2">
              <button
                onClick={handleSincronizarHistoricos}
                disabled={sincronizando}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#2369A1] text-white hover:bg-[#1B5380] font-semibold inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
                Importar Órdenes Existentes como Casos
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Expediente / Caso</th>
                <th className="py-3 px-4">Cliente & Contrato</th>
                <th className="py-3 px-4">Activo / Equipo</th>
                <th className="py-3 px-4">Número de Serie</th>
                <th className="py-3 px-4 text-center">Trazabilidad</th>
                <th className="py-3 px-4 text-center">Garantía</th>
                <th className="py-3 px-4 text-center">Estado General</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {casosFiltrados.map((caso) => {
                const numInc = caso.incidencias?.length || 0
                const numDt = caso.diagnosticos?.length || 0
                const numOs = caso.ordenesServicio?.length || 0
                const numIt = caso.informesTecnicos?.length || 0
                const numConst = caso.constancias?.length || 0

                const ultimoDtCod = caso.diagnosticos?.[numDt - 1]?.codigoDT
                const ultimaOsCod = caso.ordenesServicio?.[numOs - 1]?.codigoOS
                const ultimoItCod = caso.informesTecnicos?.[numIt - 1]?.codigoInforme
                const ultimaCaCod = caso.constancias?.[numConst - 1]?.codigoConstancia
                const cadenaCodigos = [ultimoDtCod, ultimaOsCod, ultimoItCod, ultimaCaCod]
                  .filter(Boolean)
                  .join(" · ")

                return (
                  <tr
                    key={caso.id || caso.codigoCaso}
                    onClick={() => irAlCaso(caso.codigoCaso)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* 1. Código de Caso & Origen */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-xs text-[#2369A1] group-hover:underline">
                          {caso.codigoCaso}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                            caso.origen === "ALQUILER" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            caso.origen === "RECLAMO_GARANTIA" ? "bg-amber-50 text-amber-800 border-amber-300 font-bold" :
                            "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {caso.origen === "ALQUILER" ? "Alquiler" : caso.origen === "RECLAMO_GARANTIA" ? "Garantía" : "Taller"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Cliente & Contrato */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="font-semibold text-slate-900 truncate" title={caso.cliente.razonSocial}>
                          {caso.cliente.razonSocial}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          RUC: {caso.cliente.ruc}
                        </span>
                        {(caso.contratoAlquiler || caso.ordenServicioCliente) && (
                          <span className="text-[10px] text-purple-700 font-mono font-medium truncate" title={referenciaServicioCaso(caso)}>
                            {referenciaServicioCaso(caso)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Activo / Equipo */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">
                        {caso.equipo.marca} {caso.equipo.modelo}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {caso.equipo.tipoEquipo}
                      </span>
                    </td>

                    {/* 4. Número de Serie */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-700 font-semibold">
                      {caso.equipo.numeroSerie}
                    </td>

                    {/* 5. Trazabilidad (Contadores + Códigos Vinculados) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100/70 border border-slate-200 px-2 py-0.5 rounded-md">
                          <span title={`${numInc} Incidencias`} className="font-semibold">{numInc} INC</span>
                          <span>•</span>
                          <span title={`${numDt} Diagnósticos`} className="font-semibold text-amber-700">{numDt} DT</span>
                          <span>•</span>
                          <span title={`${numOs} Órdenes de Servicio`} className="font-semibold text-violet-700">{numOs} OS</span>
                          {numIt > 0 && (
                            <>
                              <span>•</span>
                              <span title={`${numIt} Informes Técnicos`} className="font-semibold text-[#2369A1]">{numIt} IT</span>
                            </>
                          )}
                          {numConst > 0 && (
                            <>
                              <span>•</span>
                              <span title={`${numConst} Constancias de Atención`} className="font-semibold text-emerald-700">{numConst} CA</span>
                            </>
                          )}
                        </div>
                        {cadenaCodigos && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {cadenaCodigos}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Garantía */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {caso.garantia?.activa ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Activa ({caso.garantia.diasGarantia}d)
                        </span>
                      ) : caso.garantia?.reingresosContador > 0 ? (
                        <span className="text-[10px] text-amber-700 font-medium">
                          {caso.garantia.reingresosContador} reingreso(s)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* 7. Estado General */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <CasoStateBadge estado={caso.estado} size="sm" />
                    </td>

                    {/* Acción */}
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

      {/* Footer con conteo en vivo */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <span>Mostrando {casosFiltrados.length} de {casos.length} expedientes de servicio</span>
        <span className="flex items-center gap-1.5 font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Trazabilidad en tiempo real activa
        </span>
      </div>

    </div>
  )
}
