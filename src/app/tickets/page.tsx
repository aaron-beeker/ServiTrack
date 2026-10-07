"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"
import { TicketModal } from "@/components/tickets/TicketModal"
import { OrdersTable } from "@/components/tickets/OrdersTable"
import { MurLogo } from "@/components/brand/MurLogo"
import { UserMenu } from "@/components/auth/UserMenu"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"

export default function TicketsList() {
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
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <MurLogo size="sm" showSubtitle={false} />
            <nav className="hidden md:flex items-center gap-1 border-l border-slate-200 pl-6">
              <button 
                onClick={() => router.push('/')} 
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Panel de Control
              </button>
              <button 
                onClick={() => router.push('/tickets')} 
                className="px-3 py-1.5 text-xs font-semibold text-[#2369A1] bg-[#2369A1]/8 rounded-md"
              >
                Órdenes de Servicio
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
            <TicketModal>
              <Button className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors">
                <Plus className="w-4 h-4 mr-1.5" />
                Nueva Orden
              </Button>
            </TicketModal>
            <div className="border-l border-slate-200 pl-3">
              <UserMenu />
            </div>
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
            Registro cronológico y trazabilidad completa de equipos en laboratorio • Componente OrdersTable
          </p>
        </div>

        {/* Componente OrdersTable con 7 columnas y reactividad en tiempo real */}
        <OrdersTable />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MUR Tecnología S.A.C. • Av. Alfredo Benavides 3082, Of. 503, Miraflores</p>
          <p className="text-[11px]">Sistema de Control Técnico • SRT</p>
        </div>
      </footer>

    </div>
  )
}
