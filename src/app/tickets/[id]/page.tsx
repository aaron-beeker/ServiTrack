"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getTicketById, transicionarTicket, updateTicket } from "@/services/ticketService"
import { getClienteById } from "@/services/clienteService"
import { getEquipoBySerie } from "@/services/equipoService"
import { Ticket, Cliente, Equipo, EstadoTicket } from "@/types"
import { generarInformeDT } from "@/lib/pdf/InformeDT"
import { generarConstanciaAtencion } from "@/lib/pdf/Constancia"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ArrowLeft, CheckCircle, FileText, Loader2, PenTool, PlayCircle } from "lucide-react"
import { toast } from "sonner"

export default function TicketPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [equipo, setEquipo] = useState<Equipo | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [diagnosticoModal, setDiagnosticoModal] = useState(false)
  const [reparacionModal, setReparacionModal] = useState(false)

  // Estados de formularios
  const [fallaReal, setFallaReal] = useState("")
  const [accionRecomendada, setAccionRecomendada] = useState("")
  const [actividadRealizada, setActividadRealizada] = useState("")
  const [observacionesFinales, setObservacionesFinales] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const t = await getTicketById(id)
        if (t) {
          setTicket(t)
          const [c, e] = await Promise.all([
            getClienteById(t.clienteId),
            getEquipoBySerie(t.numeroSerie)
          ])
          setCliente(c)
          setEquipo(e)
        }
      } catch (err) {
        toast.error("Error al cargar el ticket")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-100"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
  }

  if (!ticket || !cliente || !equipo) {
    return <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-100">Ticket no encontrado.</div>
  }

  const changeStatus = async (newStatus: EstadoTicket, extraData?: Partial<Ticket>) => {
    setUpdating(true)
    try {
      await transicionarTicket(ticket.id!, newStatus, extraData)
      setTicket({ ...ticket, estado: newStatus, ...extraData })
      toast.success(`Estado actualizado a ${newStatus}`)
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar el estado")
    } finally {
      setUpdating(false)
    }
  }

  const handleFinalizarDiagnostico = () => {
    if (!fallaReal || !accionRecomendada) {
      toast.error("Por favor completa los campos requeridos")
      return
    }
    changeStatus('DIAGNOSTICADO', {
      diagnostico: {
        fecha: new Date(),
        diagnosticoTecnico: 'Completado',
        fallaReal,
        accionRecomendada,
        repuestos: []
      }
    })
    setDiagnosticoModal(false)
  }

  const handleFinalizarReparacion = () => {
    if (!actividadRealizada) {
      toast.error("Por favor completa la actividad realizada")
      return
    }
    changeStatus('REPARADO', {
      reparacion: {
        fechaInicio: new Date(),
        actividadRealizada,
        repuestosInstalados: [],
        observacionesFinales,
        fechaSalida: null,
        lugarEntrega: "Taller Principal"
      }
    })
    setReparacionModal(false)
  }

  const handleEntregar = () => {
    changeStatus('ENTREGADO', {
      reparacion: {
        ...ticket.reparacion!,
        fechaSalida: new Date()
      }
    })
  }

  const downloadInforme = () => {
    generarInformeDT(ticket, cliente, equipo)
  }

  const downloadConstancia = () => {
    generarConstanciaAtencion(ticket, cliente, equipo)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/')} className="border-slate-800 bg-slate-900 hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              Ticket {ticket.codigoDT}
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400">
                {ticket.estado}
              </Badge>
            </h1>
            <p className="text-slate-400 text-sm">{ticket.tipoServicio}</p>
          </div>
        </div>
        
        {/* Acciones de Estado */}
        <div className="flex items-center gap-3">
          {ticket.estado === 'RECEPCIONADO' && (
            <Button onClick={() => changeStatus('EN_DIAGNOSTICO')} disabled={updating} className="bg-amber-600 hover:bg-amber-500">
              <PlayCircle className="w-4 h-4 mr-2" /> Iniciar Diagnóstico
            </Button>
          )}
          
          {ticket.estado === 'EN_DIAGNOSTICO' && (
            <Button onClick={() => setDiagnosticoModal(true)} disabled={updating} className="bg-blue-600 hover:bg-blue-500">
              <CheckCircle className="w-4 h-4 mr-2" /> Finalizar Diagnóstico
            </Button>
          )}
          
          {ticket.estado === 'DIAGNOSTICADO' && (
            <Button onClick={() => changeStatus('PENDIENTE_APROBACION')} disabled={updating} className="bg-purple-600 hover:bg-purple-500">
              <CheckCircle className="w-4 h-4 mr-2" /> Solicitar Aprobación
            </Button>
          )}

          {ticket.estado === 'PENDIENTE_APROBACION' && (
            <>
              <Button onClick={() => changeStatus('CERRADO_NO_AUTORIZADO')} disabled={updating} className="bg-rose-600 hover:bg-rose-500">
                Cliente Rechaza
              </Button>
              <Button onClick={() => changeStatus('EN_REPARACION')} disabled={updating} className="bg-emerald-600 hover:bg-emerald-500">
                Cliente Aprueba
              </Button>
            </>
          )}

          {ticket.estado === 'EN_REPARACION' && (
            <Button onClick={() => setReparacionModal(true)} disabled={updating} className="bg-emerald-600 hover:bg-emerald-500">
              <CheckCircle className="w-4 h-4 mr-2" /> Pasar a QA
            </Button>
          )}

          {ticket.estado === 'CONTROL_CALIDAD' && (
            <Button onClick={() => changeStatus('REPARADO')} disabled={updating} className="bg-teal-600 hover:bg-teal-500">
              <CheckCircle className="w-4 h-4 mr-2" /> Aprobar QA
            </Button>
          )}

          {ticket.estado === 'REPARADO' && (
            <Button onClick={handleEntregar} disabled={updating} className="bg-blue-600 hover:bg-blue-500">
              <CheckCircle className="w-4 h-4 mr-2" /> Entregar Equipo
            </Button>
          )}

          {/* Docs */}
          {['DIAGNOSTICADO', 'PENDIENTE_APROBACION', 'EN_REPARACION', 'CONTROL_CALIDAD', 'REPARADO', 'ENTREGADO'].includes(ticket.estado) && (
            <Button variant="outline" onClick={downloadInforme} className="border-slate-700 bg-slate-800">
              <FileText className="w-4 h-4 mr-2" /> Informe DT
            </Button>
          )}
          {(ticket.estado === 'ENTREGADO' || ticket.estado === 'REPARADO') && (
            <Button variant="outline" onClick={downloadConstancia} className="border-slate-700 bg-slate-800">
              <FileText className="w-4 h-4 mr-2" /> Constancia
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Columna Izquierda (Info Cliente y Equipo) */}
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p><strong className="text-slate-100">Razón Social:</strong> {cliente.razonSocial}</p>
              <p><strong className="text-slate-100">Contacto:</strong> {cliente.nombreContacto}</p>
              <p><strong className="text-slate-100">Teléfono:</strong> {cliente.telefono || 'No registrado'}</p>
              <p><strong className="text-slate-100">Correo:</strong> {cliente.correo || 'No registrado'}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>Equipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p><strong className="text-slate-100">S/N:</strong> {equipo.numeroSerie}</p>
              <p><strong className="text-slate-100">Marca/Modelo:</strong> {equipo.marca} {equipo.modelo}</p>
              <p><strong className="text-slate-100">Tipo:</strong> {equipo.tipo}</p>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha (Tabs de Detalles) */}
        <div className="md:col-span-2">
          <Tabs defaultValue="ingreso" className="w-full">
            <TabsList className="bg-slate-900 border border-slate-800 w-full justify-start rounded-xl p-1">
              <TabsTrigger value="ingreso" className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">1. Ingreso</TabsTrigger>
              <TabsTrigger value="diagnostico" className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">2. Diagnóstico</TabsTrigger>
              <TabsTrigger value="reparacion" className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">3. Reparación y Entrega</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ingreso" className="mt-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Detalles del Ingreso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 mb-1">Falla Reportada</h4>
                    <p className="text-slate-200 bg-slate-950 p-4 rounded-lg border border-slate-800">{ticket.ingreso?.fallaReportada || 'No registrada'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 mb-1">Observaciones Físicas</h4>
                    <p className="text-slate-200 bg-slate-950 p-4 rounded-lg border border-slate-800">{ticket.ingreso?.danoFisico || 'Ninguna'}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagnostico" className="mt-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Diagnóstico Técnico</CardTitle>
                  <CardDescription>Datos rellenados durante la fase de diagnóstico.</CardDescription>
                </CardHeader>
                <CardContent>
                  {ticket.diagnostico ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-400 mb-1">Falla Real</h4>
                        <p className="text-slate-200 bg-slate-950 p-4 rounded-lg border border-slate-800">{ticket.diagnostico.fallaReal}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-400 mb-1">Acción Recomendada</h4>
                        <p className="text-slate-200 bg-slate-950 p-4 rounded-lg border border-slate-800">{ticket.diagnostico.accionRecomendada}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 text-slate-500">
                      El diagnóstico aún no se ha completado.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reparacion" className="mt-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Actividades de Reparación</CardTitle>
                </CardHeader>
                <CardContent>
                  {ticket.reparacion ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-400 mb-1">Actividad Realizada</h4>
                        <p className="text-slate-200 bg-slate-950 p-4 rounded-lg border border-slate-800">{ticket.reparacion.actividadRealizada}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 text-slate-500">
                      La fase de reparación no ha iniciado.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Modal Diagnóstico */}
      <Dialog open={diagnosticoModal} onOpenChange={setDiagnosticoModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Finalizar Diagnóstico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Falla Real Encontrada</label>
              <textarea 
                value={fallaReal} onChange={e => setFallaReal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm" rows={3} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Acción Recomendada</label>
              <textarea 
                value={accionRecomendada} onChange={e => setAccionRecomendada(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm" rows={2} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiagnosticoModal(false)}>Cancelar</Button>
            <Button onClick={handleFinalizarDiagnostico} className="bg-blue-600 hover:bg-blue-500">Guardar Diagnóstico</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reparación */}
      <Dialog open={reparacionModal} onOpenChange={setReparacionModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Finalizar Reparación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Actividad Realizada</label>
              <textarea 
                value={actividadRealizada} onChange={e => setActividadRealizada(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm" rows={3} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Observaciones Finales</label>
              <textarea 
                value={observacionesFinales} onChange={e => setObservacionesFinales(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm" rows={2} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReparacionModal(false)}>Cancelar</Button>
            <Button onClick={handleFinalizarReparacion} className="bg-emerald-600 hover:bg-emerald-500">Completar Reparación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
