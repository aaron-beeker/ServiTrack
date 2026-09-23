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
    ctx.strokeStyle = '#38bdf8'
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
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm text-slate-400">Cargando orden técnica...</span>
      </div>
    )
  }

  if (!orden) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 gap-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <p className="text-lg">No se encontró la orden técnica {codigo}.</p>
        <Button onClick={() => router.push('/')} variant="outline" className="border-slate-800">
          Volver al Dashboard
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
    <div className="min-h-screen bg-[#090E17] text-slate-100 p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Barra Superior con Navegación y Acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#2369A1]/20">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/')} 
            className="border-slate-800 bg-[#0F1A2C] hover:bg-[#192A45] text-slate-300 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <MurLogo size="sm" showSubtitle={false} />
              <span className="text-slate-600">|</span>
              <h1 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
                Orden {orden.codigoDT}
              </h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                orden.estadoGeneral === 'ENTREGADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                orden.estadoGeneral === 'REPARADO' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' :
                orden.estadoGeneral === 'APROBADO_PARA_REPARACION' ? 'bg-[#2369A1]/15 text-[#38BDF8] border-[#2369A1]/30' :
                orden.estadoGeneral === 'CERRADO_SIN_REPARACION' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                orden.estadoGeneral === 'INOPERATIVO' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                orden.estadoGeneral === 'OBSERVADO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                orden.estadoGeneral === 'EN_REPARACION' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                orden.estadoGeneral === 'DIAGNOSTICADO' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                orden.estadoGeneral === 'EN_DIAGNOSTICO' ? 'bg-[#2369A1]/15 text-[#38BDF8] border-[#2369A1]/30' :
                'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {orden.estadoGeneral}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cliente: <strong className="text-slate-200">{orden.ingreso.cliente.razonSocial}</strong> (RUC: {orden.ingreso.cliente.ruc})
            </p>
          </div>
        </div>

        {/* Acciones Rápidas del Ciclo de Vida */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Acción Etapa 2: Diagnóstico */}
          {(orden.estadoGeneral === 'REGISTRADO' || orden.estadoGeneral === 'EN_DIAGNOSTICO') && (
            <Button
              onClick={() => setModalDiagnostico(true)}
              disabled={actualizando}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
            >
              <PenTool className="w-4 h-4 mr-2" />
              Registrar Diagnóstico Técnico
            </Button>
          )}

          {/* Acción Etapa 2: Decisión de Presupuesto (DIAGNOSTICADO) */}
          {orden.estadoGeneral === 'DIAGNOSTICADO' && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setModalDecisionRechazo(true)}
                disabled={actualizando}
                variant="outline"
                className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Cliente Rechaza
              </Button>
              <Button
                onClick={() => setModalDecisionAprobacion(true)}
                disabled={actualizando}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Cliente Aprueba
              </Button>
            </div>
          )}

          {/* Acción Paso a Etapa 3 tras Aprobación */}
          {orden.estadoGeneral === 'APROBADO_PARA_REPARACION' && (
            <Button
              onClick={() => setModalAsignarIntervencion(true)}
              disabled={actualizando}
              className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 animate-pulse"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Asignar Técnico e Iniciar Etapa 3
            </Button>
          )}

          {/* Acción Etapa 3: Cerrar Intervención */}
          {(orden.estadoGeneral === 'EN_REPARACION' || orden.estadoGeneral === 'OBSERVADO') && (
            <Button
              onClick={() => setModalCierreIntervencion(true)}
              disabled={actualizando}
              className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Cerrar Intervención & QA
            </Button>
          )}

          {/* Acción Etapa 4: Entrega */}
          {(orden.estadoGeneral === 'REPARADO' || orden.estadoGeneral === 'INOPERATIVO') && (
            <Button
              onClick={() => setModalEntrega(true)}
              disabled={actualizando}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Registrar Entrega y Generar Informe Técnico
            </Button>
          )}

          {/* Botón Descarga: INFORME DE DIAGNÓSTICO (disponible tras diagnosticar) */}
          {!['REGISTRADO', 'EN_DIAGNOSTICO'].includes(orden.estadoGeneral) && (
            <Button
              variant="outline"
              onClick={() => generarInformeDiagnostico(orden)}
              className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
            >
              <FileText className="w-4 h-4 mr-2 text-blue-400" />
              Informe de Diagnóstico (PDF)
            </Button>
          )}

          {/* Botón Descarga: INFORME TÉCNICO (documento final de cierre) */}
          {orden.estadoGeneral === 'ENTREGADO' && (
            <Button
              variant="outline"
              onClick={() => generarInformeTecnico(orden)}
              className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
            >
              <FileText className="w-4 h-4 mr-2 text-emerald-400" />
              Informe Técnico (PDF)
            </Button>
          )}

        </div>
      </div>

      {/* Stepper visual de Etapas */}
      <div className="bg-slate-900/50 border border-slate-800/60 backdrop-blur-md rounded-2xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {etapas.map((etapa) => (
            <div 
              key={etapa.num}
              className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                etapa.completo 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                  : etapa.activo
                  ? 'bg-blue-950/30 border-blue-500/40 text-blue-400'
                  : 'bg-slate-950/40 border-slate-800/40 text-slate-500'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                etapa.completo ? 'bg-emerald-500/20 text-emerald-300' :
                etapa.activo ? 'bg-blue-500/20 text-blue-300 animate-pulse' :
                'bg-slate-800 text-slate-500'
              }`}>
                {etapa.completo ? <CheckCircle2 className="w-4 h-4" /> : etapa.num}
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold tracking-wider">Etapa {etapa.num}</p>
                <p className="text-xs font-medium text-slate-200">{etapa.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerta de Decisión de Propuesta */}
      {orden.estadoGeneral === 'DIAGNOSTICADO' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/30 shadow-xl space-y-3 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Informe de Diagnóstico Emitido — Esperando Decisión del Cliente
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                El informe de diagnóstico técnico ha sido redactado. Presente la propuesta técnica al cliente para habilitar la Etapa 3.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                onClick={() => generarInformeDiagnostico(orden)}
                variant="outline"
                className="border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Informe de Diagnóstico
              </Button>
              <Button
                onClick={() => setModalDecisionRechazo(true)}
                variant="outline"
                className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs"
              >
                Rechazar
              </Button>
              <Button
                onClick={() => setModalDecisionAprobacion(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                Aprobar Intervención
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta si fue Cerrado sin Reparación */}
      {orden.estadoGeneral === 'CERRADO_SIN_REPARACION' && (
        <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/30 shadow-lg flex items-start gap-4">
          <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="text-sm font-bold text-rose-200">Ticket Cerrado Sin Reparación</h3>
            <p className="text-rose-300/80">
              El cliente no aprobó la propuesta técnica / presupuesto. Motivo: <strong className="text-white">{orden.aprobacion?.motivoRechazo || 'Presupuesto no aceptado'}</strong>
            </p>
            <p className="text-slate-400 text-[11px]">
              El equipo ha sido liquidado en taller y el Nº de Serie queda libre para futuras atenciones.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generarInformeDiagnostico(orden)}
              className="mt-2 border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Descargar Acta de Devolución con Informe Adjunto
            </Button>
          </div>
        </div>
      )}

      {/* Cuerpo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Información de Cliente y Equipo */}
        <div className="space-y-6">
          
          <Card className="bg-slate-900/70 border-slate-800/80 shadow-lg">
            <CardHeader className="pb-3 border-b border-slate-800/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                <Building2 className="w-4 h-4 text-blue-400" />
                Datos del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5 text-xs text-slate-300">
              <p><strong className="text-slate-100">Razón Social:</strong> {orden.ingreso.cliente.razonSocial}</p>
              <p><strong className="text-slate-100">RUC:</strong> <span className="font-mono text-blue-400">{orden.ingreso.cliente.ruc}</span></p>
              <p><strong className="text-slate-100">Contacto:</strong> {orden.ingreso.cliente.contacto}</p>
              <p><strong className="text-slate-100">Teléfono:</strong> {orden.ingreso.cliente.telefono || 'No registrado'}</p>
              <p><strong className="text-slate-100">Correo:</strong> {orden.ingreso.cliente.correo || 'No registrado'}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/70 border-slate-800/80 shadow-lg">
            <CardHeader className="pb-3 border-b border-slate-800/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                <Laptop className="w-4 h-4 text-blue-400" />
                Dispositivo en Taller
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5 text-xs text-slate-300">
              <p><strong className="text-slate-100">Tipo:</strong> {orden.ingreso.equipo.tipoEquipo || 'Laptop'}</p>
              <p><strong className="text-slate-100">Marca / Modelo:</strong> {orden.ingreso.equipo.marca} {orden.ingreso.equipo.modelo}</p>
              <p>
                <strong className="text-slate-100">Nº Serie (S/N):</strong>{' '}
                <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {orden.ingreso.equipo.numeroSerie}
                </span>
              </p>
              <p><strong className="text-slate-100">Part Number:</strong> {orden.ingreso.equipo.partNumber || 'No especificado'}</p>
            </CardContent>
          </Card>

          {/* Tarjeta de Aprobación si existe */}
          {orden.aprobacion && (
            <Card className={`border shadow-lg ${
              orden.aprobacion.aprobado 
                ? 'bg-emerald-950/20 border-emerald-500/30' 
                : 'bg-rose-950/20 border-rose-500/30'
            }`}>
              <CardHeader className="pb-2 border-b border-slate-800/50">
                <CardTitle className="text-xs font-semibold flex items-center gap-2 text-slate-200">
                  {orden.aprobacion.aprobado ? <ThumbsUp className="w-4 h-4 text-emerald-400" /> : <ThumbsDown className="w-4 h-4 text-rose-400" />}
                  Decisión de Propuesta Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 text-xs text-slate-300">
                <p>Resultado: <strong className={orden.aprobacion.aprobado ? 'text-emerald-400' : 'text-rose-400'}>
                  {orden.aprobacion.aprobado ? 'APROBADO PARA REPARACIÓN' : 'RECHAZADO POR CLIENTE'}
                </strong></p>
                <p>Fecha Decisión: <span className="text-slate-300">{new Date(orden.aprobacion.fechaDecision || '').toLocaleString()}</span></p>
                {orden.aprobacion.motivoRechazo && (
                  <p>Motivo: <span className="text-rose-200">{orden.aprobacion.motivoRechazo}</span></p>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Columna Derecha: Tabs de Fases */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="diagnostico" className="w-full">
            <TabsList className="bg-slate-900/80 border border-slate-800 w-full justify-start rounded-xl p-1 gap-1">
              <TabsTrigger value="ingreso" className="rounded-lg text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
                1. Ingreso
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="rounded-lg text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
                2. Informe de Diagnóstico
              </TabsTrigger>
              <TabsTrigger value="intervencion" className="rounded-lg text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
                3. Intervención & QA
              </TabsTrigger>
              <TabsTrigger value="cierre" className="rounded-lg text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
                4. Informe Técnico Final
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: INGRESO */}
            <TabsContent value="ingreso" className="mt-6 space-y-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base text-slate-100">Detalles de Recepción en Taller</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Falla Reportada Inicial</h4>
                    <p className="text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm">
                      {orden.ingreso.fallaReportada}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400 block mb-1">Fecha de Recepción</span>
                      <strong className="text-slate-200 font-mono">
                        {new Date(orden.ingreso.fechaIngreso).toLocaleString()}
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400 block mb-1">Operador que Registró</span>
                      <strong className="text-slate-200">{orden.ingreso.registradoPor}</strong>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: DIAGNÓSTICO */}
            <TabsContent value="diagnostico" className="mt-6 space-y-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base text-slate-100">Evaluación Técnica y Catálogo de Piezas</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Pruebas de descarte y especificación para el Informe de Diagnóstico.</CardDescription>
                  </div>
                  {!['CERRADO_SIN_REPARACION', 'ENTREGADO'].includes(orden.estadoGeneral) && (
                    <Button 
                      size="sm" 
                      onClick={() => setModalDiagnostico(true)} 
                      variant="outline" 
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs"
                    >
                      <PenTool className="w-3.5 h-3.5 mr-1.5" />
                      Editar Diagnóstico
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {orden.diagnostico.tipoFalla || orden.diagnostico.diagnosticoDetallado ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-xs text-slate-400 block mb-1">Tipificación de Falla</span>
                          <span className="text-sm font-semibold text-indigo-400">
                            {orden.diagnostico.tipoFalla || 'NO ESPECIFICADA'}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-xs text-slate-400 block mb-1">Técnico Evaluador</span>
                          <span className="text-sm font-semibold text-slate-200">
                            {orden.diagnostico.tecnicoDiagnostico || 'No asignado'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Condición Estética y Daños Físicos</h4>
                        <p className="text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                          {orden.diagnostico.danosFisicos || 'Sin observaciones estéticas.'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Diagnóstico Técnico y Causa Raíz</h4>
                        <p className="text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm">
                          {orden.diagnostico.diagnosticoDetallado || 'No redactado.'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 mb-1.5">
                          {orden.diagnostico.requiereRepuestos ? 'Componentes Requeridos del Catálogo Homologado' : 'Requerimiento de Servicio o Mantenimiento'}
                        </h4>

                        {orden.diagnostico.requiereRepuestos ? (
                          orden.diagnostico.repuestosRequeridos && orden.diagnostico.repuestosRequeridos.length > 0 ? (
                            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
                              {orden.diagnostico.repuestosRequeridos.map((rep, idx) => (
                                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-mono font-bold text-blue-400 mr-2">[{rep.partNumber}]</span>
                                    <span className="text-slate-200 font-medium">{rep.descripcion}</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                    Cant: {rep.cantidad}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                              Requiere repuestos pero no se han seleccionado ítems del catálogo.
                            </p>
                          )
                        ) : (
                          <p className="text-slate-200 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                            {orden.diagnostico.solucionPropuesta || 'Mantenimiento preventivo y limpieza de componentes.'}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8 text-slate-500 space-y-3">
                      <p className="text-sm">El diagnóstico técnico aún no ha sido redactado.</p>
                      <Button onClick={() => setModalDiagnostico(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                        Abrir Formulario de Diagnóstico
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: INTERVENCIÓN Y QA */}
            <TabsContent value="intervencion" className="mt-6 space-y-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base text-slate-100">Intervención de Taller y Pruebas QA</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Solo ejecutable si el cliente aprueba el Informe de Diagnóstico.
                    </CardDescription>
                  </div>
                  {(orden.estadoGeneral === 'EN_REPARACION' || orden.estadoGeneral === 'OBSERVADO') && (
                    <Button 
                      size="sm" 
                      onClick={() => setModalCierreIntervencion(true)} 
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                    >
                      Cerrar Intervención & QA
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {!['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'REPARADO', 'INOPERATIVO', 'OBSERVADO', 'ENTREGADO'].includes(orden.estadoGeneral) ? (
                    <div className="p-8 text-center text-slate-500 space-y-3 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                      <Lock className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-300 font-semibold">Etapa 3 Bloqueada</p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Para iniciar la intervención física se requiere que el cliente acepte formalmente el Informe de Diagnóstico y presupuesto en la Etapa 2.
                      </p>
                    </div>
                  ) : orden.estadoGeneral === 'APROBADO_PARA_REPARACION' ? (
                    <div className="p-6 text-center text-slate-300 space-y-3 bg-blue-950/20 border border-blue-500/30 rounded-xl">
                      <ThumbsUp className="w-8 h-8 text-blue-400 mx-auto" />
                      <p className="text-sm font-semibold text-blue-200">Informe de Diagnóstico Aprobado por el Cliente</p>
                      <p className="text-xs text-slate-400">
                        El cliente ha brindado su conformidad. Asigne al técnico responsable para iniciar la intervención física.
                      </p>
                      <Button onClick={() => setModalAsignarIntervencion(true)} className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
                        <Wrench className="w-3.5 h-3.5 mr-1.5" />
                        Asignar Técnico e Iniciar Reparación
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-xs text-slate-400 block mb-1">Técnico Ejecutor</span>
                          <strong className="text-sm text-slate-200">{orden.intervencion.tecnicoAsignado || 'No asignado'}</strong>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-xs text-slate-400 block mb-1">Horas-Hombre</span>
                          <strong className="text-sm font-mono text-purple-400">{orden.intervencion.horasHombre || 0} hrs</strong>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-xs text-slate-400 block mb-1">Control de Calidad (QA)</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            orden.intervencion.pruebasQA?.superoPruebas !== false
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {orden.intervencion.pruebasQA?.superoPruebas !== false ? 'QA CONFORME' : 'NO CONFORME'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Actividades Ejecutadas</h4>
                        <p className="text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm">
                          {orden.intervencion.actividadesRealizadas || 'En proceso de ejecución.'}
                        </p>
                      </div>

                      {orden.intervencion.pruebasQA?.observacionesQA && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Observaciones de Calidad</h4>
                          <p className="text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
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
            <TabsContent value="cierre" className="mt-6 space-y-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base text-slate-100">Informe Técnico Final y Entrega</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Emisión de Informe Técnico final con recuadros de firma y conformidad.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orden.estadoGeneral === 'ENTREGADO' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-200">Equipo Entregado e Informe Técnico Emitido</p>
                            <p className="text-xs text-emerald-400/80">
                              Receptor: {orden.cierre.receptorNombre} (DNI/RUC: {orden.cierre.receptorDniRuc})
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => generarInformeTecnico(orden)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Descargar Informe Técnico
                        </Button>
                      </div>
                    </div>
                  ) : orden.estadoGeneral === 'CERRADO_SIN_REPARACION' ? (
                    <div className="p-6 text-center text-slate-400 space-y-3 bg-slate-950/50 rounded-xl border border-slate-800">
                      <p className="text-sm text-slate-200 font-semibold">Orden Cerrada Sin Reparación</p>
                      <p className="text-xs">Se emitió Acta de Devolución con el Informe de Diagnóstico adjunto.</p>
                      <Button 
                        onClick={() => generarInformeDiagnostico(orden)}
                        variant="outline"
                        className="border-slate-700 text-xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                        Descargar Acta de Devolución
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-8 text-slate-500 space-y-3">
                      <p className="text-sm">El equipo aún no ha completado el ciclo de taller para su entrega.</p>
                      {['REPARADO', 'INOPERATIVO'].includes(orden.estadoGeneral) && (
                        <Button onClick={() => setModalEntrega(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                          Completar Datos de Entrega y Emitir Informe Técnico
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

      {/* ========================================================================= */}
      {/* MODAL ETAPA 2: DIAGNÓSTICO TÉCNICO & CATÁLOGO */}
      {/* ========================================================================= */}
      <Dialog open={modalDiagnostico} onOpenChange={setModalDiagnostico}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
          <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/60">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <PenTool className="w-4 h-4" />
                </span>
                ETAPA 2: Diagnóstico Técnico y Emisión de Informe de Diagnóstico
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Al guardar, el estado pasará a DIAGNOSTICADO y se emitirá el <strong>Informe de Diagnóstico</strong> en PDF para el cliente.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-300">Técnico que Diagnostica</Label>
                <select
                  value={tecnicoDiag}
                  onChange={(e) => setTecnicoDiag(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
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
                <Label className="text-xs text-slate-300">Tipificación de Origen de Falla *</Label>
                <select
                  value={tipoFalla}
                  onChange={(e) => setTipoFalla(e.target.value as TipoFalla)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                >
                  <option value="HARDWARE">Hardware (Físico / Componentes)</option>
                  <option value="SOFTWARE">Software (Sistema Operativo / Drivers)</option>
                  <option value="OPERATIVO">Operativo (Configuración / Uso)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Condición Estética y Daños Físicos Externos</Label>
              <Input
                placeholder="Ej. Desgaste leve en bordes, carcasa intacta"
                value={danosFisicos}
                onChange={(e) => setDanosFisicos(e.target.value)}
                className="mt-1 bg-slate-950 border-slate-700 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Diagnóstico Técnico Detallado y Causa Raíz *</Label>
              <textarea
                rows={3}
                placeholder="Redacte las pruebas de descarte realizadas y la causa origen de la avería..."
                value={diagDetallado}
                onChange={(e) => setDiagDetallado(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Selector: ¿Requiere reemplazo de componentes físicos? */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-slate-200 block">
                    ¿Requiere Reemplazo de Componentes Físicos?
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    {requiereRepuestos ? "Seleccionar piezas desde Catálogo Homologado" : "Definir requerimiento de servicio o mantenimiento"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRequiereRepuestos(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      !requiereRepuestos ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    NO
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequiereRepuestos(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      requiereRepuestos ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    SÍ
                  </button>
                </div>
              </div>

              {requiereRepuestos ? (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <select
                        value={repuestoActualId}
                        onChange={(e) => setRepuestoActualId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                      >
                        {catalogoRepuestos.map(r => (
                          <option key={r.id} value={r.id}>
                            [{r.id}] {r.descripcion} ({r.marca} - Stock: {r.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={cantidadRepuesto}
                        onChange={(e) => setCantidadRepuesto(Math.max(1, parseInt(e.target.value) || 1))}
                        className="bg-slate-950 border-slate-700 text-xs text-center"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAgregarRepuesto}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
                    </Button>
                  </div>

                  {repuestosSeleccionados.length > 0 && (
                    <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800 bg-slate-950">
                      {repuestosSeleccionados.map((item) => (
                        <div key={item.partNumber} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-blue-400 font-bold mr-2">[{item.partNumber}]</span>
                            <span className="text-slate-200">{item.descripcion}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                              x{item.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEliminarRepuesto(item.partNumber)}
                              className="text-rose-400 hover:text-rose-300 p-1"
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
                <div className="pt-2 border-t border-slate-800">
                  <Label className="text-xs text-slate-300">Requerimiento de Servicio o Mantenimiento *</Label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Mantenimiento general, limpieza de sistema térmico y formateo lógico..."
                    value={solucionPropuesta}
                    onChange={(e) => setSolucionPropuesta(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                  />
                </div>
              )}
            </div>

          </div>

          <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/40">
            <Button variant="ghost" onClick={() => setModalDiagnostico(false)} className="text-slate-400 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleGuardarDiagnostico} 
              disabled={actualizando} 
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              {actualizando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Guardar y Emitir Informe de Diagnóstico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DECISIÓN CLIENTE: APROBACIÓN DE PROPUESTA */}
      {/* ========================================================================= */}
      <Dialog open={modalDecisionAprobacion} onOpenChange={setModalDecisionAprobacion}>
        <DialogContent className="sm:max-w-[500px] bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
              <ThumbsUp className="w-5 h-5" />
              Registrar Conformidad y Aprobación del Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Al registrar la aprobación, el estado pasará a <strong>APROBADO_PARA_REPARACION</strong> y se habilitará la Etapa 3 (Intervención y Reparación).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-xs">
            <div>
              <Label className="text-xs text-slate-300">Registrado por (Operador/Mesa)</Label>
              <Input
                value={operadorAprobacion}
                onChange={(e) => setOperadorAprobacion(e.target.value)}
                className="mt-1 bg-slate-950 border-slate-700 text-xs"
              />
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[11px]">
              El cliente confirma la ejecución de los trabajos y el reemplazo de piezas homologadas según el Informe de Diagnóstico.
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalDecisionAprobacion(false)} className="text-slate-400 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleAprobarPropuesta} 
              disabled={actualizando} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmar Aprobación (Avanzar a Etapa 3)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DECISIÓN CLIENTE: RECHAZO DE PROPUESTA */}
      {/* ========================================================================= */}
      <Dialog open={modalDecisionRechazo} onOpenChange={setModalDecisionRechazo}>
        <DialogContent className="sm:max-w-[500px] bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-400">
              <ThumbsDown className="w-5 h-5" />
              Registrar Rechazo de Propuesta Comercial
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              El cliente rechaza el presupuesto o intervención. Se actualizará el estado a <strong>CERRADO_SIN_REPARACION</strong> y se emitirá el Acta de Devolución liberando la serie.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-xs">
            <div>
              <Label className="text-xs text-slate-300">Motivo del Rechazo *</Label>
              <textarea
                rows={3}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej. Costo de repuesto excede presupuesto del cliente..."
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                required
              />
            </div>
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300 text-[11px]">
              Al confirmar, el ticket se cierra definitivamente sin pasar a intervención.
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalDecisionRechazo(false)} className="text-slate-400 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleRechazarPropuesta} 
              disabled={actualizando} 
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmar Rechazo y Cerrar Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL ASIGNAR TÉCNICO FORMAL E INICIAR ETAPA 3 */}
      {/* ========================================================================= */}
      <Dialog open={modalAsignarIntervencion} onOpenChange={setModalAsignarIntervencion}>
        <DialogContent className="sm:max-w-[500px] bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-purple-400">
              <Wrench className="w-5 h-5" />
              Asignar Técnico Ejecutor Formal
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Paso formal de inicio de la <strong>ETAPA 3: Intervención y Reparación</strong>. Estado pasará a <strong>EN_REPARACION</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-xs">
            <div>
              <Label className="text-xs text-slate-300">Técnico Ejecutor Asignado *</Label>
              <select
                value={tecnicoAsignado}
                onChange={(e) => setTecnicoAsignado(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
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
            <Button variant="ghost" onClick={() => setModalAsignarIntervencion(false)} className="text-slate-400 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleIniciarReparacionFormal} 
              disabled={actualizando} 
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
            >
              {actualizando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Iniciar Intervención (EN_REPARACION)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL CIERRE DE INTERVENCIÓN Y QA (ETAPA 3) */}
      {/* ========================================================================= */}
      <Dialog open={modalCierreIntervencion} onOpenChange={setModalCierreIntervencion}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
          <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/60">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Wrench className="w-4 h-4" />
                </span>
                Cierre de Intervención Técnica y Control de Calidad (QA)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Documentar actividades, horas-hombre, pruebas de operatividad y firma digital.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-300">Técnico Ejecutor</Label>
                <Input
                  value={tecnicoAsignado}
                  disabled
                  className="mt-1 bg-slate-900 border-slate-800 text-sm text-slate-400 font-medium"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Horas-Hombre Invertidas (H-H) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={horasHombre}
                  onChange={(e) => setHorasHombre(parseFloat(e.target.value) || 1)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Actividades Realizadas y Observaciones Técnicas *</Label>
              <textarea
                rows={3}
                placeholder="Detalle el cambio de piezas, configuración técnica, pruebas térmicas..."
                value={actividades}
                onChange={(e) => setActividades(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            {/* QA Selector */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <Label className="text-xs font-semibold text-slate-200 block">
                ¿Superó exitosamente las pruebas de operatividad (QA)?
              </Label>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSuperoQA(true)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                    superoQA 
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 shadow-sm' 
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    SÍ — Pruebas Superadas (REPARADO)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">El equipo opera al 100% de especificación.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSuperoQA(false)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                    !superoQA 
                      ? 'bg-rose-950/30 border-rose-500/50 text-rose-300 shadow-sm' 
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    NO — Falla Persistente
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Equipo irreparable o re-evaluación.</p>
                </button>
              </div>

              {!superoQA && (
                <div className="p-3 bg-slate-950 rounded-xl border border-rose-500/30 space-y-2 animate-in fade-in-50">
                  <Label className="text-xs text-rose-300 font-semibold">
                    ¿El equipo es irreparable o costo inviable?
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoNoAprobado('OBSERVADO')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold ${
                        tipoNoAprobado === 'OBSERVADO'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      NO — Marcar OBSERVADO (Re-evaluación)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoNoAprobado('INOPERATIVO')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold ${
                        tipoNoAprobado === 'INOPERATIVO'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      SÍ — Marcar INOPERATIVO
                    </button>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-slate-400">Observaciones de Control de Calidad</Label>
                <Input
                  placeholder="Detalle encendido, estrés, periféricos, audio, puertos..."
                  value={observacionesQA}
                  onChange={(e) => setObservacionesQA(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-xs"
                />
              </div>
            </div>

            {/* Firma digital técnica */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-200">
                  Firma Digital del Técnico Responsable
                </Label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Limpiar Trazo
                </button>
              </div>

              <div className="border border-slate-700 rounded-xl bg-slate-950 overflow-hidden flex justify-center">
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

          <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/40">
            <Button variant="ghost" onClick={() => setModalCierreIntervencion(false)} className="text-slate-400 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleFinalizarIntervencion} 
              disabled={actualizando} 
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
            >
              {actualizando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Persistir Cierre Técnico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL ETAPA 4: ENTREGA Y EMISIÓN DE INFORME TÉCNICO FINAL */}
      {/* ========================================================================= */}
      <Dialog open={modalEntrega} onOpenChange={setModalEntrega}>
        <DialogContent className="sm:max-w-[600px] flex flex-col bg-slate-950 border border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
          <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/60">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                ETAPA 4: Cierre Formal y Emisión de Informe Técnico
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Registrar datos de entrega, conformidad del cliente y emitir el <strong>Informe Técnico</strong> final en PDF.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-300">Fecha de Entrega *</Label>
                <Input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Lugar de Entrega *</Label>
                <Input
                  value={lugarEntrega}
                  onChange={(e) => setLugarEntrega(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Nombre del Receptor / Cliente *</Label>
                <Input
                  placeholder="Persona que recibe el equipo"
                  value={receptorNombre}
                  onChange={(e) => setReceptorNombre(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">DNI / RUC del Receptor *</Label>
                <Input
                  placeholder="Documento de identidad"
                  value={receptorDni}
                  onChange={(e) => setReceptorDni(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Observaciones de Entrega</Label>
              <textarea
                rows={2}
                placeholder="Ej. Equipo verificado en operatividad y encendido delante del receptor."
                value={observacionesFinales}
                onChange={(e) => setObservacionesFinales(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
              />
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
              Al confirmar, el estado cambiará a <strong>ENTREGADO</strong> y se descargará automáticamente el <strong>Informe Técnico final en PDF</strong>.
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/40">
            <Button variant="ghost" onClick={() => setModalEntrega(false)} className="text-slate-400 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarEntrega} 
              disabled={actualizando} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              {actualizando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmar Entrega y Descargar Informe Técnico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
