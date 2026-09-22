"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getRecentTickets } from "@/services/ticketService"
import { Ticket } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LayoutDashboard, Search } from "lucide-react"

export default function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await getRecentTickets(50)
        setTickets(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => router.push('/')} className="border-slate-800 bg-slate-900 hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-100">Directorio de Tickets</h1>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <LayoutDashboard className="w-8 h-8 text-slate-600" />
            </div>
            <p>No hay tickets registrados en el sistema.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {tickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => router.push(`/tickets/${ticket.id}`)}
                className="p-4 hover:bg-slate-800/30 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-200">{ticket.codigoDT}</p>
                  <p className="text-sm text-slate-400">S/N: {ticket.numeroSerie}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">{ticket.tipoServicio}</span>
                  <span className="text-sm font-medium px-2 py-1 rounded-md bg-slate-800 text-slate-300">
                    {ticket.estado}
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
