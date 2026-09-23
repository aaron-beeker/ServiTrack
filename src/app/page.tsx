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
  ChevronRight,
  Shield,
  PhoneCall,
  MapPin,
  ExternalLink,
  Layers
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

  // Métricas calculadas según el ciclo operativo de taller
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
    <div className="flex h-screen bg-[#090E17] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar Corporativo - MUR Tecnología */}
      <aside className="w-72 flex flex-col bg-[#0B1320] border-r border-[#2369A1]/20 p-6 relative z-10 select-none">
        
        {/* Brand Header con Logo Oficial */}
        <div className="mb-8">
          <MurLogo size="md" />
          <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2369A1]/10 border border-[#2369A1]/25 text-[10px] text-[#38BDF8] font-medium">
            <Shield className="w-3 h-3 text-[#38BDF8]" />
            <span>Calidad & Soporte Especializado</span>
          </div>
        </div>

        {/* Navegación Principal */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
            Operaciones Taller
          </p>
          <NavItem href="/" icon={<LayoutDashboard size={18} />} label="Panel de Control" active />
          <NavItem href="/tickets" icon={<Layers size={18} />} label="Órdenes de Servicio" />
        </div>

        {/* Enlace Externo Corporativo */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
          <a
            href="https://www.mur-tecno.com.pe/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-[#132238] transition-colors group"
          >
            <span>Sitio Web Oficial</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#38BDF8] transition-colors" />
          </a>
        </div>

        {/* Footer Sidebar con Información Corporativa Oficial */}
        <div className="mt-auto pt-4 border-t border-slate-800/80 space-y-3">
          <div className="text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2369A1] shrink-0 mt-0.5" />
              <span>Av. Benavides 3082, Of. 503 • Miraflores</span>
            </div>
            <div className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-[#2369A1] shrink-0" />
              <span>(+51) 944 590 999</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0F1A2C] border border-[#2369A1]/20 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-mono">SRT v2.4</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Taller En Línea
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        
        {/* Glow corporativo sutil de fondo */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#2369A1]/8 rounded-full blur-[140px] pointer-events-none" />

        {/* Header Corporativo Minimalista */}
        <header className="h-20 flex items-center justify-between px-10 border-b border-[#2369A1]/20 bg-[#0B1320]/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              Sistema de Control de Atenciones Técnicas
            </h2>
            <p className="text-xs text-slate-400">
              MUR Tecnología S.A.C. • RUC: 20603786301
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={cargarOrdenes} 
              disabled={loading}
              className="border-slate-800 bg-[#0F1A2C] hover:bg-[#192A45] text-slate-300"
              title="Recargar órdenes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#38BDF8]' : ''}`} />
            </Button>
            <TicketModal onSuccess={() => cargarOrdenes()}>
              <Button className="bg-[#2369A1] hover:bg-[#1E578A] text-white shadow-lg shadow-[#2369A1]/25 rounded-xl transition-all duration-200">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Orden de Servicio
              </Button>
            </TicketModal>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-10 space-y-8 relative z-10">
          
          {/* Tarjetas de Métricas - Estilo Minimalista y Corporativo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="1. RECEPCIÓN & INGRESO" 
              value={registrados.toString()} 
              icon={<Clock className="w-5 h-5 text-amber-400" />} 
              subtext="Pendiente revisión técnica"
              accentColor="border-amber-500/20 bg-amber-500/5"
            />
            <StatCard 
              title="2. DIAGNÓSTICO & PROPUESTA" 
              value={enDiagnostico.toString()} 
              icon={<AlertCircle className="w-5 h-5 text-[#38BDF8]" />} 
              subtext="Evaluación y aprobación cliente"
              accentColor="border-[#2369A1]/30 bg-[#2369A1]/5"
            />
            <StatCard 
              title="3. EN INTERVENCIÓN & QA" 
              value={enTaller.toString()} 
              icon={<Wrench className="w-5 h-5 text-purple-400" />} 
              subtext="Reparación física y pruebas"
              accentColor="border-purple-500/20 bg-purple-500/5"
            />
            <StatCard 
              title="4. CERRADOS & ENTREGADOS" 
              value={concluidos.toString()} 
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} 
              subtext="Concluidos con constancia"
              accentColor="border-emerald-500/20 bg-emerald-500/5"
            />
          </div>

          {/* Tabla de Actividad Principal */}
          <Card className="bg-[#0F1A2C]/80 border-[#2369A1]/20 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-[#2369A1]/15 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-100">
                    Órdenes de Atención Técnica
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-0.5">
                    Registro centralizado de equipos en laboratorio de MUR Tecnología.
                  </CardDescription>
                </div>
                
                {/* Search Bar Minimalista */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por DT, S/N de serie, RUC, cliente..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-[#090E17] border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#2369A1] transition-colors"
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 pt-3 flex-wrap">
                {[
                  { id: 'TODOS', label: 'Todas las Órdenes' },
                  { id: 'REGISTRADO', label: '1. Registrados' },
                  { id: 'DIAGNOSTICO', label: '2. En Diagnóstico' },
                  { id: 'REPARACION', label: '3. En Taller / QA' },
                  { id: 'ENTREGADO', label: '4. Concluidos' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFiltroEstado(tab.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filtroEstado === tab.id
                        ? 'bg-[#2369A1] text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#142238] bg-[#090E17] border border-slate-800/80'
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
                  <RefreshCw className="w-6 h-6 animate-spin text-[#2369A1]" />
                  <span className="text-xs">Sincronizando órdenes con Firestore...</span>
                </div>
              ) : ordenesFiltradas.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#132238] flex items-center justify-center">
                    <Laptop className="w-7 h-7 text-slate-500" />
                  </div>
                  <p className="text-xs">
                    {busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay órdenes técnicas en este estado."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#2369A1]/15">
                  {ordenesFiltradas.map(orden => (
                    <div 
                      key={orden.codigoDT} 
                      onClick={() => router.push(`/tickets/${orden.codigoDT}`)}
                      className="p-4 hover:bg-[#142238]/60 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          orden.estadoGeneral === 'ENTREGADO' ? 'bg-emerald-500' :
                          orden.estadoGeneral === 'REPARADO' ? 'bg-teal-400' :
                          orden.estadoGeneral === 'APROBADO_PARA_REPARACION' ? 'bg-[#38BDF8]' :
                          orden.estadoGeneral === 'CERRADO_SIN_REPARACION' ? 'bg-rose-500' :
                          orden.estadoGeneral === 'INOPERATIVO' ? 'bg-rose-500' :
                          orden.estadoGeneral === 'OBSERVADO' ? 'bg-amber-500' :
                          orden.estadoGeneral === 'EN_REPARACION' ? 'bg-purple-500' :
                          orden.estadoGeneral === 'DIAGNOSTICADO' ? 'bg-indigo-400' :
                          orden.estadoGeneral === 'EN_DIAGNOSTICO' ? 'bg-blue-400' :
                          'bg-amber-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-100 group-hover:text-[#38BDF8] transition-colors font-mono text-sm">
                              {orden.codigoDT}
                            </p>
                            <span className="text-xs text-slate-500">•</span>
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
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#38BDF8] group-hover:translate-x-1 transition-all" />
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
      className={`cursor-pointer flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group
        ${active 
          ? 'bg-[#2369A1] text-white shadow-sm font-semibold' 
          : 'text-slate-400 hover:bg-[#132238] hover:text-slate-200'}`}
    >
      <div className={`transition-transform duration-200 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  subtext: string
  accentColor: string
}

function StatCard({ title, value, icon, subtext, accentColor }: StatCardProps) {
  return (
    <div className={`rounded-2xl border ${accentColor} p-5 flex flex-col justify-between group hover:-translate-y-0.5 transition-all duration-200 shadow-sm`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-slate-400 font-semibold text-[10px] tracking-wider uppercase">{title}</h3>
        <div className="p-2 rounded-lg bg-[#0B1320] border border-slate-800/80 shadow-inner">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-3xl font-extrabold text-slate-100 tracking-tight mb-1">{value}</div>
        <div className="text-[11px] text-slate-400">
          {subtext}
        </div>
      </div>
    </div>
  )
}
