"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  getOrdenServicioByCodigo, 
  guardarDiagnosticoTecnico, 
  registrarDecisionCliente,
  iniciarIntervencion, 
  cerrarIntervencionTecnica, 
  registrarEntregaYFinalizar 
} from "@/services/ordenServicioService"
import { getRepuestosCatalogo } from "@/services/repuestoService"
import { getUsuariosSistema } from "@/services/usuarioService"
import { 
  OrdenServicio, 
  EstadoGeneral, 
  TipoFalla, 
  RepuestoItem, 
  RepuestoCatalogo, 
  UsuarioSistema 
} from "@/types"
import { generarInformeDiagnostico } from "@/lib/pdf/InformeDT"
import { generarInformeTecnico } from "@/lib/pdf/Constancia"
import { MurLogo } from "@/components/brand/MurLogo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  CheckCircle, 
  FileText, 
  Loader2, 
  Wrench, 
  AlertTriangle, 
  ShieldCheck, 
  Laptop, 
  Building2, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  PenTool, 
  Download, 
  RotateCcw,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Lock
} from "lucide-react"
import { toast } from "sonner"

export default function DetalleOrdenPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = params.id as string

  const [orden, setOrden] = useState<OrdenServicio | null>(null)
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)

  // Catálogos auxiliares
  const [catalogoRepuestos, setCatalogoRepuestos] = useState<RepuestoCatalogo[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])

  // Modales de Etapas
  const [modalDiagnostico, setModalDiagnostico] = useState(false)
  const [modalDecisionAprobacion, setModalDecisionAprobacion] = useState(false)
  const [modalDecisionRechazo, setModalDecisionRechazo] = useState(false)
  const [modalAsignarIntervencion, setModalAsignarIntervencion] = useState(false)
  const [modalCierreIntervencion, setModalCierreIntervencion] = useState(false)
  const [modalEntrega, setModalEntrega] = useState(false)

  // Estado Formulario ETAPA 2: Diagnóstico
  const [tecnicoDiag, setTecnicoDiag] = useState("")
  const [tipoFalla, setTipoFalla] = useState<TipoFalla>("HARDWARE")
  const [danosFisicos, setDanosFisicos] = useState("")
  const [diagDetallado, setDiagDetallado] = useState("")
  const [requiereRepuestos, setRequiereRepuestos] = useState<boolean>(false)
  const [solucionPropuesta, setSolucionPropuesta] = useState("")
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoItem[]>([])
  const [repuestoActualId, setRepuestoActualId] = useState("")
  const [cantidadRepuesto, setCantidadRepuesto] = useState(1)

  // Estado Decisión Cliente (Aprobación / Rechazo)
  const [motivoRechazo, setMotivoRechazo] = useState("Presupuesto comercial excede límite asignado.")
  const [operadorAprobacion, setOperadorAprobacion] = useState("")

  // Estado Formulario ETAPA 3: Intervención & QA
  const [tecnicoAsignado, setTecnicoAsignado] = useState("")
  const [actividades, setActividades] = useState("")
  const [horasHombre, setHorasHombre] = useState(2)
  const [superoQA, setSuperoQA] = useState<boolean>(true)
  const [tipoNoAprobado, setTipoNoAprobado] = useState<'OBSERVADO' | 'INOPERATIVO'>('OBSERVADO')
  const [observacionesQA, setObservacionesQA] = useState("")
  const [firmaCanvasData, setFirmaCanvasData] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Estado Formulario ETAPA 4: Entrega y Cierre
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().split('T')[0])
  const [lugarEntrega, setLugarEntrega] = useState("Taller MUR Tecnología")
  const [receptorNombre, setReceptorNombre] = useState("")
  const [receptorDni, setReceptorDni] = useState("")
  const [observacionesFinales, setObservacionesFinales] = useState("")

  const cargarDatos = async () => {
    try {
      const ord = await getOrdenServicioByCodigo(codigo)
      if (ord) {
        setOrden(ord)
        setReceptorNombre(ord.ingreso.cliente.contacto || "")
        setReceptorDni(ord.ingreso.cliente.ruc || "")
        if (ord.diagnostico.tecnicoDiagnostico) setTecnicoDiag(ord.diagnostico.tecnicoDiagnostico)
        if (ord.diagnostico.tipoFalla) setTipoFalla(ord.diagnostico.tipoFalla)
        if (ord.diagnostico.danosFisicos) setDanosFisicos(ord.diagnostico.danosFisicos)
        if (ord.diagnostico.diagnosticoDetallado) setDiagDetallado(ord.diagnostico.diagnosticoDetallado)
        if (ord.diagnostico.requiereRepuestos !== undefined) setRequiereRepuestos(ord.diagnostico.requiereRepuestos)
        if (ord.diagnostico.solucionPropuesta) setSolucionPropuesta(ord.diagnostico.solucionPropuesta)
        if (ord.diagnostico.repuestosRequeridos) setRepuestosSeleccionados(ord.diagnostico.repuestosRequeridos)
        if (ord.intervencion.tecnicoAsignado) setTecnicoAsignado(ord.intervencion.tecnicoAsignado)
        if (ord.intervencion.actividadesRealizadas) setActividades(ord.intervencion.actividadesRealizadas)
        if (ord.intervencion.horasHombre) setHorasHombre(ord.intervencion.horasHombre)
      }
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar la orden de servicio.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
    getRepuestosCatalogo().then(r => {
      setCatalogoRepuestos(r)
      if (r.length > 0) setRepuestoActualId(r[0].id)
    })
    getUsuariosSistema().then(u => {
      setUsuarios(u)
      if (u.length > 0) {
        setTecnicoDiag(u[0].nombreCompleto)
        setTecnicoAsignado(u[1] ? u[1].nombreCompleto : u[0].nombreCompleto)
        setOperadorAprobacion(u[0].correo)
      }
    })
  }, [codigo])

  // Canvas para firma digital técnica
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#2369A1'
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setFirmaCanvasData(canvasRef.current.toDataURL())
    }
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setFirmaCanvasData(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-800 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#2369A1]" />
        <span className="text-xs text-slate-500">Cargando orden técnica...</span>
      </div>
    )
  }

  if (!orden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-800 gap-3">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
        <p className="text-sm font-semibold text-slate-900">No se encontró la orden técnica {codigo}.</p>
        <Button onClick={() => router.push('/')} variant="outline" className="border-slate-300 text-xs">
          Volver al Panel
        </Button>
      </div>
    )
  }

  // ETAPA 2: Handlers de Diagnóstico
  const handleAgregarRepuesto = () => {
    if (!repuestoActualId) return
    const rep = catalogoRepuestos.find(r => r.id === repuestoActualId)
    if (!rep) return

    if (repuestosSeleccionados.some(r => r.partNumber === rep.id)) {
      toast.warning("Esta pieza ya está en la lista de requeridos.")
      return
    }

    setRepuestosSeleccionados(prev => [
      ...prev,
      {
        partNumber: rep.id,
        descripcion: rep.descripcion,
        cantidad: cantidadRepuesto
      }
    ])
    toast.success(`Repuesto [${rep.id}] añadido a la evaluación.`)
  }

  const handleEliminarRepuesto = (partNumber: string) => {
    setRepuestosSeleccionados(prev => prev.filter(r => r.partNumber !== partNumber))
  }

  const handleGuardarDiagnostico = async () => {
    if (!diagDetallado.trim()) {
      toast.error("Por favor complete el diagnóstico técnico detallado y causa raíz.")
      return
    }

    if (requiereRepuestos && repuestosSeleccionados.length === 0) {
      toast.error("Ha marcado que requiere repuestos. Debe seleccionar al menos una pieza del catálogo homologado.")
      return
    }

    if (!requiereRepuestos && !solucionPropuesta.trim()) {
      toast.error("Especifique el requerimiento de servicio o mantenimiento a realizar.")
      return
    }

    setActualizando(true)
    try {
      await guardarDiagnosticoTecnico(orden.codigoDT, {
        tecnicoDiagnostico: tecnicoDiag,
        tipoFalla,
        danosFisicos: danosFisicos || 'Sin daños físicos reportados',
        diagnosticoDetallado: diagDetallado,
        requiereRepuestos,
        solucionPropuesta: requiereRepuestos ? null : solucionPropuesta,
        repuestosRequeridos: requiereRepuestos ? repuestosSeleccionados : []
      })

      const ordenActualizada: OrdenServicio = {
        ...orden,
        estadoGeneral: 'DIAGNOSTICADO',
        diagnostico: {
          fechaDiagnostico: new Date().toISOString(),
          tecnicoDiagnostico: tecnicoDiag,
          tipoFalla,
          danosFisicos: danosFisicos || 'Sin daños físicos reportados',
          diagnosticoDetallado: diagDetallado,
          requiereRepuestos,
          solucionPropuesta: requiereRepuestos ? null : solucionPropuesta,
          repuestosRequeridos: requiereRepuestos ? repuestosSeleccionados : []
        }
      }

      toast.success("Diagnóstico técnico guardado. Estado: DIAGNOSTICADO.")
      setModalDiagnostico(false)
      
      // Emitir y descargar automáticamente el INFORME DE DIAGNÓSTICO
      generarInformeDiagnostico(ordenActualizada)
      toast.info("Informe de Diagnóstico generado en PDF para presentar al cliente.")

      await cargarDatos()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error al registrar el diagnóstico.")
    } finally {
      setActualizando(false)
    }
  }

  // ETAPA 2: Decisión de Cliente (Aprobación / Rechazo)
  const handleAprobarPropuesta = async () => {
    setActualizando(true)
    try {
      await registrarDecisionCliente(orden.codigoDT, true, undefined, operadorAprobacion)
      toast.success("Conformidad y aprobación del cliente registradas. Estado: APROBADO_PARA_REPARACION.")
      setModalDecisionAprobacion(false)
      await cargarDatos()
    } catch (err: any) {
      console.error(err)
      toast.error("Error al registrar aprobación del cliente.")
    } finally {
      setActualizando(false)
    }
  }

  const handleRechazarPropuesta = async () => {
    setActualizando(true)
    try {
      await registrarDecisionCliente(orden.codigoDT, false, motivoRechazo, operadorAprobacion)
      toast.success("Rechazo registrado. Ticket cerrado sin reparación. N° de Serie liberado.")
      setModalDecisionRechazo(false)
      
      // Descargar Informe de Diagnóstico con Acta de Devolución
      generarInformeDiagnostico({
        ...orden,
        estadoGeneral: 'CERRADO_SIN_REPARACION',
        aprobacion: {
          fechaDecision: new Date().toISOString(),
          aprobado: false,
          motivoRechazo
        }
      })

      await cargarDatos()
    } catch (err: any) {
      console.error(err)
      toast.error("Error al registrar rechazo.")
    } finally {
      setActualizando(false)
    }
  }

  // ETAPA 3: Handlers de Intervención & QA
  const handleIniciarReparacionFormal = async () => {
    setActualizando(true)
    try {
      await iniciarIntervencion(orden.codigoDT, tecnicoAsignado || 'Kevin Quispe')
      toast.success("Técnico asignado. Estado actualizado a EN_REPARACION.")
      setModalAsignarIntervencion(false)
      await cargarDatos()
    } catch (err: any) {
      console.error(err)
      toast.error("Error al iniciar intervención.")
    } finally {
      setActualizando(false)
    }
  }

  const handleFinalizarIntervencion = async () => {
    if (!actividades.trim()) {
      toast.error("Detalle las actividades realizadas en el equipo.")
      return
    }

    if (horasHombre <= 0) {
      toast.error("Las horas-hombre invertidas deben ser mayores a 0.")
      return
    }

    const estadoResultado: 'REPARADO' | 'INOPERATIVO' | 'OBSERVADO' = superoQA 
      ? 'REPARADO' 
      : tipoNoAprobado

    setActualizando(true)
    try {
      await cerrarIntervencionTecnica(
        orden.codigoDT,
        {
          tecnicoAsignado,
          actividadesRealizadas: actividades,
          horasHombre: Number(horasHombre),
          pruebasQA: {
            superoPruebas: superoQA,
            observacionesQA: observacionesQA || (superoQA ? 'Operatividad 100% verificada' : `Resultado QA: ${tipoNoAprobado}`)
          },
          firmaDigitalTecnico: firmaCanvasData || 'Firma Técnica Digital Certificada'
        },
        estadoResultado
      )

      toast.success(`Cierre de intervención registrado. Estado: ${estadoResultado}`)
      setModalCierreIntervencion(false)
      await cargarDatos()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error al cerrar intervención.")
    } finally {
      setActualizando(false)
    }
  }

  // ETAPA 4: Handlers de Entrega & Emisión de Informe Técnico Final
  const handleRegistrarEntrega = async () => {
    if (!receptorNombre.trim() || !receptorDni.trim()) {
      toast.error("Debe ingresar el nombre y DNI/RUC del receptor.")
      return
    }

    setActualizando(true)
    try {
      await registrarEntregaYFinalizar(orden.codigoDT, {
        fechaEntrega: new Date(fechaEntrega).toISOString(),
        lugarEntrega,
        receptorNombre,
        receptorDniRuc: receptorDni,
        observacionesFinales: observacionesFinales || 'Equipo entregado a conformidad con pruebas operativas.'
      })

      const ordenActualizada: OrdenServicio = {
        ...orden,
        estadoGeneral: 'ENTREGADO',
        cierre: {
          ...orden.cierre,
          fechaEntrega: new Date(fechaEntrega).toISOString(),
          lugarEntrega,
          receptorNombre,
          receptorDniRuc: receptorDni,
          observacionesFinales: observacionesFinales || 'Equipo entregado a conformidad con pruebas operativas.',
          constanciaGenerada: true
        }
      }

      // Descargar el INFORME TÉCNICO final
      generarInformeTecnico(ordenActualizada)
      toast.success("Equipo entregado a satisfacción. Informe Técnico final generado en PDF.")
      setModalEntrega(false)
      await cargarDatos()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error al registrar la entrega.")
    } finally {
      setActualizando(false)
    }
  }

  // Pipeline de Etapas (para la barra de progreso)
  const etapas = [
    { 
      num: 1, 
      label: "Ingreso", 
      activo: false, 
      completo: true 
    },
    { 
      num: 2, 
      label: "Informe de Diagnóstico", 
      activo: ['REGISTRADO', 'EN_DIAGNOSTICO', 'DIAGNOSTICADO'].includes(orden.estadoGeneral),
      completo: ['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'REPARADO', 'INOPERATIVO', 'OBSERVADO', 'ENTREGADO', 'CERRADO_SIN_REPARACION'].includes(orden.estadoGeneral)
    },
    { 
      num: 3, 
      label: "Intervención & QA", 
      activo: ['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'OBSERVADO'].includes(orden.estadoGeneral),
      completo: ['REPARADO', 'INOPERATIVO', 'ENTREGADO'].includes(orden.estadoGeneral) 
    },
    { 
      num: 4, 
      label: "Informe Técnico Final", 
      activo: ['REPARADO', 'INOPERATIVO'].includes(orden.estadoGeneral),
      completo: orden.estadoGeneral === 'ENTREGADO' || orden.estadoGeneral === 'CERRADO_SIN_REPARACION'
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Barra Superior con Navegación y Acciones */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')} 
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <MurLogo size="sm" showSubtitle={false} />
            <span className="text-slate-300">/</span>
            <span className="font-mono text-sm font-bold text-slate-900">
              {orden.codigoDT}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              orden.estadoGeneral === 'ENTREGADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              orden.estadoGeneral === 'REPARADO' ? 'bg-teal-50 text-teal-700 border-teal-200' :
              orden.estadoGeneral === 'APROBADO_PARA_REPARACION' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              orden.estadoGeneral === 'CERRADO_SIN_REPARACION' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              orden.estadoGeneral === 'INOPERATIVO' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              orden.estadoGeneral === 'OBSERVADO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              orden.estadoGeneral === 'EN_REPARACION' ? 'bg-violet-50 text-violet-700 border-violet-200' :
              orden.estadoGeneral === 'DIAGNOSTICADO' ? 'bg-sky-50 text-sky-700 border-sky-200' :
              orden.estadoGeneral === 'EN_DIAGNOSTICO' ? 'bg-sky-50 text-sky-700 border-sky-200' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {orden.estadoGeneral.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botón Descarga: INFORME DE DIAGNÓSTICO (disponible tras diagnosticar) */}
            {!['REGISTRADO', 'EN_DIAGNOSTICO'].includes(orden.estadoGeneral) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generarInformeDiagnostico(orden)}
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-[#2369A1]" />
                Informe Diagnóstico (PDF)
              </Button>
            )}

            {/* Botón Descarga: INFORME TÉCNICO (documento final de cierre) */}
            {orden.estadoGeneral === 'ENTREGADO' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generarInformeTecnico(orden)}
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Informe Técnico (PDF)
              </Button>
            )}

            {/* Acción Etapa 2: Diagnóstico */}
            {(orden.estadoGeneral === 'REGISTRADO' || orden.estadoGeneral === 'EN_DIAGNOSTICO') && (
              <Button
                size="sm"
                onClick={() => setModalDiagnostico(true)}
                disabled={actualizando}
                className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold shadow-xs"
              >
                <PenTool className="w-3.5 h-3.5 mr-1.5" />
                Registrar Diagnóstico
              </Button>
            )}

            {/* Acción Etapa 2: Decisión de Presupuesto (DIAGNOSTICADO) */}
            {orden.estadoGeneral === 'DIAGNOSTICADO' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setModalDecisionRechazo(true)}
                  disabled={actualizando}
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
                >
                  <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                  Rechazar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setModalDecisionAprobacion(true)}
                  disabled={actualizando}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                  Aprobar
                </Button>
              </div>
            )}

            {/* Acción Paso a Etapa 3 tras Aprobación */}
            {orden.estadoGeneral === 'APROBADO_PARA_REPARACION' && (
              <Button
                size="sm"
                onClick={() => setModalAsignarIntervencion(true)}
                disabled={actualizando}
                className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5 mr-1.5" />
                Iniciar Intervención Taller
              </Button>
            )}

            {/* Acción Etapa 3: Cerrar Intervención */}
            {(orden.estadoGeneral === 'EN_REPARACION' || orden.estadoGeneral === 'OBSERVADO') && (
              <Button
                size="sm"
                onClick={() => setModalCierreIntervencion(true)}
                disabled={actualizando}
                className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Cerrar Intervención & QA
              </Button>
            )}

            {/* Acción Etapa 4: Entrega */}
            {(orden.estadoGeneral === 'REPARADO' || orden.estadoGeneral === 'INOPERATIVO') && (
              <Button
                size="sm"
                onClick={() => setModalEntrega(true)}
                disabled={actualizando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                Registrar Entrega
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">

        {/* Stepper de 4 Etapas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {etapas.map((etapa) => (
              <div 
                key={etapa.num}
                className={`p-3 rounded-lg border transition-all flex items-center gap-3 ${
                  etapa.completo 
                    ? 'bg-emerald-50/50 border-emerald-200/70 text-emerald-800'
                    : etapa.activo
                    ? 'bg-[#2369A1]/5 border-[#2369A1]/30 text-[#2369A1]'
                    : 'bg-slate-50 border-slate-200/60 text-slate-400'
                }`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                  etapa.completo ? 'bg-emerald-100 text-emerald-700' :
                  etapa.activo ? 'bg-[#2369A1] text-white shadow-xs' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {etapa.completo ? <CheckCircle2 className="w-4 h-4" /> : etapa.num}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">Etapa {etapa.num}</p>
                  <p className="text-xs font-semibold text-slate-900">{etapa.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerta de Decisión de Propuesta */}
        {orden.estadoGeneral === 'DIAGNOSTICADO' && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#2369A1]" />
                Informe de Diagnóstico Emitido — Esperando Decisión del Cliente
              </h3>
              <p className="text-xs text-blue-700 mt-0.5">
                El informe de evaluación preliminar ha sido emitido. Presente la propuesta al cliente para autorizar el paso a la Etapa 3.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                size="sm"
                onClick={() => generarInformeDiagnostico(orden)}
                variant="outline"
                className="border-blue-200 bg-white text-blue-800 hover:bg-blue-50 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Informe
              </Button>
              <Button
                size="sm"
                onClick={() => setModalDecisionRechazo(true)}
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
              >
                Rechazar
              </Button>
              <Button
                size="sm"
                onClick={() => setModalDecisionAprobacion(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Aprobar Intervención
              </Button>
            </div>
          </div>
        )}

        {/* Alerta si fue Cerrado sin Reparación */}
        {orden.estadoGeneral === 'CERRADO_SIN_REPARACION' && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-xs flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h3 className="text-xs font-bold text-rose-900">Orden Cerrada Sin Reparación</h3>
              <p className="text-rose-700">
                El cliente rechazó la intervención. Motivo: <strong>{orden.aprobacion?.motivoRechazo || 'Presupuesto no aceptado'}</strong>
              </p>
              <p className="text-slate-500 text-[11px]">
                El equipo ha sido liquidado en taller y el Nº de Serie queda libre para futuras atenciones.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generarInformeDiagnostico(orden)}
                className="mt-2 border-rose-300 bg-white text-rose-800 hover:bg-rose-50 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Acta de Devolución
              </Button>
            </div>
          </div>
        )}

      {/* Cuerpo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Información de Cliente y Equipo */}
        <div className="space-y-6">
          
          <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2369A1]" />
                Datos del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-xs text-slate-600">
              <p><strong className="text-slate-900 font-medium">Razón Social:</strong> {orden.ingreso.cliente.razonSocial}</p>
              <p><strong className="text-slate-900 font-medium">RUC:</strong> <span className="font-mono text-[#2369A1] font-semibold">{orden.ingreso.cliente.ruc}</span></p>
              <p><strong className="text-slate-900 font-medium">Contacto:</strong> {orden.ingreso.cliente.contacto}</p>
              <p><strong className="text-slate-900 font-medium">Teléfono:</strong> {orden.ingreso.cliente.telefono || 'No registrado'}</p>
              <p><strong className="text-slate-900 font-medium">Correo:</strong> {orden.ingreso.cliente.correo || 'No registrado'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#2369A1]" />
                Dispositivo en Taller
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-xs text-slate-600">
              <p><strong className="text-slate-900 font-medium">Tipo:</strong> {orden.ingreso.equipo.tipoEquipo || 'Laptop'}</p>
              <p><strong className="text-slate-900 font-medium">Marca / Modelo:</strong> {orden.ingreso.equipo.marca} {orden.ingreso.equipo.modelo}</p>
              <p>
                <strong className="text-slate-900 font-medium">Nº Serie (S/N):</strong>{' '}
                <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {orden.ingreso.equipo.numeroSerie}
                </span>
              </p>
              <p><strong className="text-slate-900 font-medium">Part Number:</strong> {orden.ingreso.equipo.partNumber || 'No especificado'}</p>
            </CardContent>
          </Card>

          {/* Tarjeta de Aprobación si existe */}
          {orden.aprobacion && (
            <Card className={`border shadow-xs rounded-xl ${
              orden.aprobacion.aprobado 
                ? 'bg-emerald-50/50 border-emerald-200' 
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  {orden.aprobacion.aprobado ? <ThumbsUp className="w-4 h-4 text-emerald-600" /> : <ThumbsDown className="w-4 h-4 text-rose-600" />}
                  Decisión de Propuesta Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-1.5 text-xs text-slate-700">
                <p>Resultado: <strong className={orden.aprobacion.aprobado ? 'text-emerald-700' : 'text-rose-700'}>
                  {orden.aprobacion.aprobado ? 'APROBADO PARA REPARACIÓN' : 'RECHAZADO POR CLIENTE'}
                </strong></p>
                <p>Fecha Decisión: <span className="text-slate-600">{new Date(orden.aprobacion.fechaDecision || '').toLocaleString()}</span></p>
                {orden.aprobacion.motivoRechazo && (
                  <p>Motivo: <span className="text-rose-700 font-medium">{orden.aprobacion.motivoRechazo}</span></p>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Columna Derecha: Tabs de Fases */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="diagnostico" className="w-full">
            <TabsList className="bg-slate-100 border border-slate-200 w-full justify-start rounded-lg p-1 gap-1">
              <TabsTrigger value="ingreso" className="rounded-md text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all">
                1. Ingreso
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="rounded-md text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all">
                2. Diagnóstico
              </TabsTrigger>
              <TabsTrigger value="intervencion" className="rounded-md text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all">
                3. Intervención & QA
              </TabsTrigger>
              <TabsTrigger value="cierre" className="rounded-md text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all">
                4. Cierre & Entrega
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: INGRESO */}
            <TabsContent value="ingreso" className="mt-4 space-y-4">
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-900">Detalles de Recepción en Taller</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Falla Reportada Inicial</h4>
                    <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">
                      {orden.ingreso.fallaReportada}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block mb-0.5 text-[11px]">Fecha de Recepción</span>
                      <strong className="text-slate-900 font-mono">
                        {new Date(orden.ingreso.fechaIngreso).toLocaleString()}
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block mb-0.5 text-[11px]">Operador que Registró</span>
                      <strong className="text-slate-900">{orden.ingreso.registradoPor}</strong>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: DIAGNÓSTICO */}
            <TabsContent value="diagnostico" className="mt-4 space-y-4">
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900">Evaluación Técnica y Catálogo de Piezas</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Pruebas de descarte y especificación para el Informe de Diagnóstico.</CardDescription>
                  </div>
                  {!['CERRADO_SIN_REPARACION', 'ENTREGADO'].includes(orden.estadoGeneral) && (
                    <Button 
                      size="sm" 
                      onClick={() => setModalDiagnostico(true)} 
                      variant="outline" 
                      className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs"
                    >
                      <PenTool className="w-3.5 h-3.5 mr-1.5 text-[#2369A1]" />
                      Editar Diagnóstico
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {orden.diagnostico.tipoFalla || orden.diagnostico.diagnosticoDetallado ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Tipificación de Falla</span>
                          <span className="text-xs font-semibold text-slate-900">
                            {orden.diagnostico.tipoFalla || 'NO ESPECIFICADA'}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Técnico Evaluador</span>
                          <span className="text-xs font-semibold text-slate-900">
                            {orden.diagnostico.tecnicoDiagnostico || 'No asignado'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Condición Estética y Daños Físicos</h4>
                        <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                          {orden.diagnostico.danosFisicos || 'Sin observaciones estéticas.'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Diagnóstico Técnico y Causa Raíz</h4>
                        <p className="text-slate-800 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs leading-relaxed">
                          {orden.diagnostico.diagnosticoDetallado || 'No redactado.'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          {orden.diagnostico.requiereRepuestos ? 'Componentes Requeridos del Catálogo Homologado' : 'Requerimiento de Servicio o Mantenimiento'}
                        </h4>

                        {orden.diagnostico.requiereRepuestos ? (
                          orden.diagnostico.repuestosRequeridos && orden.diagnostico.repuestosRequeridos.length > 0 ? (
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white overflow-hidden">
                              {orden.diagnostico.repuestosRequeridos.map((rep, idx) => (
                                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-mono font-bold text-[#2369A1] mr-2">[{rep.partNumber}]</span>
                                    <span className="text-slate-900 font-medium">{rep.descripcion}</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200">
                                    Cant: {rep.cantidad}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                              Requiere repuestos pero no se han seleccionado ítems del catálogo.
                            </p>
                          )
                        ) : (
                          <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                            {orden.diagnostico.solucionPropuesta || 'Mantenimiento preventivo y limpieza de componentes.'}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-slate-500 space-y-2">
                      <p className="text-xs">El diagnóstico técnico aún no ha sido redactado.</p>
                      <Button onClick={() => setModalDiagnostico(true)} className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs">
                        Abrir Formulario de Diagnóstico
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: INTERVENCIÓN Y QA */}
            <TabsContent value="intervencion" className="mt-4 space-y-4">
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900">Intervención de Taller y Pruebas QA</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Solo ejecutable si el cliente aprueba el Informe de Diagnóstico.
                    </CardDescription>
                  </div>
                  {(orden.estadoGeneral === 'EN_REPARACION' || orden.estadoGeneral === 'OBSERVADO') && (
                    <Button 
                      size="sm" 
                      onClick={() => setModalCierreIntervencion(true)} 
                      className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
                    >
                      Cerrar Intervención & QA
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {!['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'REPARADO', 'INOPERATIVO', 'OBSERVADO', 'ENTREGADO'].includes(orden.estadoGeneral) ? (
                    <div className="py-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <Lock className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">Etapa 3 Bloqueada</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Para iniciar la intervención se requiere que el cliente acepte el Informe de Diagnóstico en la Etapa 2.
                      </p>
                    </div>
                  ) : orden.estadoGeneral === 'APROBADO_PARA_REPARACION' ? (
                    <div className="p-6 text-center text-slate-700 space-y-2 bg-blue-50/60 border border-blue-200 rounded-xl">
                      <ThumbsUp className="w-6 h-6 text-[#2369A1] mx-auto" />
                      <p className="text-xs font-semibold text-blue-900">Informe Aprobado por el Cliente</p>
                      <p className="text-xs text-slate-600">
                        El cliente ha brindado su conformidad. Asigne al técnico responsable para iniciar la reparación.
                      </p>
                      <Button onClick={() => setModalAsignarIntervencion(true)} className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs mt-2">
                        <Wrench className="w-3.5 h-3.5 mr-1.5" />
                        Asignar Técnico e Iniciar Reparación
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Técnico Ejecutor</span>
                          <strong className="text-xs text-slate-900">{orden.intervencion.tecnicoAsignado || 'No asignado'}</strong>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Horas-Hombre</span>
                          <strong className="text-xs font-mono text-slate-900">{orden.intervencion.horasHombre || 0} hrs</strong>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-slate-500 block mb-0.5">Control de Calidad (QA)</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                            orden.intervencion.pruebasQA?.superoPruebas !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {orden.intervencion.pruebasQA?.superoPruebas !== false ? 'QA CONFORME' : 'NO CONFORME'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Actividades Ejecutadas</h4>
                        <p className="text-slate-800 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs leading-relaxed">
                          {orden.intervencion.actividadesRealizadas || 'En proceso de ejecución.'}
                        </p>
                      </div>

                      {orden.intervencion.pruebasQA?.observacionesQA && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Observaciones de Calidad</h4>
                          <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                            {orden.intervencion.pruebasQA.observacionesQA}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: INFORME TÉCNICO FINAL Y ENTREGA */}
            <TabsContent value="cierre" className="mt-4 space-y-4">
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900">Informe Técnico Final y Entrega</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Emisión de Informe Técnico final con recuadros de firma y conformidad.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {orden.estadoGeneral === 'ENTREGADO' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="text-xs font-semibold text-emerald-900">Equipo Entregado e Informe Técnico Emitido</p>
                            <p className="text-[11px] text-emerald-700">
                              Receptor: {orden.cierre.receptorNombre} (DNI/RUC: {orden.cierre.receptorDniRuc})
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => generarInformeTecnico(orden)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Descargar Informe Técnico
                        </Button>
                      </div>
                    </div>
                  ) : orden.estadoGeneral === 'CERRADO_SIN_REPARACION' ? (
                    <div className="p-6 text-center text-slate-500 space-y-2 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-900 font-semibold">Orden Cerrada Sin Reparación</p>
                      <p className="text-xs">Se emitió Acta de Devolución con el Informe de Diagnóstico adjunto.</p>
                      <Button 
                        onClick={() => generarInformeDiagnostico(orden)}
                        variant="outline"
                        className="border-slate-200 bg-white text-xs text-slate-700"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5 text-[#2369A1]" />
                        Descargar Acta de Devolución
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500 space-y-2">
                      <p className="text-xs">El equipo aún no ha completado el ciclo de taller para su entrega.</p>
                      {['REPARADO', 'INOPERATIVO'].includes(orden.estadoGeneral) && (
                        <Button onClick={() => setModalEntrega(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                          Registrar Entrega y Emitir Informe Técnico
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>

    </main>

      {/* ========================================================================= */}
      {/* MODAL ETAPA 2: DIAGNÓSTICO TÉCNICO & CATÁLOGO */}
      {/* ========================================================================= */}
      <Dialog open={modalDiagnostico} onOpenChange={setModalDiagnostico}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
          <div className="p-6 pb-4 border-b border-slate-200 bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[#2369A1]" />
                Diagnóstico Técnico y Emisión de Informe de Diagnóstico
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Al guardar, el estado pasará a DIAGNOSTICADO y se emitirá el <strong>Informe de Diagnóstico</strong> en PDF para el cliente.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-700">Técnico que Diagnostica</Label>
                <select
                  value={tecnicoDiag}
                  onChange={(e) => setTecnicoDiag(e.target.value)}
                  className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#2369A1]"
                >
                  {usuarios.map(u => (
                    <option key={u.id} value={u.nombreCompleto}>{u.nombreCompleto}</option>
                  ))}
                  {usuarios.length === 0 && (
                    <option value="Beeker Aarón Valdéz Mattos">Beeker Aarón Valdéz Mattos</option>
                  )}
                </select>
              </div>

              <div>
                <Label className="text-xs text-slate-700">Tipificación de Falla *</Label>
                <select
                  value={tipoFalla}
                  onChange={(e) => setTipoFalla(e.target.value as TipoFalla)}
                  className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#2369A1]"
                >
                  <option value="HARDWARE">Hardware (Físico / Componentes)</option>
                  <option value="SOFTWARE">Software (Sistema Operativo / Drivers)</option>
                  <option value="OPERATIVO">Operativo (Configuración / Uso)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-700">Condición Estética y Daños Físicos Externos</Label>
              <Input
                placeholder="Ej. Desgaste leve en bordes, carcasa intacta"
                value={danosFisicos}
                onChange={(e) => setDanosFisicos(e.target.value)}
                className="mt-1 bg-white border-slate-300 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-700">Diagnóstico Técnico Detallado y Causa Raíz *</Label>
              <textarea
                rows={3}
                placeholder="Redacte las pruebas de descarte realizadas y la causa origen de la avería..."
                value={diagDetallado}
                onChange={(e) => setDiagDetallado(e.target.value)}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#2369A1] focus:outline-none"
                required
              />
            </div>

            {/* Selector: ¿Requiere reemplazo de componentes físicos? */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-slate-800 block">
                    ¿Requiere Reemplazo de Componentes Físicos?
                  </Label>
                  <span className="text-[11px] text-slate-500">
                    {requiereRepuestos ? "Seleccionar piezas desde Catálogo Homologado" : "Definir requerimiento de servicio o mantenimiento"}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRequiereRepuestos(false)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      !requiereRepuestos ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    NO
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequiereRepuestos(true)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      requiereRepuestos ? 'bg-[#2369A1] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    SÍ
                  </button>
                </div>
              </div>

              {requiereRepuestos ? (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <select
                        value={repuestoActualId}
                        onChange={(e) => setRepuestoActualId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                      >
                        {catalogoRepuestos.map(r => (
                          <option key={r.id} value={r.id}>
                            [{r.id}] {r.descripcion} ({r.marca} - Stock: {r.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={cantidadRepuesto}
                        onChange={(e) => setCantidadRepuesto(Math.max(1, parseInt(e.target.value) || 1))}
                        className="bg-white border-slate-300 text-xs text-center"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAgregarRepuesto}
                      className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
                    </Button>
                  </div>

                  {repuestosSeleccionados.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                      {repuestosSeleccionados.map((item) => (
                        <div key={item.partNumber} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-[#2369A1] font-bold mr-2">[{item.partNumber}]</span>
                            <span className="text-slate-800 font-medium">{item.descripcion}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                              x{item.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEliminarRepuesto(item.partNumber)}
                              className="text-rose-600 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200">
                  <Label className="text-xs text-slate-700">Requerimiento de Servicio o Mantenimiento *</Label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Mantenimiento general, limpieza de sistema térmico y formateo lógico..."
                    value={solucionPropuesta}
                    onChange={(e) => setSolucionPropuesta(e.target.value)}
                    className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                  />
                </div>
              )}
            </div>

          </div>

          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50">
            <Button variant="outline" onClick={() => setModalDiagnostico(false)} className="border-slate-300 text-slate-700 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleGuardarDiagnostico} 
              disabled={actualizando} 
              className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Guardar y Emitir Informe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DECISIÓN CLIENTE: APROBACIÓN DE PROPUESTA */}
      {/* ========================================================================= */}
      <Dialog open={modalDecisionAprobacion} onOpenChange={setModalDecisionAprobacion}>
        <DialogContent className="sm:max-w-[480px] bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-700">
              <ThumbsUp className="w-5 h-5 text-emerald-600" />
              Aprobación del Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Al registrar la aprobación, el estado pasará a <strong>APROBADO_PARA_REPARACION</strong> y se habilitará la Etapa 3.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-xs">
            <div>
              <Label className="text-xs text-slate-700">Registrado por (Operador/Mesa)</Label>
              <Input
                value={operadorAprobacion}
                onChange={(e) => setOperadorAprobacion(e.target.value)}
                className="mt-1 bg-white border-slate-300 text-xs"
              />
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
              El cliente confirma la ejecución de los trabajos y repuestos según el Informe de Diagnóstico.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDecisionAprobacion(false)} className="border-slate-300 text-slate-700 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleAprobarPropuesta} 
              disabled={actualizando} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirmar Aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DECISIÓN CLIENTE: RECHAZO DE PROPUESTA */}
      {/* ========================================================================= */}
      <Dialog open={modalDecisionRechazo} onOpenChange={setModalDecisionRechazo}>
        <DialogContent className="sm:max-w-[480px] bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-700">
              <ThumbsDown className="w-5 h-5 text-rose-600" />
              Rechazo de Propuesta Comercial
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              El cliente rechaza la intervención. El estado pasará a <strong>CERRADO_SIN_REPARACION</strong> y se liberará la serie del equipo.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-xs">
            <div>
              <Label className="text-xs text-slate-700">Motivo del Rechazo *</Label>
              <textarea
                rows={3}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej. Costo de repuesto excede presupuesto del cliente..."
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                required
              />
            </div>
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
              Al confirmar, el ticket se cierra definitivamente sin pasar a intervención.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDecisionRechazo(false)} className="border-slate-300 text-slate-700 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleRechazarPropuesta} 
              disabled={actualizando} 
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirmar Rechazo y Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL ASIGNAR TÉCNICO FORMAL E INICIAR ETAPA 3 */}
      {/* ========================================================================= */}
      <Dialog open={modalAsignarIntervencion} onOpenChange={setModalAsignarIntervencion}>
        <DialogContent className="sm:max-w-[480px] bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Wrench className="w-5 h-5 text-[#2369A1]" />
              Asignar Técnico Responsable
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Inicio de la <strong>ETAPA 3: Intervención de Taller</strong>. El estado cambiará a <strong>EN_REPARACION</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-xs">
            <div>
              <Label className="text-xs text-slate-700">Técnico Ejecutor Asignado *</Label>
              <select
                value={tecnicoAsignado}
                onChange={(e) => setTecnicoAsignado(e.target.value)}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#2369A1]"
              >
                {usuarios.map(u => (
                  <option key={u.id} value={u.nombreCompleto}>{u.nombreCompleto} ({u.cargo || u.rol})</option>
                ))}
                {usuarios.length === 0 && (
                  <option value="Kevin Quispe">Kevin Quispe (Técnico de Taller)</option>
                )}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAsignarIntervencion(false)} className="border-slate-300 text-slate-700 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleIniciarReparacionFormal} 
              disabled={actualizando} 
              className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Iniciar Intervención
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL CIERRE DE INTERVENCIÓN Y QA (ETAPA 3) */}
      {/* ========================================================================= */}
      <Dialog open={modalCierreIntervencion} onOpenChange={setModalCierreIntervencion}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
          <div className="p-6 pb-4 border-b border-slate-200 bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#2369A1]" />
                Cierre de Intervención Técnica y Control de Calidad (QA)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Documentar actividades, horas-hombre, pruebas de operatividad y firma digital.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-700">Técnico Ejecutor</Label>
                <Input
                  value={tecnicoAsignado}
                  disabled
                  className="mt-1 bg-slate-50 border-slate-200 text-xs text-slate-600 font-medium"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-700">Horas-Hombre Invertidas (H-H) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={horasHombre}
                  onChange={(e) => setHorasHombre(parseFloat(e.target.value) || 1)}
                  className="mt-1 bg-white border-slate-300 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-700">Actividades Realizadas y Observaciones Técnicas *</Label>
              <textarea
                rows={3}
                placeholder="Detalle el cambio de piezas, configuración técnica, pruebas térmicas..."
                value={actividades}
                onChange={(e) => setActividades(e.target.value)}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#2369A1] focus:outline-none"
                required
              />
            </div>

            {/* QA Selector */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <Label className="text-xs font-semibold text-slate-800 block">
                ¿Superó exitosamente las pruebas de operatividad (QA)?
              </Label>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSuperoQA(true)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-colors ${
                    superoQA 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    SÍ — Pruebas Superadas (REPARADO)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">El equipo opera al 100% de especificación.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSuperoQA(false)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-colors ${
                    !superoQA 
                      ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    NO — Falla Persistente
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Equipo irreparable o re-evaluación.</p>
                </button>
              </div>

              {!superoQA && (
                <div className="p-3 bg-white rounded-lg border border-rose-200 space-y-2">
                  <Label className="text-xs text-rose-800 font-semibold">
                    ¿El equipo es irreparable o costo inviable?
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoNoAprobado('OBSERVADO')}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold ${
                        tipoNoAprobado === 'OBSERVADO'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      NO — OBSERVADO (Re-evaluación)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoNoAprobado('INOPERATIVO')}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold ${
                        tipoNoAprobado === 'INOPERATIVO'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      SÍ — INOPERATIVO
                    </button>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-slate-600">Observaciones de Control de Calidad</Label>
                <Input
                  placeholder="Detalle encendido, estrés, periféricos, audio, puertos..."
                  value={observacionesQA}
                  onChange={(e) => setObservacionesQA(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Firma digital técnica */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800">
                  Firma Digital del Técnico Responsable
                </Label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Limpiar Trazo
                </button>
              </div>

              <div className="border border-slate-300 rounded-lg bg-white overflow-hidden flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={100}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="cursor-crosshair touch-none w-full"
                />
              </div>
            </div>

          </div>

          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50">
            <Button variant="outline" onClick={() => setModalCierreIntervencion(false)} className="border-slate-300 text-slate-700 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleFinalizarIntervencion} 
              disabled={actualizando} 
              className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirmar Cierre Técnico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL ETAPA 4: ENTREGA Y EMISIÓN DE INFORME TÉCNICO FINAL */}
      {/* ========================================================================= */}
      <Dialog open={modalEntrega} onOpenChange={setModalEntrega}>
        <DialogContent className="sm:max-w-[580px] flex flex-col bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
          <div className="p-6 pb-4 border-b border-slate-200 bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Entrega Formal y Emisión de Informe Técnico
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Registrar datos de entrega y emitir el <strong>Informe Técnico final en PDF</strong>.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-700">Fecha de Entrega *</Label>
                <Input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-slate-700">Lugar de Entrega *</Label>
                <Input
                  value={lugarEntrega}
                  onChange={(e) => setLugarEntrega(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-slate-700">Nombre del Receptor / Cliente *</Label>
                <Input
                  placeholder="Persona que recibe el equipo"
                  value={receptorNombre}
                  onChange={(e) => setReceptorNombre(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-slate-700">DNI / RUC del Receptor *</Label>
                <Input
                  placeholder="Documento de identidad"
                  value={receptorDni}
                  onChange={(e) => setReceptorDni(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-700">Observaciones de Entrega</Label>
              <textarea
                rows={2}
                placeholder="Ej. Equipo verificado en operatividad y encendido delante del receptor."
                value={observacionesFinales}
                onChange={(e) => setObservacionesFinales(e.target.value)}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
              />
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800">
              Al confirmar, el estado cambiará a <strong>ENTREGADO</strong> y se descargará el <strong>Informe Técnico final</strong>.
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50">
            <Button variant="outline" onClick={() => setModalEntrega(false)} className="border-slate-300 text-slate-700 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarEntrega} 
              disabled={actualizando} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirmar Entrega y Descargar Informe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
