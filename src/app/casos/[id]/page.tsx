"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  getCasoByCodigo, 
  suscribirCaso,
  registrarNuevaIncidencia,
  registrarAtencionSimple,
  registrarDiagnosticoTecnico,
  registrarDecisionPropuestaTecnica,
  generarOrdenServicioTrabajo,
  registrarPruebasQAyFinalizarOS,
  registrarEntregaYActivarGarantia,
  firmarLiquidacionYCerrarCaso
} from "@/services/casoService"
import { getRepuestosCatalogo } from "@/services/repuestoService"
import { getUsuariosSistema } from "@/services/usuarioService"
import { 
  Caso, 
  IncidenciaCaso, 
  DiagnosticoTecnicoCaso, 
  OrdenServicioTrabajo, 
  ConstanciaAtencionSimple, 
  PrioridadIncidencia, 
  OrigenIncidencia, 
  TipoOrdenServicio, 
  RepuestoCatalogo, 
  RepuestoItem, 
  UsuarioSistema,
  EstadoCaso 
} from "@/types"
import { generarConstanciaAtencionPDF } from "@/lib/pdf/ConstanciaAtencionPDF"
import { generarInformeTecnicoCasoPDF } from "@/lib/pdf/InformeTecnicoCasoPDF"
import { CasoStateBadge } from "@/components/casos/CasoStateBadge"
import { MurLogo } from "@/components/brand/MurLogo"
import { UserMenu } from "@/components/auth/UserMenu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Laptop, 
  ShieldCheck, 
  Wrench, 
  AlertCircle, 
  Plus, 
  Download, 
  Check, 
  X, 
  FolderOpen, 
  RefreshCw,
  Building2,
  Calendar,
  UserCheck,
  Award,
  Lock,
  ThumbsUp,
  ThumbsDown,
  PenTool,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@/context/AuthContext"

export default function ExpedienteCasoPage() {
  const params = useParams()
  const router = useRouter()
  const { perfil, user } = useAuth()
  const codigo = String(params?.id || "")

  const [caso, setCaso] = useState<Caso | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"etapa1" | "etapa2" | "etapa3" | "etapa4" | "historial">("etapa2")

  // Catálogos
  const [repuestosCatalogo, setRepuestosCatalogo] = useState<RepuestoCatalogo[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])

  // Operador
  const operadorNombre = perfil?.nombreCompleto || user?.displayName || "Técnico Especialista"

  // Estado de Modales
  const [modalIncidenciaOpen, setModalIncidenciaOpen] = useState(false)
  const [modalAtencionSimpleOpen, setModalAtencionSimpleOpen] = useState(false)
  const [modalDiagnosticoOpen, setModalDiagnosticoOpen] = useState(false)
  const [modalDecisionDTOpen, setModalDecisionDTOpen] = useState(false)
  const [selectedDTForDecision, setSelectedDTForDecision] = useState<DiagnosticoTecnicoCaso | null>(null)
  const [modalOSOpen, setModalOSOpen] = useState(false)
  const [modalQAOpen, setModalQAOpen] = useState(false)
  const [selectedOSForQA, setSelectedOSForQA] = useState<OrdenServicioTrabajo | null>(null)
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false)
  const [modalCierreOpen, setModalCierreOpen] = useState(false)

  // Formulario: Nueva Incidencia
  const [nuevaIncFalla, setNuevaIncFalla] = useState("")
  const [nuevaIncPrioridad, setNuevaIncPrioridad] = useState<PrioridadIncidencia>("MEDIA")
  const [nuevaIncOrigen, setNuevaIncOrigen] = useState<OrigenIncidencia>("TALLER")
  const [nuevaIncRequiereDT, setNuevaIncRequiereDT] = useState(true)
  const [nuevaIncEsGarantia, setNuevaIncEsGarantia] = useState(false)

  // Formulario: Atención Simple (Constancia)
  const [constanciaTicketItop, setConstanciaTicketItop] = useState("")
  const [constanciaActividades, setConstanciaActividades] = useState("Limpieza interna, remoción de polvo, optimización y pruebas de operatividad.")
  const [constanciaResultado, setConstanciaResultado] = useState("Equipo operativo a plena satisfacción.")
  const [constanciaTecnico, setConstanciaTecnico] = useState("")

  // Formulario: Diagnóstico Técnico (DT)
  const [dtTipoFalla, setDtTipoFalla] = useState<"HARDWARE" | "SOFTWARE" | "OPERATIVO">("HARDWARE")
  const [dtHallazgos, setDtHallazgos] = useState("")
  const [dtDetalle, setDtDetalle] = useState("")
  const [dtDanosFisicos, setDtDanosFisicos] = useState("")
  const [dtRequiereRepuestos, setDtRequiereRepuestos] = useState(false)
  const [dtRepuestosSeleccionados, setDtRepuestosSeleccionados] = useState<RepuestoItem[]>([])
  const [dtRecomendaciones, setDtRecomendaciones] = useState("")
  const [dtTecnico, setDtTecnico] = useState("")

  // Formulario: Decisión Propuesta Técnica y Generación de OS
  const [decisionAprobado, setDecisionAprobado] = useState(true)
  const [decisionMotivoRechazo, setDecisionMotivoRechazo] = useState("")
  const [generarOSAlAprobar, setGenerarOSAlAprobar] = useState(true)
  const [modoCodigoOSDecision, setModoCodigoOSDecision] = useState<"AUTO" | "MANUAL">("AUTO")
  const [codigoOSManualDecision, setCodigoOSManualDecision] = useState("")
  const [osTipoDecision, setOsTipoDecision] = useState<TipoOrdenServicio>("CORRECTIVA")
  const [osTecnicoDecision, setOsTecnicoDecision] = useState("")
  const [osActividadesDecision, setOsActividadesDecision] = useState("")
  const [osHorasDecision, setOsHorasDecision] = useState(2)

  // Formulario: Orden de Servicio (OS en Fase 3)
  const [modoCodigoOS, setModoCodigoOS] = useState<"AUTO" | "MANUAL">("AUTO")
  const [codigoOSManual, setCodigoOSManual] = useState("")
  const [osTipo, setOsTipo] = useState<TipoOrdenServicio>("CORRECTIVA")
  const [osTecnico, setOsTecnico] = useState("")
  const [osActividades, setOsActividades] = useState("")
  const [osHorasEstimadas, setOsHorasEstimadas] = useState(2)

  // Formulario: QA y Cierre OS
  const [qaSupero, setQaSupero] = useState(true)
  const [qaObservaciones, setQaObservaciones] = useState("Pruebas de estrés superadas sin incidencias térmicas ni operativas.")
  const [qaHorasReales, setQaHorasReales] = useState(2)

  // Formulario: Entrega y Garantía
  const [entregaReceptor, setEntregaReceptor] = useState("")
  const [entregaDni, setEntregaDni] = useState("")
  const [entregaAplicaGarantia, setEntregaAplicaGarantia] = useState(true)
  const [entregaDiasGarantia, setEntregaDiasGarantia] = useState(30)
  const [entregaObservaciones, setEntregaObservaciones] = useState("Equipo entregado probado en presencia del cliente.")

  // Formulario: Cierre Definitivo
  const [cierreObservaciones, setCierreObservaciones] = useState("Liquidación técnica final aprobada. Conformidad total de servicio.")

  // Carga inicial y reactiva
  useEffect(() => {
    if (!codigo) return
    setLoading(true)

    getCasoByCodigo(codigo)
      .then(data => {
        setCaso(data)
        if (data) {
          setEntregaReceptor(data.cliente.contacto || "")
          setEntregaDni(data.cliente.ruc || "")
          if (data.garantia?.activa) setNuevaIncEsGarantia(true)
          if (['ABIERTO', 'EN_DIAGNOSTICO', 'PENDIENTE_DE_APROBACION'].includes(data.estado)) {
            setActiveTab("etapa2")
          } else if (['EN_REPARACION', 'EN_PRUEBAS'].includes(data.estado)) {
            setActiveTab("etapa3")
          } else if (['REPARADO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(data.estado)) {
            setActiveTab("etapa4")
          }
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        toast.error("Error al cargar el caso.")
        setLoading(false)
      })

    const desuscribir = suscribirCaso(codigo, (data) => {
      if (data) setCaso(data)
    })

    getRepuestosCatalogo().then(setRepuestosCatalogo).catch(console.error)
    getUsuariosSistema().then(setUsuarios).catch(console.error)

    return () => {
      if (typeof desuscribir === "function") desuscribir()
    }
  }, [codigo])

  useEffect(() => {
    if (operadorNombre) {
      setConstanciaTecnico(operadorNombre)
      setDtTecnico(operadorNombre)
      setOsTecnico(operadorNombre)
      setOsTecnicoDecision(operadorNombre)
    }
  }, [operadorNombre])

  // Handlers para cada acción
  const handleGuardarNuevaIncidencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaIncFalla.trim()) {
      toast.error("Ingresa la descripción de la falla.")
      return
    }
    try {
      await registrarNuevaIncidencia(codigo, {
        descripcion: nuevaIncFalla,
        prioridad: nuevaIncPrioridad,
        reportadoPor: caso?.cliente.contacto || caso?.cliente.razonSocial || "Cliente",
        origen: nuevaIncOrigen,
        requiereAnalisisTecnico: nuevaIncRequiereDT,
        esReingresoGarantia: nuevaIncEsGarantia,
        autor: operadorNombre
      })
      toast.success("Nueva incidencia registrada en el expediente.")
      setModalIncidenciaOpen(false)
      setNuevaIncFalla("")
    } catch (err: any) {
      toast.error(err.message || "Error al registrar incidencia.")
    }
  }

  const handleGuardarAtencionSimple = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!constanciaActividades.trim() || !constanciaResultado.trim()) {
      toast.error("Complete las actividades realizadas y el resultado técnico.")
      return
    }
    if (!constanciaTicketItop.trim()) {
      toast.error("Por favor ingrese el número o código de Ticket de iTop asistido.")
      return
    }
    try {
      const motivoDesdeIngreso = ultimaInc?.descripcion || primeraInc?.descripcion || "Soporte menor / mantenimiento preventivo"
      const res = await registrarAtencionSimple(codigo, {
        motivoSoporte: motivoDesdeIngreso,
        actividadesRealizadas: constanciaActividades.trim(),
        resultado: constanciaResultado.trim(),
        ticketItop: constanciaTicketItop.trim().toUpperCase(),
        tecnicoResponsable: constanciaTecnico || operadorNombre
      })
      toast.success(`Constancia ${res.codigoConstancia} generada con éxito.`)
      setModalAtencionSimpleOpen(false)
      if (caso) generarConstanciaAtencionPDF(caso, res)
    } catch (err: any) {
      toast.error(err.message || "Error al registrar atención simple.")
    }
  }

  const handleGuardarDiagnostico = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dtHallazgos.trim() || !dtDetalle.trim()) {
      toast.error("Completa la causa raíz y el diagnóstico detallado.")
      return
    }
    try {
      const nuevoDt = await registrarDiagnosticoTecnico(codigo, {
        tecnicoResponsable: dtTecnico || operadorNombre,
        tipoFalla: dtTipoFalla,
        hallazgos: dtHallazgos,
        diagnosticoDetallado: dtDetalle,
        danosFisicos: dtDanosFisicos,
        requiereRepuestos: dtRequiereRepuestos,
        repuestosRequeridos: dtRepuestosSeleccionados,
        recomendaciones: dtRecomendaciones,
        solucionPropuesta: dtRecomendaciones
      })
      toast.success(`Diagnóstico ${nuevoDt.codigoDT} registrado en expediente.`)
      setModalDiagnosticoOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Error al registrar diagnóstico.")
    }
  }

  const handleGuardarDecisionDT = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDTForDecision) return

    if (!decisionAprobado && !decisionMotivoRechazo.trim()) {
      toast.error("Por favor indique el motivo del rechazo.")
      return
    }

    if (decisionAprobado && generarOSAlAprobar) {
      if (modoCodigoOSDecision === "MANUAL" && !codigoOSManualDecision.trim()) {
        toast.error("Por favor digite el código de Orden de Servicio oficial / externo.")
        return
      }
      if (!osActividadesDecision.trim()) {
        toast.error("Por favor describa las actividades a realizar en la Orden de Servicio.")
        return
      }
    }

    try {
      const nuevaOS = await registrarDecisionPropuestaTecnica(
        codigo,
        selectedDTForDecision.id,
        decisionAprobado,
        decisionAprobado ? undefined : decisionMotivoRechazo,
        operadorNombre,
        (decisionAprobado && generarOSAlAprobar) ? {
          codigoOSManual: modoCodigoOSDecision === "MANUAL" ? codigoOSManualDecision.trim().toUpperCase() : undefined,
          tipo: osTipoDecision,
          tecnicoAsignado: osTecnicoDecision || operadorNombre,
          actividades: osActividadesDecision.trim(),
          horasHombreEstimadas: Number(osHorasDecision) || 1
        } : undefined
      )

      if (decisionAprobado) {
        if (nuevaOS) {
          toast.success(`Propuesta aprobada y Orden de Servicio ${nuevaOS.codigoOS} aperturada con éxito. Caso en Reparación.`)
        } else {
          toast.success("Propuesta técnica aprobada. Habilitado para generar Orden de Servicio.")
        }
      } else {
        toast.info("Rechazo registrado. Expediente cerrado sin reparación.")
      }

      setModalDecisionDTOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Error al registrar decisión.")
    }
  }

  const handleGuardarOS = async (e: React.FormEvent) => {
    e.preventDefault()
    if (modoCodigoOS === "MANUAL" && !codigoOSManual.trim()) {
      toast.error("Por favor digite el código de Orden de Servicio oficial / externo.")
      return
    }
    if (!osActividades.trim()) {
      toast.error("Ingresa las actividades a ejecutar.")
      return
    }
    try {
      const nuevaOs = await generarOrdenServicioTrabajo(codigo, {
        codigoOSManual: modoCodigoOS === "MANUAL" ? codigoOSManual.trim().toUpperCase() : undefined,
        tipo: osTipo,
        tecnicoAsignado: osTecnico || operadorNombre,
        actividades: osActividades,
        horasHombreEstimadas: Number(osHorasEstimadas) || 1,
        autor: operadorNombre
      })
      toast.success(`Orden de Servicio ${nuevaOs.codigoOS} generada. Caso en Reparación.`)
      setModalOSOpen(false)
      setCodigoOSManual("")
      setModoCodigoOS("AUTO")
    } catch (err: any) {
      toast.error(err.message || "Error al generar orden de trabajo.")
    }
  }

  const handleGuardarQA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOSForQA) return
    try {
      await registrarPruebasQAyFinalizarOS(codigo, selectedOSForQA.id, {
        superoQA: qaSupero,
        observacionesQA: qaObservaciones,
        horasHombreReales: Number(qaHorasReales) || 1,
        tecnico: operadorNombre
      })
      toast.success("Control de calidad registrado y OS completada.")
      setModalQAOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Error al registrar QA.")
    }
  }

  const handleGuardarEntrega = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entregaReceptor.trim()) {
      toast.error("Ingresa el nombre del receptor.")
      return
    }
    try {
      await registrarEntregaYActivarGarantia(codigo, {
        receptorNombre: entregaReceptor,
        receptorDniRuc: entregaDni,
        aplicaGarantia: entregaAplicaGarantia,
        diasGarantia: Number(entregaDiasGarantia) || 30,
        observaciones: entregaObservaciones,
        responsableEntrega: operadorNombre
      })

      const nuevoEstado: EstadoCaso = entregaAplicaGarantia ? "EN_GARANTIA" : "ENTREGADO"
      const casoActualizado: Caso = {
        ...(caso as Caso),
        estado: nuevoEstado,
        entrega: {
          fechaEntrega: new Date().toISOString(),
          receptorNombre: entregaReceptor.trim(),
          receptorDniRuc: entregaDni.trim(),
          observaciones: entregaObservaciones.trim(),
          responsableEntrega: operadorNombre
        }
      }

      toast.success(
        entregaAplicaGarantia 
          ? "Equipo entregado y garantía técnica activada con éxito." 
          : "Equipo entregado a satisfacción del cliente."
      )
      setModalEntregaOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Error al registrar entrega.")
    }
  }

  const handleCerrarCasoDefinitivo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await firmarLiquidacionYCerrarCaso(codigo, {
        firmadoPor: operadorNombre,
        observaciones: cierreObservaciones
      })
      toast.success("Expediente liquidado y cerrado definitivamente.")
      setModalCierreOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Error al cerrar caso.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#2369A1]" />
        <span className="text-xs text-slate-500 font-medium">Cargando expediente {codigo}...</span>
      </div>
    )
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Expediente no encontrado</h2>
        <p className="text-xs text-slate-500">No existe el caso con código {codigo}.</p>
        <Button onClick={() => router.push('/casos')} className="bg-[#2369A1] text-xs">
          Volver a Expedientes
        </Button>
      </div>
    )
  }

  const ultimoDT = caso.diagnosticos?.[caso.diagnosticos.length - 1]
  const ultimaOS = caso.ordenesServicio?.[caso.ordenesServicio.length - 1]
  const primeraInc = caso.incidencias?.[0]
  const ultimaInc = caso.incidencias?.[caso.incidencias.length - 1] || primeraInc
  const ultimaConstancia = caso.constancias?.[caso.constancias.length - 1]

  const estadoNorm = (caso.estado || "")
    .trim()
    .replace(/ /g, "_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()

  // Bifurcación clave del Flujo de Negocio:
  // Si la última incidencia no requiere análisis técnico O si ya se emitió una constancia simple sin DT previo:
  const requiereAnalisisTecnico = ultimaInc?.requiereAnalisisTecnico ?? true
  const tieneConstancia = Boolean(ultimaConstancia)
  const esRutaSimple = !requiereAnalisisTecnico || (tieneConstancia && !ultimoDT)

  const etapas = [
    { 
      num: 1, 
      label: "Ingreso / Incidencia", 
      sub: caso.origen === "ALQUILER" ? "Alquiler Corp." : "Recepción",
      activo: false, 
      completo: true 
    },
    { 
      num: 2, 
      label: esRutaSimple ? "2.A Atención Simple" : "2.B Diagnóstico Técnico", 
      sub: esRutaSimple 
        ? (tieneConstancia ? `Constancia ${ultimaConstancia.codigoConstancia}` : 'Requiere Constancia')
        : (ultimoDT ? (ultimoDT.estado === 'APROBADO' ? 'Aprobado' : ultimoDT.estado === 'RECHAZADO' ? 'Rechazado' : 'Por Autorizar') : 'Pendiente DT'),
      activo: esRutaSimple 
        ? !tieneConstancia 
        : ['ABIERTO', 'EN_DIAGNOSTICO', 'PENDIENTE_DE_APROBACION'].includes(estadoNorm),
      completo: esRutaSimple 
        ? tieneConstancia 
        : (['EN_REPARACION', 'EN_PRUEBAS', 'REPARADO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(estadoNorm) || Boolean(ultimoDT?.estado === 'APROBADO'))
    },
    { 
      num: 3, 
      label: "3. Intervención & QA", 
      sub: esRutaSimple ? 'Omitido (No aplica a 2.A)' : (ultimaOS ? (ultimaOS.estado === 'FINALIZADA' ? 'QA Conforme' : 'En Taller') : 'Bloqueado'),
      activo: !esRutaSimple && ['EN_REPARACION', 'EN_PRUEBAS'].includes(estadoNorm),
      completo: esRutaSimple ? tieneConstancia : ['REPARADO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)
    },
    { 
      num: 4, 
      label: "4. Entrega y Cierre", 
      sub: ['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm) 
        ? 'Finalizado' 
        : (estadoNorm === 'REPARADO' || (tieneConstancia && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)))
        ? 'Listo para Entrega' 
        : (esRutaSimple ? 'Esperando Constancia' : 'Bloqueado'),
      activo: estadoNorm === 'REPARADO' || (tieneConstancia && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)),
      completo: ['ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(estadoNorm)
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Top Bar Superior */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/casos')} 
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
              title="Volver a lista de Casos"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <MurLogo size="sm" showSubtitle={false} />
            <span className="text-slate-300">/</span>
            <span className="font-mono text-sm font-bold text-[#2369A1]">
              {caso.codigoCaso}
            </span>
            <CasoStateBadge estado={caso.estado} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Descarga: Informe Diagnóstico (si existe DT) */}
            {ultimoDT && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generarInformeTecnicoCasoPDF(caso, ultimoDT)}
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-8 gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#2369A1]" />
                Informe DT (PDF)
              </Button>
            )}

            {/* Descarga: Constancia de Atención (si existe atención simple en 2A) */}
            {ultimaConstancia && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generarConstanciaAtencionPDF(caso, ultimaConstancia)}
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-8 gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                Constancia (PDF)
              </Button>
            )}

            {/* Botón de Acción Guiada según la Ruta (2.A Simple vs 2.B DT) */}
            {esRutaSimple ? (
              <>
                {!tieneConstancia && (
                  <Button
                    size="sm"
                    onClick={() => setModalAtencionSimpleOpen(true)}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Registrar Atención Simple (2.A)
                  </Button>
                )}
                {tieneConstancia && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm) && (
                  <Button
                    size="sm"
                    onClick={() => setModalEntregaOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Registrar Entrega de Equipo
                  </Button>
                )}
              </>
            ) : (
              <>
                {['ABIERTO', 'EN_DIAGNOSTICO'].includes(caso.estado) && !ultimoDT && !ultimaConstancia && (
                  <Button
                    size="sm"
                    onClick={() => setModalDiagnosticoOpen(true)}
                    className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    Registrar Diagnóstico (DT)
                  </Button>
                )}

                {ultimoDT && ultimoDT.estado !== 'APROBADO' && ultimoDT.estado !== 'RECHAZADO' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedDTForDecision(ultimoDT)
                      setDecisionAprobado(true)
                      setGenerarOSAlAprobar(true)
                      setModoCodigoOSDecision("AUTO")
                      setCodigoOSManualDecision("")
                      setOsActividadesDecision(ultimoDT.solucionPropuesta || ultimoDT.recomendaciones || `Ejecución de trabajos según diagnóstico ${ultimoDT.codigoDT}`)
                      setOsTipoDecision("CORRECTIVA")
                      setOsTecnicoDecision(operadorNombre)
                      setOsHorasDecision(2)
                      setModalDecisionDTOpen(true)
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Decisión Cliente / OS
                  </Button>
                )}

                {caso.estado === 'EN_REPARACION' && !ultimaOS && (
                  <Button
                    size="sm"
                    onClick={() => setModalOSOpen(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Iniciar Orden de Trabajo (OS)
                  </Button>
                )}

                {ultimaOS && ultimaOS.estado !== 'FINALIZADA' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedOSForQA(ultimaOS)
                      setModalQAOpen(true)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Registrar QA y Finalizar OS
                  </Button>
                )}

                {caso.estado === 'REPARADO' && (
                  <Button
                    size="sm"
                    onClick={() => setModalEntregaOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Registrar Entrega de Equipo
                  </Button>
                )}
              </>
            )}

            {caso.garantia?.activa && (
              <Button
                size="sm"
                onClick={() => {
                  setNuevaIncEsGarantia(true)
                  setNuevaIncOrigen("RECLAMO_GARANTIA")
                  setModalIncidenciaOpen(true)
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Reingreso Garantía
              </Button>
            )}

            <div className="border-l border-slate-200 pl-2">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">

        {/* Stepper de las 4 Etapas Lineales y Guiadas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {etapas.map((etapa) => {
              const tabTarget = etapa.num === 1 ? "etapa1" : etapa.num === 2 ? "etapa2" : etapa.num === 3 ? "etapa3" : "etapa4"
              const isSelected = activeTab === tabTarget
              return (
                <button
                  key={etapa.num}
                  type="button"
                  onClick={() => setActiveTab(tabTarget as any)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 w-full cursor-pointer ${
                    isSelected 
                      ? 'ring-2 ring-[#2369A1] shadow-xs' 
                      : 'hover:border-slate-300'
                  } ${
                    etapa.completo 
                      ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900' 
                      : etapa.activo 
                      ? 'bg-blue-50/60 border-blue-200 text-[#2369A1]' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    etapa.completo 
                      ? 'bg-emerald-600 text-white' 
                      : etapa.activo 
                      ? 'bg-[#2369A1] text-white shadow-xs' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {etapa.completo ? <CheckCircle2 className="w-4 h-4" /> : etapa.num}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Etapa {etapa.num}
                      </span>
                      {etapa.completo && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Listo
                        </span>
                      )}
                      {etapa.activo && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded animate-pulse">
                          En Curso
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{etapa.label}</p>
                    <p className="text-[11px] text-slate-500 truncate">{etapa.sub}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Guía Operativa / Alerta de Acción Siguiente */}
        {esRutaSimple ? (
          <>
            {!tieneConstancia && (
              <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-600" />
                    Etapa 2.A: Atención Simple en Campo (Sin Diagnóstico Formal)
                  </h3>
                  <p className="text-xs text-teal-800">
                    Este caso no requiere análisis técnico ni descarte formal de laboratorio. Registre las actividades de soporte menor y emita la Constancia de Atención para pasar a la Entrega y Cierre (Etapa 4).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setModalAtencionSimpleOpen(true)}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Registrar Atención Simple (2.A)
                  </Button>
                </div>
              </div>
            )}

            {tieneConstancia && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm) && (
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Atención Simple Concluida — Listo para Entrega y Cierre (Etapa 4)
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Constancia {ultimaConstancia.codigoConstancia} registrada con éxito. La Etapa 3 (Taller) se ha omitido. Proceda con la entrega del equipo al cliente.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setModalEntregaOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Registrar Entrega de Equipo
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {['ABIERTO', 'EN_DIAGNOSTICO'].includes(caso.estado) && !ultimoDT && !ultimaConstancia && (
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#2369A1]" />
                    Etapa 2 Pendiente: Requiere Evaluación Técnica
                  </h3>
                  <p className="text-xs text-blue-700">
                    El equipo requiere análisis técnico formal en laboratorio. Registre el diagnóstico formal (DT) para determinar causa raíz y cotización.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setModalDiagnosticoOpen(true)}
                    className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold shadow-xs"
                  >
                    <PenTool className="w-3.5 h-3.5 mr-1" />
                    Registrar Diagnóstico (DT)
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {ultimoDT && ultimoDT.estado !== 'APROBADO' && ultimoDT.estado !== 'RECHAZADO' && (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Diagnóstico {ultimoDT.codigoDT} Emitido — Esperando Decisión del Cliente
              </h3>
              <p className="text-xs text-amber-700">
                La propuesta técnica preliminar está lista. Presente el informe al cliente para autorizar el paso a taller (Etapa 3).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generarInformeTecnicoCasoPDF(caso, ultimoDT)}
                className="text-xs bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-[#2369A1]" />
                Descargar Informe DT
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedDTForDecision(ultimoDT)
                  setDecisionAprobado(true)
                  setGenerarOSAlAprobar(true)
                  setModoCodigoOSDecision("AUTO")
                  setCodigoOSManualDecision("")
                  setOsActividadesDecision(ultimoDT.solucionPropuesta || ultimoDT.recomendaciones || `Ejecución de trabajos según diagnóstico ${ultimoDT.codigoDT}`)
                  setOsTipoDecision("CORRECTIVA")
                  setOsTecnicoDecision(operadorNombre)
                  setOsHorasDecision(2)
                  setModalDecisionDTOpen(true)
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
              >
                <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                Registrar Decisión Cliente
              </Button>
            </div>
          </div>
        )}

        {caso.estado === 'EN_REPARACION' && !ultimaOS && (
          <div className="p-4 rounded-xl bg-violet-50/80 border border-violet-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-violet-600" />
                Diagnóstico Aprobado — Requiere Orden de Trabajo (OS)
              </h3>
              <p className="text-xs text-violet-700">
                El cliente ha autorizado la intervención. Inicie la Orden de Servicio de taller para asignar al técnico responsable.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setModalOSOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs shrink-0"
            >
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Generar Orden de Trabajo (OS)
            </Button>
          </div>
        )}

        {ultimaOS && ultimaOS.estado !== 'FINALIZADA' && (
          <div className="p-4 rounded-xl bg-violet-50/80 border border-violet-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-violet-600" />
                Intervención en Progreso — OS {ultimaOS.codigoOS} ({ultimaOS.tecnicoAsignado})
              </h3>
              <p className="text-xs text-violet-700">
                Al concluir los trabajos físicos en el activo, registre el Control de Calidad (QA) para habilitar la entrega.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSelectedOSForQA(ultimaOS)
                setModalQAOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shrink-0"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Registrar QA y Finalizar OS
            </Button>
          </div>
        )}

        {caso.estado === 'REPARADO' && (
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Equipo Reparado y QA Conforme — Listo para Entrega
              </h3>
              <p className="text-xs text-emerald-700">
                Intervención concluida con éxito. Proceda a registrar la entrega formal del activo al cliente.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setModalEntregaOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Registrar Entrega de Equipo
            </Button>
          </div>
        )}

        {['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(caso.estado) && (
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Equipo Entregado a Conformidad
              </h3>
              <p className="text-xs text-emerald-700">
                {caso.entrega 
                  ? `Recibido por ${caso.entrega.receptorNombre} el ${format(new Date(caso.entrega.fechaEntrega), "dd/MM/yyyy HH:mm")}.`
                  : `Expediente en estado ${caso.estado}.`}
                {caso.garantia?.activa && ` Garantía técnica activa por ${caso.garantia.diasGarantia} días.`}
              </p>
            </div>
            {caso.estado !== "CERRADO" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalCierreOpen(true)}
                className="text-xs border-emerald-300 text-slate-700 bg-white hover:bg-slate-50 shrink-0"
              >
                Cerrar Expediente
              </Button>
            )}
          </div>
        )}

        {/* Estructura Principal a 2 Columnas: Datos Clave a la Izquierda y Flujo Guiado a la Derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Columna Izquierda: Información de Cliente, Activo y Cobertura */}
          <div className="space-y-5">

            {/* Datos del Cliente */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#2369A1]" />
                  Datos del Cliente
                </span>
                <span className="text-[11px] font-mono font-bold text-[#2369A1] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  RUC: {caso.cliente.ruc}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <p><strong className="text-slate-900 font-semibold">Razón Social:</strong> {caso.cliente.razonSocial}</p>
                <p><strong className="text-slate-900 font-semibold">Contacto:</strong> {caso.cliente.contacto || "No registrado"}</p>
                <p><strong className="text-slate-900 font-semibold">Teléfono:</strong> {caso.cliente.telefono || "No registrado"}</p>
                <p><strong className="text-slate-900 font-semibold">Correo:</strong> {caso.cliente.correo || "No registrado"}</p>
              </div>
            </div>

            {/* Datos del Activo */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-[#2369A1]" />
                  Activo en Expediente
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  caso.origen === "ALQUILER" ? "bg-purple-50 text-purple-700 border-purple-200" :
                  caso.origen === "RECLAMO_GARANTIA" ? "bg-amber-50 text-amber-800 border-amber-300" :
                  "bg-blue-50 text-[#2369A1] border-blue-200"
                }`}>
                  {caso.origen}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <p><strong className="text-slate-900 font-semibold">Tipo:</strong> {caso.equipo.tipoEquipo || "Laptop"}</p>
                <p><strong className="text-slate-900 font-semibold">Marca / Modelo:</strong> {caso.equipo.marca} {caso.equipo.modelo}</p>
                <p>
                  <strong className="text-slate-900 font-semibold">Nº Serie:</strong>{" "}
                  <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
                    {caso.equipo.numeroSerie}
                  </span>
                </p>
                {caso.contratoAlquiler && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-1 rounded block">
                      Contrato Alquiler: <strong>{caso.contratoAlquiler}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Garantía Técnica Activa */}
            {caso.garantia?.activa && (
              <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-900">
                    Garantía Técnica Activa
                  </span>
                </div>
                <div className="text-xs space-y-1 text-emerald-800">
                  <p>Plazo: <strong>{caso.garantia.diasGarantia} Días calendario</strong></p>
                  {caso.garantia.fechaVencimientoGarantia && (
                    <p>Vigente hasta: <strong>{format(new Date(caso.garantia.fechaVencimientoGarantia), "dd/MM/yyyy")}</strong></p>
                  )}
                  {caso.garantia.reingresosContador > 0 && (
                    <p className="text-amber-800 font-semibold">Reingresos registrados: {caso.garantia.reingresosContador}</p>
                  )}
                </div>
              </div>
            )}

            {/* Decisión de Aprobación de Diagnóstico (si existe) */}
            {ultimoDT?.estado === "APROBADO" && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  Diagnóstico Autorizado por Cliente
                </span>
                <p className="text-emerald-700 text-[11px]">
                  Presupuesto y alcance de DT {ultimoDT.codigoDT} aprobados para proceder a la reparación de taller.
                </p>
              </div>
            )}

          </div>

          {/* Columna Derecha: Contenido del Flujo Guiado en 4 Etapas */}
          <div className="lg:col-span-2 space-y-4">

            {/* Navegación por Pestañas del Flujo */}
            <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-xs flex items-center gap-1 overflow-x-auto">
              {[
                { id: "etapa1", label: "1. Ingreso", badge: "Listo", badgeColor: "bg-emerald-100 text-emerald-800" },
                { 
                  id: "etapa2", 
                  label: esRutaSimple ? "2.A Atención Simple" : "2.B Diagnóstico", 
                  badge: esRutaSimple 
                    ? (tieneConstancia ? 'Constancia' : 'Pendiente')
                    : (ultimoDT ? (ultimoDT.estado === 'APROBADO' ? 'Aprobado' : ultimoDT.estado === 'RECHAZADO' ? 'Rechazado' : 'Por Autorizar') : 'Pendiente'),
                  badgeColor: esRutaSimple 
                    ? (tieneConstancia ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800")
                    : (ultimoDT?.estado === 'APROBADO' ? "bg-emerald-100 text-emerald-800" : ultimoDT?.estado === 'RECHAZADO' ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800")
                },
                { 
                  id: "etapa3", 
                  label: esRutaSimple ? "3. Taller (Omitido)" : "3. Intervención & QA", 
                  badge: esRutaSimple ? 'No Aplica' : (ultimaOS ? (ultimaOS.estado === 'FINALIZADA' ? 'QA Conforme' : 'En Taller') : 'Bloqueado'),
                  badgeColor: esRutaSimple ? "bg-slate-100 text-slate-500" : (ultimaOS?.estado === 'FINALIZADA' ? "bg-emerald-100 text-emerald-800" : ultimaOS ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-500")
                },
                { 
                  id: "etapa4", 
                  label: "4. Entrega y Cierre", 
                  badge: ['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(caso.estado) ? 'Emitido' : (caso.estado === 'REPARADO' || tieneConstancia) ? 'Listo' : 'Bloqueado',
                  badgeColor: ['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(caso.estado) ? "bg-emerald-100 text-emerald-800" : (caso.estado === 'REPARADO' || tieneConstancia) ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                },
                { id: "historial", label: "Historial", count: caso.historial?.length || 0 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`text-xs px-3.5 py-2 font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[#2369A1] text-white font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      activeTab === tab.id ? "bg-white/20 text-white" : tab.badgeColor
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ========================================================================= */}
            {/* ETAPA 1: INGRESO & INCIDENCIA */}
            {/* ========================================================================= */}
            {activeTab === "etapa1" && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Etapa 1: Recepción e Incidencia Inicial</h3>
                    <p className="text-xs text-slate-500">Registro formal del ingreso del activo y tipificación del problema reportado.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModalIncidenciaOpen(true)}
                    className="text-xs border-slate-200 text-slate-700 h-8 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Incidencia / Reingreso
                  </Button>
                </div>

                {/* Resumen de Incidencia Primaria */}
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#2369A1] bg-white px-2 py-0.5 rounded border border-blue-200">
                          {primeraInc?.codigoINC || "INC-001"}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          primeraInc?.prioridad === "CRITICA" ? "bg-rose-50 text-rose-700 border-rose-300 font-bold" :
                          primeraInc?.prioridad === "ALTA" ? "bg-amber-50 text-amber-700 border-amber-300" :
                          "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          Prioridad {primeraInc?.prioridad || "MEDIA"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {format(new Date(caso.fechaApertura), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Falla Reportada:</span>
                      <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">
                        {primeraInc?.descripcion || "Avería general reportada al momento del ingreso."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Reportado por: <strong className="text-slate-700">{primeraInc?.reportadoPor || caso.cliente.contacto}</strong></span>
                      <span>Origen: <strong className="text-slate-700">{caso.origen}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[11px]">Fecha de Ingreso</span>
                      <span className="font-mono font-bold text-slate-800">
                        {format(new Date(caso.fechaApertura), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[11px]">Aperturado por</span>
                      <span className="font-semibold text-slate-800">
                        {caso.historial?.[0]?.autor || "Mesa de Ayuda"}
                      </span>
                    </div>
                  </div>

                  {/* Si hay múltiples incidencias (ej. reingresos) */}
                  {caso.incidencias && caso.incidencias.length > 1 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Otras Incidencias / Reingresos en este Expediente ({caso.incidencias.length - 1}):
                      </span>
                      {caso.incidencias.slice(1).map((inc) => (
                        <div key={inc.id} className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#2369A1]">{inc.codigoINC}</span>
                            <span className="text-[11px] text-slate-400">{format(new Date(inc.fecha), "dd/MM/yyyy HH:mm")}</span>
                          </div>
                          <p className="text-slate-700">{inc.descripcion}</p>
                          {inc.aplicaGarantia && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                              Reingreso Cubierto por Garantía
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 flex justify-end">
                    <Button 
                      size="sm"
                      onClick={() => setActiveTab("etapa2")}
                      className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs"
                    >
                      Continuar a Etapa 2: Diagnóstico →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ETAPA 2: ATENCIÓN SIMPLE (2.A) O DIAGNÓSTICO TÉCNICO (2.B) */}
            {/* ========================================================================= */}
            {activeTab === "etapa2" && esRutaSimple ? (
              /* VISTA EXCLUSIVA RUTA 2.A: ATENCIÓN SIMPLE */
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Etapa 2.A: Atención Simple</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        Soporte Menor
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Soporte técnico rápido (limpieza, lubricación, configuración, reinicio o sustitución rápida). Sin diagnóstico formal ni repuestos de laboratorio.
                    </p>
                  </div>
                  {!tieneConstancia && (
                    <Button
                      size="sm"
                      onClick={() => setModalAtencionSimpleOpen(true)}
                      className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Registrar Atención Simple
                    </Button>
                  )}
                </div>

                {/* Si no hay constancia emitida aún */}
                {!tieneConstancia && (
                  <div className="py-10 text-center space-y-3 bg-teal-50/40 border border-dashed border-teal-300 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 mx-auto">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-teal-950">Atención Simple en Espera de Registro</p>
                      <p className="text-xs text-teal-700 max-w-md mx-auto mt-0.5">
                        Este caso no requiere análisis técnico ni descarte formal de laboratorio. Registre las actividades menores de soporte para emitir la Constancia de Atención.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setModalAtencionSimpleOpen(true)}
                      className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Registrar Atención Simple y Emitir Constancia
                    </Button>
                  </div>
                )}

                {/* Si ya existe constancia emitida */}
                {ultimaConstancia && (
                  <div className="space-y-4">
                    <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {ultimaConstancia.codigoConstancia}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {ultimaConstancia.motivoSoporte}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                            EMITIDA
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generarConstanciaAtencionPDF(caso, ultimaConstancia)}
                          className="text-xs h-7.5 border-teal-300 text-teal-900 gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-teal-700" />
                          Constancia de Atención (PDF)
                        </Button>
                      </div>

                      <div className="text-xs bg-white p-3.5 rounded-lg border border-teal-100 space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-teal-50">
                          <span className="font-bold text-slate-700">Falla / Motivo (Ingreso):</span>
                          <span className="text-slate-600 font-medium">{ultimaConstancia.motivoSoporte}</span>
                        </div>
                        {ultimaConstancia.ticketItop && (
                          <div className="flex items-center justify-between pb-1.5 border-b border-teal-50">
                            <span className="font-bold text-teal-800">Ticket iTop Asistido:</span>
                            <span className="font-mono font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {ultimaConstancia.ticketItop}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-700 block">Actividades Realizadas:</span>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{ultimaConstancia.actividadesRealizadas}</p>
                        </div>
                        <div className="pt-1 border-t border-teal-50">
                          <span className="font-bold text-slate-700 block">Resultado Técnico:</span>
                          <p className="text-slate-600 mt-0.5 font-medium">{ultimaConstancia.resultado}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Técnico: <strong>{ultimaConstancia.tecnicoResponsable}</strong></span>
                        <span>Fecha: {format(new Date(ultimaConstancia.fecha), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                    </div>

                    {/* Banner Destacado para saltar directo a Etapa 4 */}
                    <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-950 block">
                            Atención Simple Concluida Conforme
                          </span>
                          <span className="text-[11px] text-emerald-800">
                            La Etapa 3 (Taller) se omite. El caso pasa directamente a la Entrega, Garantía y Cierre.
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("etapa4")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 gap-1.5 shadow-xs"
                      >
                        Pasar a 4. Entrega, Garantía y Cierre →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === "etapa2" && (
              /* VISTA RUTA 2.B: DIAGNÓSTICO TÉCNICO FORMAL (DT) */
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Etapa 2.B: Evaluación Técnica & Diagnóstico (DT)</h3>
                    <p className="text-xs text-slate-500">Evaluación detallada de laboratorio, descarte de fallas, cotización de repuestos y aprobación.</p>
                  </div>
                  {!ultimoDT && (
                    <Button
                      size="sm"
                      onClick={() => setModalDiagnosticoOpen(true)}
                      className="bg-[#2369A1] text-white text-xs h-8"
                    >
                      <PenTool className="w-3.5 h-3.5 mr-1" />
                      Registrar Diagnóstico (DT)
                    </Button>
                  )}
                </div>

                {/* Caso A: No hay diagnóstico aún */}
                {!ultimoDT && (
                  <div className="py-10 text-center space-y-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl">
                    <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Evaluación Técnica en Laboratorio Pendiente</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                        El equipo requiere análisis técnico y descarte formal para determinar causa raíz, informe DT y repuestos.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Button
                        size="sm"
                        onClick={() => setModalDiagnosticoOpen(true)}
                        className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold shadow-xs"
                      >
                        <PenTool className="w-3.5 h-3.5 mr-1.5" />
                        Registrar Diagnóstico Técnico (DT)
                      </Button>
                    </div>
                  </div>
                )}

                {/* Caso B: Diagnóstico Técnico emitido */}
                {ultimoDT && (
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                            {ultimoDT.codigoDT}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            Falla: <strong>{ultimoDT.tipoFalla}</strong>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            ultimoDT.estado === "APROBADO" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            ultimoDT.estado === "RECHAZADO" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                          }`}>
                            {ultimoDT.estado === "APROBADO" ? "APROBADO POR CLIENTE" :
                             ultimoDT.estado === "RECHAZADO" ? "RECHAZADO" : "PENDIENTE DE DECISIÓN"}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generarInformeTecnicoCasoPDF(caso, ultimoDT)}
                          className="text-xs h-7.5 border-slate-300 text-slate-700 gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-[#2369A1]" />
                          Informe DT (PDF)
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-700 block">Causa Raíz / Hallazgos:</span>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{ultimoDT.hallazgos}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 block">Diagnóstico Detallado:</span>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{ultimoDT.diagnosticoDetallado}</p>
                        </div>
                        {ultimoDT.solucionPropuesta && (
                          <div className="md:col-span-2 pt-1 border-t border-slate-200/60">
                            <span className="font-bold text-slate-700 block">Solución Propuesta:</span>
                            <p className="text-slate-600 mt-0.5 leading-relaxed">{ultimoDT.solucionPropuesta}</p>
                          </div>
                        )}
                      </div>

                      {ultimoDT.requiereRepuestos && ultimoDT.repuestosRequeridos?.length > 0 && (
                        <div className="text-xs border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 text-[11px]">
                            Repuestos Requeridos del Catálogo ({ultimoDT.repuestosRequeridos.length})
                          </div>
                          <div className="p-2 space-y-1">
                            {ultimoDT.repuestosRequeridos.map((r, i) => (
                              <div key={i} className="flex justify-between items-center text-slate-700 text-xs px-2 py-1 bg-slate-50 rounded">
                                <span>{r.descripcion} <span className="font-mono text-slate-400">({r.partNumber})</span></span>
                                <span className="font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px]">
                                  Cant: {r.cantidad}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Evaluador: <strong>{ultimoDT.tecnicoResponsable}</strong></span>
                        <span>Fecha: {format(new Date(ultimoDT.fecha), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                    </div>

                    {/* Bloque de Decisión de Aprobación */}
                    {ultimoDT.estado !== "APROBADO" && ultimoDT.estado !== "RECHAZADO" ? (
                      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
                        <span className="text-xs font-bold text-amber-900 block flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Esperando Decisión de Aprobación del Cliente
                        </span>
                        <p className="text-xs text-amber-800">
                          Presente la propuesta técnica y cotización de repuestos al cliente. Una vez aprobada, se habilitará la Orden de Servicio en Taller (Etapa 3).
                        </p>
                        <div className="pt-2 flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDTForDecision(ultimoDT)
                              setDecisionAprobado(false)
                              setModalDecisionDTOpen(true)
                            }}
                            className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                            Rechazar Propuesta
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDTForDecision(ultimoDT)
                              setDecisionAprobado(true)
                              setGenerarOSAlAprobar(true)
                              setModoCodigoOSDecision("AUTO")
                              setCodigoOSManualDecision("")
                              setOsActividadesDecision(ultimoDT.solucionPropuesta || ultimoDT.recomendaciones || `Ejecución de trabajos según diagnóstico ${ultimoDT.codigoDT}`)
                              setOsTipoDecision("CORRECTIVA")
                              setOsTecnicoDecision(operadorNombre)
                              setOsHorasDecision(2)
                              setModalDecisionDTOpen(true)
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                            Aprobar y Generar OS (Etapa 3)
                          </Button>
                        </div>
                      </div>
                    ) : ultimoDT.estado === "APROBADO" ? (
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-emerald-900 block">Diagnóstico Aprobado por el Cliente</span>
                            <span className="text-[11px] text-emerald-700">Listo para la ejecución de la Orden de Servicio en taller.</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("etapa3")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Ir a Etapa 3: Intervención & QA →
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-300 text-xs text-rose-800">
                        <span className="font-bold block">Diagnóstico Rechazado</span>
                        <p className="mt-0.5">El cliente no aprobó la reparación. El expediente procede a liquidación o devolución sin reparación.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* ETAPA 3: INTERVENCIÓN EN TALLER (OS) & CONTROL DE CALIDAD (QA) */}
            {/* ========================================================================= */}
            {activeTab === "etapa3" && esRutaSimple ? (
              /* VISTA RUTA 2.A: ETAPA 3 OMITIDA */
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Etapa 3: Intervención en Taller & QA (Omitida)</h3>
                    <p className="text-xs text-slate-500">Esta etapa de taller y pruebas de QA de laboratorio no aplica a este expediente.</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    No Aplica
                  </span>
                </div>

                <div className="py-10 text-center space-y-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Etapa Omitida por Ruta 2.A (Atención Simple)</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                      Al tratarse de soporte menor, el equipo no requiere orden de servicio en taller (OS) ni control de calidad de laboratorio.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("etapa4")}
                    className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
                  >
                    Pasar a Etapa 4: Entrega, Garantía y Cierre →
                  </Button>
                </div>
              </div>
            ) : activeTab === "etapa3" && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Etapa 3: Intervención Técnica (OS) & Pruebas QA</h3>
                    <p className="text-xs text-slate-500">Ejecución de actividades de taller y control de calidad bajo normas operativas.</p>
                  </div>
                </div>

                {/* Si la Etapa 2 no está completa ni aprobada: BLOQUEO */}
                {(!ultimoDT || ultimoDT.estado !== "APROBADO") && !['EN_REPARACION', 'EN_PRUEBAS', 'REPARADO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(caso.estado) ? (
                  <div className="py-12 text-center space-y-2 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                    <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">Etapa 3 Bloqueada</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Para iniciar la intervención en taller se requiere que el diagnóstico técnico sea aprobado por el cliente en la Etapa 2.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("etapa2")}
                      className="bg-[#2369A1] text-white text-xs mt-2"
                    >
                      Ir a Etapa 2: Diagnóstico
                    </Button>
                  </div>
                ) : !ultimaOS ? (
                  /* Diagnóstico aprobado pero no se ha generado la OS */
                  <div className="py-10 text-center space-y-3 bg-violet-50/50 border border-violet-200 rounded-xl">
                    <Wrench className="w-8 h-8 text-violet-600 mx-auto" />
                    <div>
                      <h4 className="text-xs font-bold text-violet-900">Diagnóstico Aprobado — Requiere Orden de Trabajo (OS)</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto mt-0.5">
                        Inicie la orden de servicio para asignar al técnico ejecutor y comenzar las labores físicas de taller.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setModalOSOpen(true)}
                      className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Generar Orden de Trabajo (OS)
                    </Button>
                  </div>
                ) : (
                  /* OS generada y en ejecución o finalizada */
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-violet-800 bg-violet-50 px-2.5 py-1 rounded border border-violet-200">
                            {ultimaOS.codigoOS}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            Tipo: {ultimaOS.tipo}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            ultimaOS.estado === "FINALIZADA" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            ultimaOS.estado === "EN_EJECUCION" ? "bg-violet-50 text-violet-700 border-violet-200 animate-pulse" :
                            "bg-purple-50 text-purple-700 border-purple-200"
                          }`}>
                            {ultimaOS.estado}
                          </span>
                        </div>

                        {ultimaOS.estado !== "FINALIZADA" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOSForQA(ultimaOS)
                              setModalQAOpen(true)
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7.5 font-semibold shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Registrar QA y Finalizar OS
                          </Button>
                        )}
                      </div>

                      <div className="text-xs bg-slate-50 p-3 rounded-lg space-y-1">
                        <span className="font-bold text-slate-700">Actividades Técnicas en Taller:</span>
                        <p className="text-slate-600 leading-relaxed">{ultimaOS.actividades}</p>
                      </div>

                      {/* Control de Calidad QA */}
                      {ultimaOS.pruebasQA ? (
                        <div className="text-xs bg-emerald-50/80 border border-emerald-300 p-3 rounded-lg space-y-1">
                          <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Control de Calidad (QA) Conforme
                          </span>
                          <p className="text-emerald-800 text-[11px]">{ultimaOS.pruebasQA.observacionesQA}</p>
                          <span className="text-[10px] text-emerald-600 block pt-0.5">
                            Evaluado por {ultimaOS.pruebasQA.tecnicoQA || "Control de Calidad"} el {ultimaOS.pruebasQA.fechaPruebas ? format(new Date(ultimaOS.pruebasQA.fechaPruebas), "dd/MM/yyyy HH:mm") : "N/A"}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs bg-amber-50/80 border border-amber-200 p-3 rounded-lg flex items-center justify-between">
                          <span className="text-amber-800 font-medium">
                            Pendiente de Control de Calidad (QA) para habilitar la entrega del activo.
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOSForQA(ultimaOS)
                              setModalQAOpen(true)
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                          >
                            Completar QA
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Técnico Responsable: <strong>{ultimaOS.tecnicoAsignado}</strong> • Horas Invertidas: {ultimaOS.horasHombre}h</span>
                        <span>Inicio: {ultimaOS.fechaInicio ? format(new Date(ultimaOS.fechaInicio), "dd/MM/yyyy HH:mm") : "N/A"}</span>
                      </div>
                    </div>

                    {ultimaOS.estado === "FINALIZADA" && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("etapa4")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Avanzar a Etapa 4: Entrega e Informe Técnico Final →
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* ETAPA 4: ENTREGA, GARANTÍA Y CIERRE */}
            {/* ========================================================================= */}
            {activeTab === "etapa4" && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Etapa 4: Entrega, Garantía & Cierre</h3>
                  <p className="text-xs text-slate-500">Coordinación de entrega con el cliente, activación de cobertura de garantía y liquidación técnica final.</p>
                </div>

                {/* Si aún no está reparado, ni entregado, ni tiene atención simple: BLOQUEO */}
                {!['REPARADO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(estadoNorm) && !ultimaConstancia ? (
                  <div className="py-12 text-center space-y-2 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                    <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">Etapa 4 Bloqueada</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      El activo aún no ha concluido la intervención técnica y control de calidad (QA). Debe finalizarse la Etapa 3 o registrarse una Atención Simple en Etapa 2.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("etapa2")}
                      className="bg-[#2369A1] text-white text-xs mt-2"
                    >
                      Ir a Etapa 2: Diagnóstico
                    </Button>
                  </div>
                ) : (estadoNorm === "REPARADO" || (Boolean(ultimaConstancia) && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(estadoNorm))) ? (
                  /* Listo para entregar (Por reparación QA o por Atención Simple) */
                  <div className="py-8 px-6 text-center space-y-3 bg-emerald-50/60 border border-emerald-300 rounded-xl">
                    <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        {ultimaConstancia ? "Soporte Menor Ejecutado — Listo para Entrega y Cierre" : "Equipo Reparado y QA Conforme"}
                      </h4>
                      <p className="text-xs text-emerald-800 max-w-lg mx-auto mt-1">
                        {ultimaConstancia 
                          ? `Atención simple acreditada con constancia ${ultimaConstancia.codigoConstancia}. Procede a registrar la devolución formal al cliente.`
                          : "El equipo está 100% operativo y probado. Registre la entrega del activo al cliente para activar la garantía o proceder a la liquidación final."}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setModalEntregaOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 shadow-xs"
                    >
                      <ShieldCheck className="w-4 h-4 mr-1.5" />
                      Registrar Entrega de Equipo
                    </Button>
                  </div>
                ) : (
                  /* Ya entregado / en garantía / cerrado */
                  <div className="space-y-4">
                    {/* Tarjeta de Conformidad de Entrega */}
                    <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-emerald-950 block">
                            Equipo Entregado a Conformidad
                          </span>
                          <span className="text-[11px] text-emerald-700">
                            {caso.entrega 
                              ? `Receptor: ${caso.entrega.receptorNombre} (DNI/RUC: ${caso.entrega.receptorDniRuc || "N/A"})` 
                              : `Estado de Expediente: ${caso.estado}`}
                          </span>
                        </div>
                      </div>
                      {caso.estado !== "CERRADO" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModalCierreOpen(true)}
                          className="text-xs border-emerald-300 text-slate-700 bg-white hover:bg-slate-50"
                        >
                          Cerrar Expediente / Liquidación
                        </Button>
                      )}
                    </div>

                    {/* Datos de Entrega y Conformidad */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                        Constancia de Entrega y Recepción
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Receptor del Activo:</span>
                          <strong className="text-slate-800">{caso.entrega?.receptorNombre || caso.cliente.contacto}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Documento Identidad (DNI / RUC):</span>
                          <strong className="text-slate-800 font-mono">{caso.entrega?.receptorDniRuc || caso.cliente.ruc}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Fecha y Hora de Entrega:</span>
                          <span className="text-slate-800 font-mono">
                            {caso.entrega?.fechaEntrega ? format(new Date(caso.entrega.fechaEntrega), "dd/MM/yyyy HH:mm") : "Registrada"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Responsable de Entrega:</span>
                          <span className="text-slate-800">{caso.entrega?.responsableEntrega || operadorNombre}</span>
                        </div>
                        {caso.entrega?.observaciones && (
                          <div className="sm:col-span-2 pt-1 border-t border-slate-200/60">
                            <span className="text-slate-400 block text-[11px]">Observaciones:</span>
                            <p className="text-slate-700 mt-0.5">{caso.entrega.observaciones}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gestión de Garantía & Liquidación Final */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Cobertura de Garantía Técnica
                        </span>
                        {caso.garantia?.activa && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            Vigente
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg">
                        <div>
                          <span className="text-slate-500">Plazo Asignado:</span>
                          <p className="font-bold text-slate-800">{caso.garantia?.diasGarantia || 0} Días calendario</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Reingresos Registrados:</span>
                          <p className="font-bold text-amber-700">{caso.garantia?.reingresosContador || 0} vez/veces</p>
                        </div>
                        {caso.garantia?.fechaVencimientoGarantia && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Fecha de Vencimiento de Garantía:</span>
                            <p className="font-bold text-emerald-700">
                              {format(new Date(caso.garantia.fechaVencimientoGarantia), "dd/MM/yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      {caso.estado !== "CERRADO" && (
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                          <p className="text-[11px] text-slate-500">
                            El expediente cerrará definitivamente una vez vencida la garantía o por liquidación administrativa.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModalCierreOpen(true)}
                            className="text-xs border-slate-300 text-slate-700"
                          >
                            Cerrar Expediente / Liquidación
                          </Button>
                        </div>
                      )}

                      {caso.estado === "CERRADO" && (
                        <div className="p-3 bg-slate-100 rounded-lg text-xs space-y-1">
                          <span className="font-bold text-slate-800 block">Expediente Cerrado y Archivado</span>
                          <p className="text-slate-600">{caso.liquidacionFinal?.observaciones || "Liquidación final concluida."}</p>
                          <span className="text-[10px] text-slate-400 block">
                            Firmado por {caso.liquidacionFinal?.firmadoPor} el {caso.liquidacionFinal?.fechaLiquidacion ? format(new Date(caso.liquidacionFinal.fechaLiquidacion), "dd/MM/yyyy HH:mm") : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* HISTORIAL & TRAZABILIDAD COMPLETO */}
            {/* ========================================================================= */}
            {activeTab === "historial" && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Historial y Trazabilidad Cronológica</h3>
                  <span className="text-xs text-slate-400">{caso.historial?.length || 0} hitos auditados</span>
                </div>

                <div className="border-l-2 border-slate-200 ml-3 space-y-6 py-2">
                  {(caso.historial || []).map((h, idx) => (
                    <div key={h.id || idx} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                        h.tipo === "APERTURA" ? "bg-[#2369A1]" :
                        h.tipo === "INCIDENCIA" ? "bg-blue-500" :
                        h.tipo === "DIAGNOSTICO" ? "bg-amber-500" :
                        h.tipo === "ORDEN_SERVICIO" ? "bg-violet-500" :
                        h.tipo === "ATENCION_SIMPLE" ? "bg-teal-500" :
                        h.tipo === "GARANTIA_ACTIVADA" ? "bg-emerald-500" :
                        h.tipo === "REINGRESO_GARANTIA" ? "bg-amber-600 animate-pulse" :
                        h.tipo === "CIERRE" ? "bg-slate-700" :
                        "bg-slate-400"
                      }`} />
                      <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-900">{h.titulo}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {format(new Date(h.fecha), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{h.detalle}</p>
                        <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
                          <span>Responsable:</span>
                          <span className="text-slate-600">{h.autor}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRO DE NUEVA INCIDENCIA (Reingreso o Alquiler) */}
      {/* ========================================================================= */}
      <Dialog open={modalIncidenciaOpen} onOpenChange={setModalIncidenciaOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Registrar Nueva Incidencia en Caso {caso.codigoCaso}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mantiene el expediente único y vincula la nueva avería al historial del activo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarNuevaIncidencia} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Falla / Avería Reportada *</Label>
              <textarea
                value={nuevaIncFalla}
                onChange={(e) => setNuevaIncFalla(e.target.value)}
                placeholder="Detalle la falla reportada..."
                rows={3}
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Prioridad</Label>
                <select
                  value={nuevaIncPrioridad}
                  onChange={(e) => setNuevaIncPrioridad(e.target.value as any)}
                  className="w-full text-xs h-8 rounded border border-slate-200 px-2"
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Origen</Label>
                <select
                  value={nuevaIncOrigen}
                  onChange={(e) => setNuevaIncOrigen(e.target.value as any)}
                  className="w-full text-xs h-8 rounded border border-slate-200 px-2"
                >
                  <option value="TALLER">Taller</option>
                  <option value="ALQUILER">Alquiler</option>
                  <option value="RECLAMO_GARANTIA">Garantía</option>
                </select>
              </div>
            </div>

            {/* Bifurcación Clave: ¿Requiere análisis técnico y descarte formal? */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700">
                ¿Requiere análisis técnico y descarte formal? *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNuevaIncRequiereDT(true)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    nuevaIncRequiereDT
                      ? "border-[#2369A1] bg-[#2369A1]/5 ring-1 ring-[#2369A1] text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${nuevaIncRequiereDT ? "bg-[#2369A1]" : "bg-slate-300"}`} />
                    SÍ (Ruta 2.B DT)
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Diagnóstico y Taller</p>
                </button>

                <button
                  type="button"
                  onClick={() => setNuevaIncRequiereDT(false)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    !nuevaIncRequiereDT
                      ? "border-teal-600 bg-teal-50/80 ring-1 ring-teal-600 text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${!nuevaIncRequiereDT ? "bg-teal-600" : "bg-slate-300"}`} />
                    NO (Ruta 2.A Simple)
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Constancia y Entrega</p>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="chkGarantia"
                checked={nuevaIncEsGarantia}
                onChange={(e) => setNuevaIncEsGarantia(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="chkGarantia" className="text-xs font-semibold text-emerald-800 cursor-pointer">
                Reingreso cubierto por Garantía (Aplica Garantía)
              </Label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalIncidenciaOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#2369A1] text-xs">
                Registrar Incidencia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2A: ATENCIÓN SIMPLE (CONSTANCIA) */}
      {/* ========================================================================= */}
      <Dialog open={modalAtencionSimpleOpen} onOpenChange={setModalAtencionSimpleOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              2A. Atención Simple (Constancia de Atención)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Para soporte menor (limpieza, config, reinicio). No requiere diagnóstico formal ni repuestos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarAtencionSimple} className="space-y-3.5 pt-2">
            {/* Motivo automático heredado del ingreso */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Falla / Motivo Registrado al Ingreso:
              </span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {ultimaInc?.descripcion || primeraInc?.descripcion || "Soporte menor / mantenimiento preventivo"}
              </p>
            </div>

            {/* Ticket iTop */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800">
                  Ticket iTop Asistido <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[10px] text-slate-400 font-medium">Mesa de Ayuda iTop</span>
              </div>
              <Input
                value={constanciaTicketItop}
                onChange={(e) => setConstanciaTicketItop(e.target.value.toUpperCase())}
                placeholder="Ej. R-019284, T-45810, I-8831"
                className="text-xs font-mono uppercase font-bold bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">
                Actividades Realizadas <span className="text-rose-500">*</span>
              </Label>
              <textarea
                value={constanciaActividades}
                onChange={(e) => setConstanciaActividades(e.target.value)}
                placeholder="Detalle las actividades menores ejecutadas (ej. Desmontaje, limpieza de ventiladores, cambio de pasta térmica, pruebas)..."
                rows={3}
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">
                Resultado Técnico <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={constanciaResultado}
                onChange={(e) => setConstanciaResultado(e.target.value)}
                placeholder="Ej. Equipo 100% operativo a temperaturas óptimas bajo estrés"
                className="text-xs bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Técnico Responsable</Label>
              <Input
                value={constanciaTecnico}
                onChange={(e) => setConstanciaTecnico(e.target.value)}
                className="text-xs bg-white"
                required
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalAtencionSimpleOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold">
                Emitir y Descargar Constancia (PDF)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2B: DIAGNÓSTICO TÉCNICO FORMAL (DT) */}
      {/* ========================================================================= */}
      <Dialog open={modalDiagnosticoOpen} onOpenChange={setModalDiagnosticoOpen}>
        <DialogContent className="max-w-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              2B. Evaluación y Diagnóstico Técnico (DT)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Genera dictamen formal de laboratorio, causa raíz y requerimiento de repuestos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarDiagnostico} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Falla</Label>
                <select
                  value={dtTipoFalla}
                  onChange={(e) => setDtTipoFalla(e.target.value as any)}
                  className="w-full text-xs h-8 rounded border border-slate-200 px-2"
                >
                  <option value="HARDWARE">Hardware</option>
                  <option value="SOFTWARE">Software / SO</option>
                  <option value="OPERATIVO">Operativo / Uso</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Técnico Evaluador</Label>
                <Input
                  value={dtTecnico}
                  onChange={(e) => setDtTecnico(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Causa Raíz / Hallazgos *</Label>
              <Input
                value={dtHallazgos}
                onChange={(e) => setDtHallazgos(e.target.value)}
                placeholder="Ej. Cortocircuito en línea de 19V / Mosfet dañado"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Diagnóstico Detallado *</Label>
              <textarea
                value={dtDetalle}
                onChange={(e) => setDtDetalle(e.target.value)}
                placeholder="Descripción técnica exhaustiva del problema..."
                rows={2}
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Recomendaciones / Solución</Label>
              <Input
                value={dtRecomendaciones}
                onChange={(e) => setDtRecomendaciones(e.target.value)}
                placeholder="Ej. Reemplazo de módulo y pasta térmica"
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="chkRepuestos"
                checked={dtRequiereRepuestos}
                onChange={(e) => setDtRequiereRepuestos(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="chkRepuestos" className="text-xs font-semibold cursor-pointer">
                Requiere Repuestos / Componentes
              </Label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalDiagnosticoOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                Guardar Diagnóstico DT
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DECISIÓN CLIENTE SOBRE DT Y APERTURA DE OS */}
      {/* ========================================================================= */}
      <Dialog open={modalDecisionDTOpen} onOpenChange={setModalDecisionDTOpen}>
        <DialogContent className="max-w-xl font-sans max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Aprobación de Propuesta Técnica ({selectedDTForDecision?.codigoDT})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              El cliente o jefatura autoriza la intervención técnica o rechaza la propuesta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarDecisionDT} className="space-y-4 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDecisionAprobado(true)}
                className={`flex-1 p-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                  decisionAprobado 
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ✓ APROBAR Intervención
              </button>
              <button
                type="button"
                onClick={() => setDecisionAprobado(false)}
                className={`flex-1 p-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                  !decisionAprobado 
                    ? "border-rose-600 bg-rose-50 text-rose-800 ring-1 ring-rose-600 shadow-2xs" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ✕ RECHAZAR Presupuesto
              </button>
            </div>

            {!decisionAprobado && (
              <div className="space-y-1 bg-rose-50/50 p-3 rounded-lg border border-rose-200">
                <Label className="text-xs font-semibold text-rose-900">Motivo del Rechazo *</Label>
                <Input
                  value={decisionMotivoRechazo}
                  onChange={(e) => setDecisionMotivoRechazo(e.target.value)}
                  placeholder="Ej. Presupuesto excede límite comercial o cliente no autoriza cambio de componentes"
                  className="text-xs bg-white"
                  required={!decisionAprobado}
                />
                <p className="text-[10px] text-rose-600 mt-1">
                  El expediente pasará a <b>CERRADO SIN REPARACIÓN</b> y se habilitará la emisión del Informe Técnico y devolución del activo.
                </p>
              </div>
            )}

            {decisionAprobado && (
              <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/40 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#2369A1]" />
                    <span className="text-xs font-bold text-slate-800">
                      Apertura de Orden de Servicio (Fase 3 - Taller)
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={generarOSAlAprobar}
                      onChange={(e) => setGenerarOSAlAprobar(e.target.checked)}
                      className="rounded border-slate-300 text-[#2369A1] focus:ring-[#2369A1] w-3.5 h-3.5"
                    />
                    <span>Aperturar OS ahora</span>
                  </label>
                </div>

                {generarOSAlAprobar && (
                  <div className="space-y-3 text-xs">
                    {/* Selector Modo Código OS */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Código / Numeración de la Orden de Servicio:
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setModoCodigoOSDecision("AUTO")}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            modoCodigoOSDecision === "AUTO"
                              ? "border-[#2369A1] bg-white ring-1 ring-[#2369A1] text-slate-900 shadow-2xs"
                              : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5 text-xs text-slate-800">
                            <span className={`w-2 h-2 rounded-full ${modoCodigoOSDecision === "AUTO" ? "bg-[#2369A1]" : "bg-slate-300"}`} />
                            Autogenerar correlativo
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            El sistema asigna la secuencia automática (ej: OS-001)
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModoCodigoOSDecision("MANUAL")}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            modoCodigoOSDecision === "MANUAL"
                              ? "border-[#2369A1] bg-white ring-1 ring-[#2369A1] text-slate-900 shadow-2xs"
                              : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5 text-xs text-slate-800">
                            <span className={`w-2 h-2 rounded-full ${modoCodigoOSDecision === "MANUAL" ? "bg-[#2369A1]" : "bg-slate-300"}`} />
                            Digitar manual (ERP / SAP)
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Código provisto por otra área (Facturación / Comercial)
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Input Código Manual */}
                    {modoCodigoOSDecision === "MANUAL" && (
                      <div className="space-y-1 bg-white p-2.5 rounded-lg border border-amber-200">
                        <Label className="text-xs font-bold text-amber-900 flex items-center justify-between">
                          <span>Código OS Oficial / Externo *</span>
                          <span className="text-[10px] font-normal text-amber-700">Emitido por otra área</span>
                        </Label>
                        <Input
                          value={codigoOSManualDecision}
                          onChange={(e) => setCodigoOSManualDecision(e.target.value.toUpperCase())}
                          placeholder="Ej. OS-2024-8931, SAP-44019, ERP-5012"
                          className="text-xs font-mono font-bold uppercase tracking-wider bg-amber-50/20"
                          required={modoCodigoOSDecision === "MANUAL"}
                        />
                        <p className="text-[10px] text-slate-500">
                          Se mantendrá la trazabilidad directa con la orden registrada en el ERP u otra área.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Tipo de Trabajo</Label>
                        <select
                          value={osTipoDecision}
                          onChange={(e) => setOsTipoDecision(e.target.value as any)}
                          className="w-full text-xs h-8 rounded border border-slate-200 px-2 bg-white"
                        >
                          <option value="CORRECTIVA">Correctiva</option>
                          <option value="PREVENTIVA">Preventiva</option>
                          <option value="GARANTIA">Garantía</option>
                          <option value="INSTALACION">Instalación</option>
                          <option value="MANTENIMIENTO">Mantenimiento</option>
                          <option value="INSPECCION">Inspección</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Técnico Asignado</Label>
                        <Input
                          value={osTecnicoDecision}
                          onChange={(e) => setOsTecnicoDecision(e.target.value)}
                          className="text-xs bg-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Actividades a Realizar *</Label>
                      <textarea
                        value={osActividadesDecision}
                        onChange={(e) => setOsActividadesDecision(e.target.value)}
                        placeholder="Describa el trabajo operativo a realizar..."
                        rows={2}
                        className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none bg-white"
                        required={generarOSAlAprobar}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Horas Hombre Estimadas</Label>
                      <Input
                        type="number"
                        value={osHorasDecision}
                        onChange={(e) => setOsHorasDecision(Number(e.target.value))}
                        className="text-xs bg-white w-32"
                        min={0.5}
                        step={0.5}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalDecisionDTOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                className={decisionAprobado ? "bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs" : "bg-rose-600 hover:bg-rose-700 text-white text-xs"}
              >
                {decisionAprobado 
                  ? (generarOSAlAprobar ? "Aprobar y Aperturar Orden de Servicio" : "Aprobar Propuesta Técnica") 
                  : "Confirmar Rechazo y Cerrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: GENERAR ORDEN DE SERVICIO (OS) */}
      {/* ========================================================================= */}
      <Dialog open={modalOSOpen} onOpenChange={setModalOSOpen}>
        <DialogContent className="max-w-lg font-sans max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              3. Generar Orden de Servicio (OS)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Asigna trabajo técnico operativo al laboratorio (Estado pasará a EN REPARACIÓN).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarOS} className="space-y-3.5 pt-2">
            {/* Selector de Origen de Código OS */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Código / Numeración de la Orden de Servicio:
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModoCodigoOS("AUTO")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    modoCodigoOS === "AUTO"
                      ? "border-violet-600 bg-violet-50/50 ring-1 ring-violet-600 text-slate-900 shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs text-slate-800">
                    <span className={`w-2 h-2 rounded-full ${modoCodigoOS === "AUTO" ? "bg-violet-600" : "bg-slate-300"}`} />
                    Autogenerar correlativo
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    El sistema asigna correlativo automático (ej: OS-001)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setModoCodigoOS("MANUAL")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    modoCodigoOS === "MANUAL"
                      ? "border-violet-600 bg-violet-50/50 ring-1 ring-violet-600 text-slate-900 shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs text-slate-800">
                    <span className={`w-2 h-2 rounded-full ${modoCodigoOS === "MANUAL" ? "bg-violet-600" : "bg-slate-300"}`} />
                    Digitar manual (ERP / SAP)
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Proviene de otra área (SAP, ERP, Comercial o Facturación)
                  </p>
                </button>
              </div>
            </div>

            {/* Input Código Manual si aplica */}
            {modoCodigoOS === "MANUAL" && (
              <div className="space-y-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                <Label className="text-xs font-bold text-amber-900 flex items-center justify-between">
                  <span>Código OS Oficial / Externo *</span>
                  <span className="text-[10px] font-normal text-amber-700">Emitido por otra área</span>
                </Label>
                <Input
                  value={codigoOSManual}
                  onChange={(e) => setCodigoOSManual(e.target.value.toUpperCase())}
                  placeholder="Ej. OS-2024-8931, SAP-44019, COT-1092"
                  className="text-xs font-mono font-bold uppercase tracking-wider bg-white"
                  required={modoCodigoOS === "MANUAL"}
                />
                <p className="text-[10px] text-slate-500">
                  Este número mantendrá la trazabilidad cruzada exacta con el sistema externo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Trabajo</Label>
                <select
                  value={osTipo}
                  onChange={(e) => setOsTipo(e.target.value as any)}
                  className="w-full text-xs h-8 rounded border border-slate-200 px-2 bg-white"
                >
                  <option value="CORRECTIVA">Correctiva</option>
                  <option value="PREVENTIVA">Preventiva</option>
                  <option value="GARANTIA">Garantía</option>
                  <option value="INSTALACION">Instalación</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="INSPECCION">Inspección</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Técnico Asignado</Label>
                <Input
                  value={osTecnico}
                  onChange={(e) => setOsTecnico(e.target.value)}
                  className="text-xs bg-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Actividades a Realizar *</Label>
              <textarea
                value={osActividades}
                onChange={(e) => setOsActividades(e.target.value)}
                placeholder="Describa el trabajo a ejecutar por el técnico..."
                rows={3}
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Horas Estimadas</Label>
              <Input
                type="number"
                value={osHorasEstimadas}
                onChange={(e) => setOsHorasEstimadas(Number(e.target.value))}
                className="text-xs bg-white w-32"
                min={0.5}
                step={0.5}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOSOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
                Aperturar Orden de Trabajo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL QA Y FINALIZAR OS */}
      {/* ========================================================================= */}
      <Dialog open={modalQAOpen} onOpenChange={setModalQAOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Pruebas de Calidad (QA) - {selectedOSForQA?.codigoOS}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra los resultados de las pruebas operativas antes de liberar el equipo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarQA} className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkQA"
                checked={qaSupero}
                onChange={(e) => setQaSupero(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="chkQA" className="text-xs font-semibold cursor-pointer">
                Pruebas de operatividad superadas con éxito (Listo para entrega)
              </Label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observaciones de QA</Label>
              <textarea
                value={qaObservaciones}
                onChange={(e) => setQaObservaciones(e.target.value)}
                rows={2}
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Horas-Hombre Reales</Label>
              <Input
                type="number"
                value={qaHorasReales}
                onChange={(e) => setQaHorasReales(Number(e.target.value))}
                className="text-xs"
                step={0.5}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalQAOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Completar y Finalizar OS
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: ENTREGA Y ACTIVACIÓN DE GARANTÍA */}
      {/* ========================================================================= */}
      <Dialog open={modalEntregaOpen} onOpenChange={setModalEntregaOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              4. Entrega de Equipo y Activación de Garantía
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra la conformidad del cliente y establece el período de cobertura técnica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarEntrega} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Receptor *</Label>
                <Input
                  value={entregaReceptor}
                  onChange={(e) => setEntregaReceptor(e.target.value)}
                  placeholder="Nombre de receptor"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">DNI / RUC</Label>
                <Input
                  value={entregaDni}
                  onChange={(e) => setEntregaDni(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="chkActivarGarantia"
                checked={entregaAplicaGarantia}
                onChange={(e) => setEntregaAplicaGarantia(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="chkActivarGarantia" className="text-xs font-semibold text-emerald-800 cursor-pointer">
                Activar Plazo de Cobertura de Garantía
              </Label>
            </div>

            {entregaAplicaGarantia && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Días de Garantía</Label>
                <select
                  value={entregaDiasGarantia}
                  onChange={(e) => setEntregaDiasGarantia(Number(e.target.value))}
                  className="w-full text-xs h-8 rounded border border-slate-200 px-2"
                >
                  <option value={15}>15 Días calendario</option>
                  <option value={30}>30 Días calendario (Estándar)</option>
                  <option value={60}>60 Días calendario</option>
                  <option value={90}>90 Días calendario (Trimestral)</option>
                  <option value={180}>180 Días calendario (Semestral)</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observaciones</Label>
              <textarea
                value={entregaObservaciones}
                onChange={(e) => setEntregaObservaciones(e.target.value)}
                rows={2}
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalEntregaOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#2369A1] text-white text-xs">
                Confirmar Entrega
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL CIERRE DEFINITIVO */}
      {/* ========================================================================= */}
      <Dialog open={modalCierreOpen} onOpenChange={setModalCierreOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Liquidación y Cierre Definitivo del Expediente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cierra definitivamente el caso tras expirar la garantía o concluir la liquidación administrativa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCerrarCasoDefinitivo} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observaciones Finales de Liquidación</Label>
              <textarea
                value={cierreObservaciones}
                onChange={(e) => setCierreObservaciones(e.target.value)}
                rows={3}
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none"
                required
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalCierreOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-slate-800 text-white text-xs">
                Firmar Cierre Definitivo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
