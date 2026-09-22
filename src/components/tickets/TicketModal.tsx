"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, ShieldAlert, Wrench, ArrowRight } from "lucide-react"
import { getEquipoBySerie, getHistorialTicketsEquipo } from "@/services/equipoService"
import { createCliente, getAllClientes } from "@/services/clienteService"
import { crearTicketConDeteccionRetorno, getRecentTickets } from "@/services/ticketService"
import { createModelo, getAllModelos } from "@/services/modeloService"
import { Equipo, Ticket, TipoServicio, Cliente, ModeloEquipo } from "@/types"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"

type ModalStep = 'search' | 'return_detected' | 'form'

export function TicketModal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<ModalStep>('search')
  
  // Search State
  const [serie, setSerie] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Return Detection State
  const [equipoExistente, setEquipoExistente] = useState<Equipo | null>(null)
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null)
  const [tipoServicio, setTipoServicio] = useState<TipoServicio>('NUEVO_SERVICIO')

  // Select Data
  const [clientesDb, setClientesDb] = useState<Cliente[]>([])
  const [modelosDb, setModelosDb] = useState<ModeloEquipo[]>([])

  const [selectedClienteId, setSelectedClienteId] = useState<string>("nuevo")
  const [selectedModeloId, setSelectedModeloId] = useState<string>("nuevo")

  // Form State - Cliente
  const [clienteId, setClienteId] = useState("") // DNI/RUC
  const [razonSocial, setRazonSocial] = useState("")
  const [nombreContacto, setNombreContacto] = useState("")
  const [telefono, setTelefono] = useState("")
  const [correo, setCorreo] = useState("")

  // Form State - Equipo
  const [tipoEquipo, setTipoEquipo] = useState("")
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [partNumber, setPartNumber] = useState("")

  // Form State - Ticket
  const [fallaReportada, setFallaReportada] = useState("")
  const [danoFisico, setDanoFisico] = useState("")
  const [responsable, setResponsable] = useState("Técnico Asignado")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([getAllClientes(), getAllModelos()])
        .then(([cData, mData]) => {
          setClientesDb(cData)
          setModelosDb(mData)
        })
        .catch(err => console.error("Error cargando catálogos", err))
    }
  }, [open])
  
  const resetState = () => {
    setStep('search')
    setSerie("")
    setEquipoExistente(null)
    setLastTicket(null)
    setTipoServicio('NUEVO_SERVICIO')
    
    setSelectedClienteId("nuevo")
    setClienteId("")
    setRazonSocial("")
    setNombreContacto("")
    setTelefono("")
    setCorreo("")
    
    setSelectedModeloId("nuevo")
    setTipoEquipo("")
    setMarca("")
    setModelo("")
    setPartNumber("")

    setFallaReportada("")
    setDanoFisico("")
    setResponsable("Técnico Asignado")
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTimeout(resetState, 200) // Reset after animation
    }
  }

  const handleClienteChange = (val: string) => {
    setSelectedClienteId(val)
    if (val !== "nuevo") {
      const c = clientesDb.find(x => x.id === val)
      if (c) {
        setClienteId(c.clienteId)
        setRazonSocial(c.razonSocial)
        setNombreContacto(c.nombreContacto || "")
        setTelefono(c.telefono || "")
        setCorreo(c.correo || "")
      }
    } else {
      setClienteId("")
      setRazonSocial("")
      setNombreContacto("")
      setTelefono("")
      setCorreo("")
    }
  }

  const handleModeloChange = (val: string) => {
    setSelectedModeloId(val)
    if (val !== "nuevo") {
      const m = modelosDb.find(x => x.id === val)
      if (m) {
        setTipoEquipo(m.tipo)
        setMarca(m.marca)
        setModelo(m.nombre)
      }
    } else {
      setTipoEquipo("")
      setMarca("")
      setModelo("")
    }
  }

  const checkSerialNumber = async () => {
    if (!serie.trim()) {
      toast.error("Ingrese un número de serie válido.")
      return
    }

    setLoading(true)
    
    try {
      const equipo = await getEquipoBySerie(serie.trim())
      
      if (!equipo) {
        // No existe el equipo, es primer ingreso
        setEquipoExistente(null)
        setTipoServicio('NUEVO_SERVICIO')
        setStep('form')
      } else {
        // Existe, busquemos su historial
        setEquipoExistente(equipo)
        setTipoEquipo(equipo.tipo)
        setMarca(equipo.marca)
        setModelo(equipo.modelo)
        setPartNumber(equipo.partNumber || "")
        
        // Autoseleccionar el cliente si existe en la base de datos local
        const clienteVinculado = clientesDb.find(c => c.clienteId === equipo.clienteId)
        if (clienteVinculado) {
          handleClienteChange(clienteVinculado.id!)
        } else {
          setClienteId(equipo.clienteId)
        }
        
        const historial = await getHistorialTicketsEquipo(equipo.numeroSerie)
        
        if (historial.length > 0) {
          const ultimo = historial[0]
          
          if (ultimo.estado === 'ENTREGADO') {
            setLastTicket(ultimo)
            setStep('return_detected')
          } else {
            toast.error(`Este equipo ya se encuentra en el taller bajo el ticket ${ultimo.codigoDT} (${ultimo.estado}).`)
          }
        } else {
          setTipoServicio('NUEVO_SERVICIO')
          setStep('form')
        }
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Error al consultar la base de datos.")
    } finally {
      setLoading(false)
    }
  }

  const generateCodigoDT = async () => {
    try {
      const tickets = await getRecentTickets(100)
      const newNum = tickets.length + 1
      return `DT-${newNum.toString().padStart(6, '0')}`
    } catch {
      return `DT-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
    }
  }

  const handleSubmitTicket = async () => {
    if (!serie || !clienteId || !fallaReportada || !tipoEquipo || !marca || !modelo) {
      toast.error("Complete los campos obligatorios del Cliente, Equipo y Falla")
      return
    }

    setGuardando(true)
    try {
      // 1. Guardar o actualizar cliente si es nuevo
      if (selectedClienteId === "nuevo") {
        await createCliente({
          clienteId: clienteId,
          razonSocial: razonSocial || 'Cliente no registrado',
          nombreContacto,
          telefono,
          correo,
          createdAt: new Date()
        })
      }

      // 2. Guardar equipo y nuevo modelo si es un S/N nuevo
      if (!equipoExistente) {
        if (selectedModeloId === "nuevo") {
          await createModelo({
            nombre: modelo,
            marca,
            tipo: tipoEquipo
          })
        }

        const equiposRef = collection(db, 'equipos')
        await addDoc(equiposRef, {
          numeroSerie: serie,
          tipo: tipoEquipo,
          marca,
          modelo,
          partNumber,
          clienteId: clienteId,
          historialTickets: []
        })
      }

      // 3. Crear el ticket
      const codigo = await generateCodigoDT()
      const nuevoTicketBase = {
        codigoDT: codigo,
        numeroSerie: serie,
        clienteId: clienteId,
        responsable,
        ingreso: {
          fecha: new Date(),
          fallaReportada,
          danoFisico,
          accesorios: []
        },
        createdAt: new Date()
      }

      const forzarGarantia = tipoServicio === 'GARANTIA'
      const idGenerado = await crearTicketConDeteccionRetorno(nuevoTicketBase, forzarGarantia)
      
      toast.success(`Ticket ${codigo} generado exitosamente`)
      setOpen(false)
      
      router.push(`/tickets/${idGenerado}`)
      
    } catch (err) {
      console.error(err)
      toast.error("Error al generar el ticket")
    } finally {
      setGuardando(false)
    }
  }

  const selectServiceType = (type: TipoServicio) => {
    setTipoServicio(type)
    setStep('form')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-slate-950 border-slate-800 text-slate-100 overflow-hidden">
        
        {step === 'search' && (
          <div className="flex flex-col h-full">
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
                onChange={(e) => setSerie(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && checkSerialNumber()}
              />
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
          </div>
        )}

        {step === 'return_detected' && (
          <div className="flex flex-col h-full">
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
                onClick={() => selectServiceType('GARANTIA')}
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
                onClick={() => selectServiceType('NUEVO_SERVICIO')}
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
          </div>
        )}

        {step === 'form' && (
          <div className="flex flex-col h-full max-h-full overflow-hidden">
            <DialogHeader className="shrink-0 pb-4">
              <DialogTitle className="text-xl">
                Registro de Ticket: {tipoServicio === 'GARANTIA' ? 'Garantía Técnica' : 'Nuevo Servicio'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {tipoServicio === 'GARANTIA' 
                  ? `Vinculado al ticket origen ${lastTicket?.codigoDT}.`
                  : "Complete todos los datos solicitados para registrar el equipo en el taller."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-6">
              
              {/* Sección Datos del Cliente */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-semibold text-blue-400">1. Datos del Cliente</h3>
                  <div className="w-64">
                    <Select value={selectedClienteId} onValueChange={handleClienteChange}>
                      <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-slate-100">
                        <SelectValue placeholder="Seleccionar Cliente..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-slate-100 max-h-64">
                        <SelectItem value="nuevo" className="text-blue-400 font-medium">+ Añadir Nuevo Cliente</SelectItem>
                        {clientesDb.map(c => (
                          <SelectItem key={c.id} value={c.id!}>{c.razonSocial}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente" className="text-slate-300">Doc. Identidad (ID/RUC)*</Label>
                    <Input id="cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} disabled={selectedClienteId !== "nuevo"} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="razon" className="text-slate-300">Razón Social o Nombre*</Label>
                    <Input id="razon" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} disabled={selectedClienteId !== "nuevo"} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contacto" className="text-slate-300">Nombre Contacto</Label>
                    <Input id="contacto" value={nombreContacto} onChange={(e) => setNombreContacto(e.target.value)} disabled={selectedClienteId !== "nuevo"} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-slate-300">Teléfono</Label>
                    <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={selectedClienteId !== "nuevo"} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="correo" className="text-slate-300">Correo Electrónico</Label>
                    <Input id="correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} disabled={selectedClienteId !== "nuevo"} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                </div>
              </div>

              {/* Sección Datos del Equipo */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-semibold text-blue-400">2. Datos del Equipo</h3>
                  {!equipoExistente && (
                    <div className="w-64">
                      <Select value={selectedModeloId} onValueChange={handleModeloChange}>
                        <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-slate-100">
                          <SelectValue placeholder="Catálogo de Modelos..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-100 max-h-64">
                          <SelectItem value="nuevo" className="text-blue-400 font-medium">+ Añadir Nuevo Modelo</SelectItem>
                          {modelosDb.map(m => (
                            <SelectItem key={m.id} value={m.id!}>{m.nombre} ({m.marca})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="snumber" className="text-slate-300">N.º Serie*</Label>
                    <Input id="snumber" value={serie} disabled className="bg-slate-900 border-slate-700 text-slate-400 opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelo" className="text-slate-300">Modelo*</Label>
                    <Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} disabled={!!equipoExistente || selectedModeloId !== "nuevo"} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marca" className="text-slate-300">Marca*</Label>
                    <Input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} disabled={!!equipoExistente || selectedModeloId !== "nuevo"} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipoEquipo" className="text-slate-300">Tipo de Equipo*</Label>
                    <Input id="tipoEquipo" placeholder="Ej. Laptop, Servidor" value={tipoEquipo} onChange={(e) => setTipoEquipo(e.target.value)} disabled={!!equipoExistente || selectedModeloId !== "nuevo"} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="partNumber" className="text-slate-300">Part Number</Label>
                    <Input id="partNumber" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} disabled={!!equipoExistente} className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-50" />
                  </div>
                </div>
              </div>

              {/* Sección Datos del Servicio */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-400 border-b border-slate-800 pb-2">3. Datos del Servicio</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsable" className="text-slate-300">Técnico Responsable*</Label>
                    <Input id="responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)} className="bg-slate-900 border-slate-700 text-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="falla" className="text-slate-300">Falla Reportada*</Label>
                    <textarea 
                      id="falla" 
                      value={fallaReportada}
                      onChange={(e) => setFallaReportada(e.target.value)}
                      className="w-full flex min-h-[80px] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" 
                      placeholder="Describe el problema reportado por el cliente..."
                    ></textarea>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dano" className="text-slate-300">Observaciones / Daño Físico</Label>
                    <textarea 
                      id="dano" 
                      value={danoFisico}
                      onChange={(e) => setDanoFisico(e.target.value)}
                      className="w-full flex min-h-[60px] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" 
                      placeholder="Rayones, golpes, abolladuras, accesorios recibidos..."
                    ></textarea>
                  </div>
                </div>
              </div>

            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-slate-800">
              <Button variant="ghost" onClick={resetState} disabled={guardando} className="text-slate-400">Atrás</Button>
              <Button 
                disabled={guardando}
                className="bg-emerald-600 hover:bg-emerald-500 text-white" 
                onClick={handleSubmitTicket}
              >
                {guardando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Registrar Ticket
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
