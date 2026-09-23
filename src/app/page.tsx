"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  PlusCircle, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LayoutDashboard, 
  RefreshCw, 
  Search, 
  Laptop, 
  ChevronRight 
} from "lucide-react"
import { TicketModal } from "@/components/tickets/TicketModal"
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

  // Métricas calculadas según el nuevo ciclo operativo oficial
  const registrados = ordenes.filter(t => t.estadoGeneral === 'REGISTRADO').length
  const enDiagnostico = ordenes.filter(t => ['EN_DIAGNOSTICO', 'DIAGNOSTICADO', 'DIAGNOSTICADO_NO_APROBADO'].includes(t.estadoGeneral)).length
  const enTaller = ordenes.filter(t => ['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'OBSERVADO'].includes(t.estadoGeneral)).length
  const concluidos = ordenes.filter(t => ['REPARADO', 'INOPERATIVO', 'ENTREGADO', 'CERRADO_SIN_REPARACION'].includes(t.estadoGeneral)).length

  // Filtrado reactivo en tiempo real
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
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar - Glassmorphism */}
      <aside className="w-64 flex flex-col backdrop-blur-2xl bg-slate-900/60 border-r border-slate-800/50 p-6 relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">ServiTrack</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">MUR Tecnología</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" active />
          <NavItem href="/tickets" icon={<Wrench size={18} />} label="Órdenes de Servicio" />
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800/50">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Base de Datos</p>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Firestore Activo
            </p>
            <p className="text-[10px] text-slate-500 font-mono">ordenes_servicio</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <header className="h-20 flex items-center justify-between px-10 border-b border-slate-800/50 backdrop-blur-md bg-slate-950/60 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Control de Atenciones Técnicas (SRT)</h2>
            <p className="text-xs text-slate-400">MUR Tecnología S.A.C. • Mesa de Ayuda y Laboratorio de Hardware</p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={cargarOrdenes} 
              disabled={loading}
              className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              title="Recargar órdenes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </Button>
            <TicketModal onSuccess={() => cargarOrdenes()}>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 rounded-xl transition-all duration-300 hover:scale-105">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Ingreso (DT)
              </Button>
            </TicketModal>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-10 space-y-8 relative z-10">
          
          {/* Stats Cards (4 etapas del flujo) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="1. Registrados / Ingreso" 
              value={registrados.toString()} 
              icon={<Clock className="w-5 h-5 text-amber-400" />} 
              trend="Pendiente revisión técnica"
              trendUp={true}
              borderColor="border-amber-500/20"
              bgColor="bg-amber-500/5"
            />
            <StatCard 
              title="2. En Diagnóstico / Propuesta" 
              value={enDiagnostico.toString()} 
              icon={<AlertCircle className="w-5 h-5 text-blue-400" />} 
              trend="Evaluación y aprobación cliente"
              borderColor="border-blue-500/20"
              bgColor="bg-blue-500/5"
            />
            <StatCard 
              title="3. En Taller / Reparación" 
              value={enTaller.toString()} 
              icon={<Wrench className="w-5 h-5 text-purple-400" />} 
              trend="Intervención física y QA"
              borderColor="border-purple-500/20"
              bgColor="bg-purple-500/5"
            />
            <StatCard 
              title="4. Concluidos / Cierre" 
              value={concluidos.toString()} 
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} 
              trend="Entregados o cerrados"
              trendUp={true}
              borderColor="border-emerald-500/20"
              bgColor="bg-emerald-500/5"
            />
          </div>

          {/* Activity Section with Live Filter Controls */}
          <Card className="bg-slate-900/60 border-slate-800/60 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium text-slate-200">Órdenes de Servicio en Taller</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Gestión transaccional en tiempo real desde la colección <span className="font-mono text-blue-400">ordenes_servicio</span>.
                  </CardDescription>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar DT, Serie, RUC, Cliente..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 pt-3 flex-wrap">
                {[
                  { id: 'TODOS', label: 'Todas las Órdenes' },
                  { id: 'REGISTRADO', label: 'Registrados' },
                  { id: 'DIAGNOSTICO', label: 'Diagnóstico & Propuesta' },
                  { id: 'REPARACION', label: 'En Taller / QA' },
                  { id: 'ENTREGADO', label: 'Concluidos / Entregados' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFiltroEstado(tab.id)}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                      filtroEstado === tab.id
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span>Cargando órdenes desde Firestore...</span>
                </div>
              ) : ordenesFiltradas.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/40 flex items-center justify-center">
                    <Laptop className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-sm">
                    {busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay órdenes técnicas registradas."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {ordenesFiltradas.map(orden => (
                    <div 
                      key={orden.codigoDT} 
                      onClick={() => router.push(`/tickets/${orden.codigoDT}`)}
                      className="p-4 hover:bg-slate-800/30 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          orden.estadoGeneral === 'ENTREGADO' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
                          orden.estadoGeneral === 'REPARADO' ? 'bg-teal-400 shadow-sm shadow-teal-400/50' :
                          orden.estadoGeneral === 'APROBADO_PARA_REPARACION' ? 'bg-blue-400 shadow-sm shadow-blue-400/50' :
                          orden.estadoGeneral === 'CERRADO_SIN_REPARACION' ? 'bg-rose-500 shadow-sm shadow-rose-500/50' :
                          orden.estadoGeneral === 'INOPERATIVO' ? 'bg-rose-500 shadow-sm shadow-rose-500/50' :
                          orden.estadoGeneral === 'OBSERVADO' ? 'bg-amber-500 shadow-sm shadow-amber-500/50' :
                          orden.estadoGeneral === 'EN_REPARACION' ? 'bg-purple-500 shadow-sm shadow-purple-500/50' :
                          orden.estadoGeneral === 'DIAGNOSTICADO' ? 'bg-indigo-400 shadow-sm shadow-indigo-400/50' :
                          orden.estadoGeneral === 'EN_DIAGNOSTICO' ? 'bg-blue-400 shadow-sm shadow-blue-400/50' :
                          'bg-amber-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors font-mono">
                              {orden.codigoDT}
                            </p>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-300 font-medium">
                              {orden.ingreso.cliente.razonSocial}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {orden.ingreso.equipo.marca} {orden.ingreso.equipo.modelo} • S/N: <span className="font-mono text-slate-300">{orden.ingreso.equipo.numeroSerie}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                          orden.estadoGeneral === 'ENTREGADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          orden.estadoGeneral === 'REPARADO' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                          orden.estadoGeneral === 'APROBADO_PARA_REPARACION' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          orden.estadoGeneral === 'CERRADO_SIN_REPARACION' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          orden.estadoGeneral === 'INOPERATIVO' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          orden.estadoGeneral === 'OBSERVADO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          orden.estadoGeneral === 'EN_REPARACION' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          orden.estadoGeneral === 'DIAGNOSTICADO' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          orden.estadoGeneral === 'EN_DIAGNOSTICO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {orden.estadoGeneral}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  const router = useRouter()
  return (
    <div 
      onClick={(e) => { e.preventDefault(); router.push(href) }}
      className={`cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
        ${active 
          ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)]' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
    >
      <div className={`transition-transform duration-300 group-hover:scale-110 ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend: string
  trendUp?: boolean
  borderColor: string
  bgColor: string
}

function StatCard({ title, value, icon, trend, trendUp, borderColor, bgColor }: StatCardProps) {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} backdrop-blur-md p-6 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-400 font-medium text-xs">{title}</h3>
        <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/50 shadow-inner group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-100 tracking-tight mb-1">{value}</div>
        <div className={`text-[11px] font-medium ${trendUp === true ? 'text-emerald-400' : trendUp === false ? 'text-rose-400' : 'text-slate-400'}`}>
          {trend}
        </div>
      </div>
    </div>
  )
}
