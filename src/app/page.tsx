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
  Users,
  Box,
  Settings,
  ChevronRight
} from "lucide-react"
import { TicketModal } from "@/components/tickets/TicketModal"
import { getRecentTickets } from "@/services/ticketService"
import { Ticket } from "@/types"

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await getRecentTickets(20)
        setTickets(data)
      } catch (err) {
        console.error("Error cargando tickets", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [])

  const pendientes = tickets.filter(t => t.estado === 'RECEPCIONADO').length
  const diagnostico = tickets.filter(t => t.estado === 'EN_DIAGNOSTICO' || t.estado === 'DIAGNOSTICADO' || t.estado === 'PENDIENTE_APROBACION').length
  const reparacion = tickets.filter(t => t.estado === 'EN_REPARACION' || t.estado === 'CONTROL_CALIDAD').length
  const entregados = tickets.filter(t => t.estado === 'ENTREGADO').length
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
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Tech Support</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" active />
          <NavItem href="/tickets" icon={<Wrench size={18} />} label="Tickets" />
          <NavItem href="/clientes" icon={<Users size={18} />} label="Clientes" />
          <NavItem href="/inventario" icon={<Box size={18} />} label="Inventario" />
        </nav>

        <div className="mt-auto">
          <NavItem href="/configuracion" icon={<Settings size={18} />} label="Configuración" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <header className="h-20 flex items-center justify-between px-10 border-b border-slate-800/50 backdrop-blur-md bg-slate-950/50 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Resumen de Operaciones</h2>
            <p className="text-sm text-slate-400">Bienvenido de nuevo, Técnico Responsable</p>
          </div>
          <div className="flex items-center gap-4">
            <TicketModal>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 rounded-xl transition-all duration-300 hover:scale-105">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Ticket
              </Button>
            </TicketModal>
            <div className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center cursor-pointer hover:border-slate-500 transition-colors">
              <span className="text-sm font-medium">TR</span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-10 space-y-8 relative z-10">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Tickets Pendientes" 
              value={pendientes.toString()} 
              icon={<Clock className="w-5 h-5 text-amber-400" />} 
              trend="Esperando revisión"
              trendUp={true}
              borderColor="border-amber-500/20"
              bgColor="bg-amber-500/5"
            />
            <StatCard 
              title="En Diagnóstico" 
              value={diagnostico.toString()} 
              icon={<AlertCircle className="w-5 h-5 text-blue-400" />} 
              trend="Evaluación técnica"
              borderColor="border-blue-500/20"
              bgColor="bg-blue-500/5"
            />
            <StatCard 
              title="En Reparación" 
              value={reparacion.toString()} 
              icon={<Wrench className="w-5 h-5 text-purple-400" />} 
              trend="En taller"
              trendUp={false}
              borderColor="border-purple-500/20"
              bgColor="bg-purple-500/5"
            />
            <StatCard 
              title="Entregados" 
              value={entregados.toString()} 
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} 
              trend="Equipos devueltos"
              trendUp={true}
              borderColor="border-emerald-500/20"
              bgColor="bg-emerald-500/5"
            />
          </div>

          {/* Recent Activity Table area */}
          <Card className="bg-slate-900/60 border-slate-800/60 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/50 pb-4">
              <CardTitle className="text-lg font-medium text-slate-200">Actividad Reciente</CardTitle>
              <CardDescription className="text-slate-400">Últimos tickets ingresados y actualizados en el sistema.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Cargando tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <LayoutDashboard className="w-8 h-8 text-slate-600" />
                  </div>
                  <p>No hay tickets registrados en el sistema. Crea uno nuevo para comenzar.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {tickets.map(ticket => (
                    <div 
                      key={ticket.id} 
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                      className="p-4 hover:bg-slate-800/30 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          ticket.estado === 'ENTREGADO' ? 'bg-emerald-500' :
                          ticket.estado === 'REPARADO' ? 'bg-teal-400' :
                          ticket.estado === 'EN_REPARACION' ? 'bg-purple-500' :
                          ticket.estado === 'CERRADO_NO_AUTORIZADO' ? 'bg-rose-500' :
                          ticket.estado === 'PENDIENTE_APROBACION' ? 'bg-amber-400' :
                          ticket.estado === 'RECEPCIONADO' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium text-slate-200">{ticket.codigoDT}</p>
                          <p className="text-sm text-slate-400">S/N: {ticket.numeroSerie} • {ticket.tipoServicio}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium px-2 py-1 rounded-md bg-slate-800 text-slate-300">
                          {ticket.estado}
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
        <h3 className="text-slate-400 font-medium text-sm">{title}</h3>
        <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/50 shadow-inner group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-4xl font-bold text-slate-100 tracking-tight mb-2">{value}</div>
        <div className={`text-xs font-medium ${trendUp === true ? 'text-emerald-400' : trendUp === false ? 'text-rose-400' : 'text-slate-500'}`}>
          {trend}
        </div>
      </div>
    </div>
  )
}
