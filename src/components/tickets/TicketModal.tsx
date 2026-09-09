"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowRight, Loader2, Search, ShieldAlert, Wrench } from "lucide-react"
import { getEquipoBySerie, getHistorialTicketsEquipo } from "@/services/equipoService"
import { Ticket } from "@/types"

export function TicketModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'search' | 'return_detected' | 'form'>('search')
  
  // State
  const [serie, setSerie] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Data
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null)
  const [tipoServicio, setTipoServicio] = useState<'Primer Ingreso' | 'Garantía Técnica' | 'Nueva Incidencia'>('Primer Ingreso')
  
  const resetState = () => {
    setStep('search')
    setSerie("")
    setError("")
    setLastTicket(null)
    setTipoServicio('Primer Ingreso')
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTimeout(resetState, 300) // Reset after animation
    }
  }

  const checkSerialNumber = async () => {
    if (!serie.trim()) {
      setError("Ingrese un número de serie válido.")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      const equipo = await getEquipoBySerie(serie.trim())
      
      if (!equipo) {
        // No existe el equipo, es primer ingreso
        setTipoServicio('Primer Ingreso')
        setStep('form')
      } else {
        // Existe, busquemos su historial
        const historial = await getHistorialTicketsEquipo(equipo.numeroSerie)
        
        if (historial.length > 0) {
          const ultimo = historial[0]
          
          if (ultimo.estado === 'Entregado') {
            // Inteligencia de retornos!
            setLastTicket(ultimo)
            setStep('return_detected')
          } else {
            // Ya tiene un ticket en proceso activo
            setError(`Este equipo ya se encuentra en el taller bajo el ticket ${ultimo.codigoDT} (${ultimo.estado}).`)
          }
        } else {
          // Equipo registrado pero sin tickets? Caso raro, procedemos normal
          setTipoServicio('Nueva Incidencia')
          setStep('form')
        }
      }
    } catch (err: any) {
      console.error(err)
      setError("Error al consultar la base de datos. Verifica tu conexión a Firebase.")
    } finally {
      setLoading(false)
    }
  }

  const selectServiceType = (type: 'Garantía Técnica' | 'Nueva Incidencia') => {
    setTipoServicio(type)
    setStep('form')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-slate-100">
        
        {step === 'search' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-400" />
                Buscar Equipo
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Ingrese el número de serie del equipo para verificar su historial y aplicar la política de garantías.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="serie" className="text-slate-300">Número de Serie (S/N)</Label>
              <Input
                id="serie"
                placeholder="Ej. SN-998231"
                className="mt-2 bg-slate-900 border-slate-700 text-slate-100 focus-visible:ring-blue-500"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkSerialNumber()}
              />
              {error && (
                <div className="mt-3 text-rose-400 text-sm flex items-start gap-2 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)} className="text-slate-400 hover:text-slate-200">
                Cancelar
              </Button>
              <Button 
                onClick={checkSerialNumber} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verificar Equipo
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'return_detected' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                Retorno Detectado
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Este equipo ya fue atendido previamente bajo el ticket <strong className="text-slate-200">{lastTicket?.codigoDT}</strong>. ¿Cuál es el motivo de este nuevo ingreso?
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 flex flex-col gap-4">
              <button 
                onClick={() => selectServiceType('Garantía Técnica')}
                className="flex items-start gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors text-left group"
              >
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-400 mb-1">Reclamo por Garantía</h4>
                  <p className="text-sm text-slate-400">Es la misma falla o una derivada de la reparación anterior ({lastTicket?.codigoDT}).</p>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-500/50 group-hover:text-amber-400 group-hover:translate-x-1 transition-all self-center" />
              </button>

              <button 
                onClick={() => selectServiceType('Nueva Incidencia')}
                className="flex items-start gap-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors text-left group"
              >
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-400 mb-1">Nueva Incidencia</h4>
                  <p className="text-sm text-slate-400">Es una falla totalmente ajena al servicio técnico anterior. Generar ticket independiente.</p>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-500/50 group-hover:text-blue-400 group-hover:translate-x-1 transition-all self-center" />
              </button>
            </div>
            
            <DialogFooter>
              <Button variant="ghost" onClick={resetState} className="text-slate-400">
                Volver
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                Crear Ticket: {tipoServicio}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {tipoServicio === 'Garantía Técnica' 
                  ? `Vinculado al ticket origen ${lastTicket?.codigoDT}. Los datos del cliente se rellenarán automáticamente.`
                  : "Complete los datos para ingresar el equipo al taller."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-8 text-center text-slate-500">
              <p>Aquí se renderizará el formulario completo usando React Hook Form.</p>
              <p className="text-sm mt-2">S/N Detectado: <span className="font-bold text-slate-300">{serie}</span></p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={resetState} className="text-slate-400">Atrás</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">Generar Ingreso</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
