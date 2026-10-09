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
  UsuarioSistema 
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
  Award
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
  const [activeTab, setActiveTab] = useState<"resumen" | "incidencias" | "diagnosticos" | "ordenes" | "constancias" | "garantia">("resumen")

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
  const [constanciaMotivo, setConstanciaMotivo] = useState("Limpieza interna y lubricación de ventiladores")
  const [constanciaActividades, setConstanciaActividades] = useState("Desmontaje de cubierta, remoción de polvo, pruebas térmicas.")
  const [constanciaResultado, setConstanciaResultado] = useState("Equipo operativo a temperaturas óptimas.")
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

  // Formulario: Decisión Propuesta Técnica
  const [decisionAprobado, setDecisionAprobado] = useState(true)
  const [decisionMotivoRechazo, setDecisionMotivoRechazo] = useState("")

  // Formulario: Orden de Servicio (OS)
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
    try {
      const res = await registrarAtencionSimple(codigo, {
        motivoSoporte: constanciaMotivo,
        actividadesRealizadas: constanciaActividades,
        resultado: constanciaResultado,
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
    try {
      await registrarDecisionPropuestaTecnica(
        codigo,
        selectedDTForDecision.id,
        decisionAprobado,
        decisionAprobado ? undefined : decisionMotivoRechazo,
        operadorNombre
      )
      toast.success(decisionAprobado ? "Propuesta técnica aprobada." : "Rechazo registrado.")
      setModalDecisionDTOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Error al registrar decisión.")
    }
  }

  const handleGuardarOS = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!osActividades.trim()) {
      toast.error("Ingresa las actividades a ejecutar.")
      return
    }
    try {
      const nuevaOs = await generarOrdenServicioTrabajo(codigo, {
        tipo: osTipo,
        tecnicoAsignado: osTecnico || operadorNombre,
        actividades: osActividades,
        horasHombreEstimadas: Number(osHorasEstimadas) || 1,
        autor: operadorNombre
      })
      toast.success(`Orden de Servicio ${nuevaOs.codigoOS} generada. Caso en Reparación.`)
      setModalOSOpen(false)
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
      toast.success(entregaAplicaGarantia ? "Equipo entregado y plazo de garantía activado." : "Equipo entregado.")
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

          <div className="flex items-center gap-2">
            {/* Si el caso está en garantía, botón destacado de reingreso */}
            {caso.garantia?.activa && (
              <Button
                size="sm"
                onClick={() => {
                  setNuevaIncEsGarantia(true)
                  setNuevaIncOrigen("RECLAMO_GARANTIA")
                  setModalIncidenciaOpen(true)
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8 gap-1.5 shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Registrar Reingreso en Garantía
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalIncidenciaOpen(true)}
              className="text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-8 gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Incidencia
            </Button>

            <div className="border-l border-slate-200 pl-2">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        
        {/* Banner de Información General del Activo y Expediente */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {caso.equipo.marca} {caso.equipo.modelo}
                </h1>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  S/N: {caso.equipo.numeroSerie}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  caso.origen === "ALQUILER" ? "bg-purple-50 text-purple-700 border-purple-200" :
                  caso.origen === "RECLAMO_GARANTIA" ? "bg-amber-50 text-amber-800 border-amber-300 font-bold" :
                  "bg-blue-50 text-[#2369A1] border-blue-200"
                }`}>
                  Origen: {caso.origen}
                </span>
                {caso.contratoAlquiler && (
                  <span className="text-xs font-mono font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                    Contrato Alquiler: {caso.contratoAlquiler}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Cliente: <strong className="font-semibold text-slate-700">{caso.cliente.razonSocial}</strong> (RUC: {caso.cliente.ruc}) • Aperturado el {format(new Date(caso.fechaApertura), "dd/MM/yyyy HH:mm")}
              </p>
            </div>

            {/* Garantía Vigente Alerta */}
            {caso.garantia?.activa && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    Garantía Técnica Activa ({caso.garantia.diasGarantia} Días)
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Vigente hasta: {caso.garantia.fechaVencimientoGarantia ? format(new Date(caso.garantia.fechaVencimientoGarantia), "dd/MM/yyyy") : "Período activo"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stepper de las 4 Fases Funcionales del Diagrama de Flujo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            
            {/* Fase 1: Incidencias */}
            <div className={`p-3 rounded-xl border text-xs ${
              caso.incidencias?.length > 0 
                ? "border-blue-200 bg-blue-50/50" 
                : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">1. Incidencias</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2369A1]" />
              </div>
              <div className="text-base font-bold text-slate-900">{caso.incidencias?.length || 0} Registradas</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Avería y tipificación de origen</p>
            </div>

            {/* Fase 2: Diagnóstico o Atención Simple */}
            <div className={`p-3 rounded-xl border text-xs ${
              (caso.diagnosticos?.length > 0 || caso.constancias?.length > 0)
                ? "border-amber-200 bg-amber-50/50" 
                : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">2. Análisis / Atención</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                {caso.diagnosticos?.length || 0} DT • {caso.constancias?.length || 0} CST
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Evaluación formal o soporte simple</p>
            </div>

            {/* Fase 3: Ejecución OS & QA */}
            <div className={`p-3 rounded-xl border text-xs ${
              caso.ordenesServicio?.length > 0
                ? "border-violet-200 bg-violet-50/50" 
                : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">3. Ejecución OS & QA</span>
                <Wrench className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div className="text-base font-bold text-slate-900">{caso.ordenesServicio?.length || 0} Órdenes OS</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Intervención física y pruebas</p>
            </div>

            {/* Fase 4: Entrega, Garantía y Cierre */}
            <div className={`p-3 rounded-xl border text-xs ${
              ['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(caso.estado)
                ? "border-emerald-200 bg-emerald-50/50" 
                : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">4. Garantía & Cierre</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                {caso.estado === "CERRADO" ? "Expediente Cerrado" : caso.garantia?.activa ? "Garantía Vigente" : caso.estado}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Liquidación o cobertura activa</p>
            </div>

          </div>

          {/* Barra de Acciones Operativas Rápidas según la Fase */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
              Acciones de Expediente:
            </span>

            {/* Acción Ruta 2A: Atención Simple */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalAtencionSimpleOpen(true)}
              className="text-xs h-7.5 border-slate-200 hover:border-blue-300 text-slate-700 bg-white"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-[#2369A1]" />
              + 2A. Atención Simple (Constancia)
            </Button>

            {/* Acción Ruta 2B: Diagnóstico Técnico */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalDiagnosticoOpen(true)}
              className="text-xs h-7.5 border-slate-200 hover:border-amber-300 text-slate-700 bg-white"
            >
              <Wrench className="w-3.5 h-3.5 mr-1 text-amber-600" />
              + 2B. Evaluación DT Formal
            </Button>

            {/* Acción Fase 3: Generar OS */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalOSOpen(true)}
              className="text-xs h-7.5 border-slate-200 hover:border-violet-300 text-slate-700 bg-white"
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1 text-violet-600" />
              + 3. Generar Orden de Trabajo (OS)
            </Button>

            {/* Acción Fase 4: Entrega y Garantía */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalEntregaOpen(true)}
              className="text-xs h-7.5 border-slate-200 hover:border-emerald-300 text-slate-700 bg-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              4. Entregar / Activar Garantía
            </Button>

            {/* Acción Fase 4: Cierre final */}
            {caso.estado !== "CERRADO" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalCierreOpen(true)}
                className="text-xs h-7.5 border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Cerrar Expediente
              </Button>
            )}
          </div>
        </div>

        {/* Pestañas de Vista Detallada */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          
          <div className="flex items-center gap-1 border-b border-slate-200 px-4 pt-3 overflow-x-auto bg-slate-50/50">
            {[
              { id: "resumen", label: "Trazabilidad & Historial", count: caso.historial?.length || 0 },
              { id: "incidencias", label: "Incidencias", count: caso.incidencias?.length || 0 },
              { id: "diagnosticos", label: "Diagnósticos (DT)", count: caso.diagnosticos?.length || 0 },
              { id: "ordenes", label: "Órdenes de Servicio (OS)", count: caso.ordenesServicio?.length || 0 },
              { id: "constancias", label: "Constancias de Atención", count: caso.constancias?.length || 0 },
              { id: "garantia", label: "Garantía & Cierre" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-xs px-3 py-2 font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[#2369A1] text-[#2369A1] font-bold bg-white rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    activeTab === tab.id ? "bg-[#2369A1]/10 text-[#2369A1]" : "bg-slate-200 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* TAB 1: Trazabilidad & Historial Cronológico */}
            {activeTab === "resumen" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Historial de Eventos del Expediente
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {caso.historial?.length || 0} hitos registrados
                  </span>
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

            {/* TAB 2: Incidencias */}
            {activeTab === "incidencias" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Incidencias Reportadas
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setModalIncidenciaOpen(true)}
                    className="bg-[#2369A1] text-white text-xs h-7"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Registrar Incidencia
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(caso.incidencias || []).map(inc => (
                    <div key={inc.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#2369A1]">{inc.codigoINC}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            inc.prioridad === "CRITICA" ? "bg-rose-50 text-rose-700 border-rose-300" :
                            inc.prioridad === "ALTA" ? "bg-amber-50 text-amber-700 border-amber-300" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            Prioridad {inc.prioridad}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {format(new Date(inc.fecha), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-800">{inc.descripcion}</p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Reportado por: <strong>{inc.reportadoPor}</strong></span>
                        <div className="flex items-center gap-1">
                          {inc.aplicaGarantia && (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                              Aplica Garantía
                            </span>
                          )}
                          <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                            {inc.origen}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Diagnósticos Técnicos (DT) */}
            {activeTab === "diagnosticos" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Evaluaciones y Diagnósticos de Laboratorio (DT)
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setModalDiagnosticoOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nuevo Diagnóstico (DT)
                  </Button>
                </div>

                {caso.diagnosticos?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No se han registrado diagnósticos formales en este caso.</p>
                ) : (
                  <div className="space-y-4">
                    {caso.diagnosticos?.map(dt => (
                      <div key={dt.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {dt.codigoDT}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              Tipo: {dt.tipoFalla}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              dt.estado === "APROBADO" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              dt.estado === "RECHAZADO" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {dt.estado}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generarInformeTecnicoCasoPDF(caso, dt)}
                              className="text-xs h-7 border-slate-300 text-slate-700 gap-1"
                            >
                              <Download className="w-3 h-3 text-[#2369A1]" />
                              Informe Técnico Formal (PDF)
                            </Button>

                            {/* Botón para registrar decisión si está pendiente */}
                            {dt.estado !== "APROBADO" && dt.estado !== "RECHAZADO" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDTForDecision(dt)
                                  setModalDecisionDTOpen(true)
                                }}
                                className="bg-[#2369A1] text-white text-xs h-7"
                              >
                                Decisión Cliente
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg">
                          <div>
                            <span className="font-bold text-slate-700 block">Causa Raíz / Hallazgos:</span>
                            <p className="text-slate-600 mt-0.5">{dt.hallazgos}</p>
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 block">Diagnóstico Detallado:</span>
                            <p className="text-slate-600 mt-0.5">{dt.diagnosticoDetallado}</p>
                          </div>
                        </div>

                        {dt.requiereRepuestos && dt.repuestosRequeridos?.length > 0 && (
                          <div className="text-xs border border-slate-200 rounded-lg overflow-hidden">
                            <div className="bg-slate-100 px-3 py-1 font-bold text-slate-700 text-[11px]">
                              Repuestos Cotizados / Requeridos ({dt.repuestosRequeridos.length})
                            </div>
                            <div className="p-2 space-y-1">
                              {dt.repuestosRequeridos.map((r, i) => (
                                <div key={i} className="flex justify-between text-slate-600 text-[11px] px-2 py-0.5">
                                  <span>{r.descripcion} <span className="font-mono text-slate-400">({r.partNumber})</span></span>
                                  <span className="font-bold">Cant: {r.cantidad}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>Evaluador: <strong>{dt.tecnicoResponsable}</strong></span>
                          <span>Fecha: {format(new Date(dt.fecha), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Órdenes de Servicio (OS) */}
            {activeTab === "ordenes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Órdenes de Trabajo Ejecutadas (OS)
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setModalOSOpen(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Generar Orden de Trabajo (OS)
                  </Button>
                </div>

                {caso.ordenesServicio?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No hay órdenes de servicio generadas aún.</p>
                ) : (
                  <div className="space-y-4">
                    {caso.ordenesServicio?.map(os => (
                      <div key={os.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                              {os.codigoOS}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              Tipo: {os.tipo}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              os.estado === "FINALIZADA" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              os.estado === "EN_EJECUCION" ? "bg-violet-50 text-violet-700 border-violet-200" :
                              "bg-purple-50 text-purple-700 border-purple-200"
                            }`}>
                              {os.estado}
                            </span>
                          </div>

                          {os.estado !== "FINALIZADA" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedOSForQA(os)
                                setModalQAOpen(true)
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Registrar QA y Finalizar
                            </Button>
                          )}
                        </div>

                        <div className="text-xs bg-slate-50 p-3 rounded-lg space-y-1">
                          <span className="font-bold text-slate-700">Actividades Técnicas:</span>
                          <p className="text-slate-600">{os.actividades}</p>
                        </div>

                        {os.pruebasQA && (
                          <div className="text-xs bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-lg">
                            <span className="font-bold text-emerald-900 block flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Control de Calidad (QA) Superado
                            </span>
                            <p className="text-emerald-800 text-[11px] mt-0.5">{os.pruebasQA.observacionesQA}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>Técnico Asignado: <strong>{os.tecnicoAsignado}</strong> • Horas: {os.horasHombre}h</span>
                          <span>Iniciado: {os.fechaInicio ? format(new Date(os.fechaInicio), "dd/MM/yyyy HH:mm") : "N/A"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: Constancias de Atención Simple */}
            {activeTab === "constancias" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Constancias de Atención Simple (Sin Diagnóstico Formal)
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setModalAtencionSimpleOpen(true)}
                    className="bg-[#2369A1] text-white text-xs h-7"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nueva Constancia
                  </Button>
                </div>

                {caso.constancias?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No se han registrado constancias simples en este caso.</p>
                ) : (
                  <div className="space-y-4">
                    {caso.constancias?.map(cst => (
                      <div key={cst.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {cst.codigoConstancia}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {cst.motivoSoporte}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generarConstanciaAtencionPDF(caso, cst)}
                            className="text-xs h-7 border-slate-300 text-slate-700 gap-1"
                          >
                            <Download className="w-3 h-3 text-[#2369A1]" />
                            Descargar Constancia (PDF)
                          </Button>
                        </div>

                        <div className="text-xs bg-slate-50 p-3 rounded-lg space-y-1">
                          <span className="font-bold text-slate-700">Actividades:</span>
                          <p className="text-slate-600">{cst.actividadesRealizadas}</p>
                          <span className="font-bold text-slate-700 block pt-1">Resultado:</span>
                          <p className="text-slate-600">{cst.resultado}</p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>Técnico: <strong>{cst.tecnicoResponsable}</strong></span>
                          <span>Fecha: {format(new Date(cst.fecha), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: Garantía & Liquidación */}
            {activeTab === "garantia" && (
              <div className="space-y-4 max-w-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Gestión de Garantías y Liquidación Final
                </h3>

                <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Estado de Cobertura de Garantía
                      </h4>
                      <p className="text-xs text-slate-500">
                        {caso.garantia?.activa ? "Garantía actualmente activa para este activo." : "Sin garantía activa."}
                      </p>
                    </div>
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
                        <span className="text-slate-500">Fecha de Vencimiento:</span>
                        <p className="font-bold text-emerald-700">
                          {format(new Date(caso.garantia.fechaVencimientoGarantia), "dd/MM/yyyy")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      onClick={() => setModalEntregaOpen(true)}
                      className="bg-[#2369A1] text-white text-xs"
                    >
                      Actualizar Plazo de Garantía
                    </Button>

                    {caso.estado !== "CERRADO" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setModalCierreOpen(true)}
                        className="text-xs border-slate-300"
                      >
                        Firmar Liquidación Final y Cerrar
                      </Button>
                    )}
                  </div>
                </div>

                {caso.liquidacionFinal && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Liquidación Final Registrada
                    </span>
                    <p className="text-xs text-slate-600">{caso.liquidacionFinal.observaciones}</p>
                    <p className="text-[11px] text-slate-400">
                      Firmado por: <strong>{caso.liquidacionFinal.firmadoPor}</strong> el {format(new Date(caso.liquidacionFinal.fechaLiquidacion), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                )}
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

          <form onSubmit={handleGuardarAtencionSimple} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Motivo del Soporte *</Label>
              <Input
                value={constanciaMotivo}
                onChange={(e) => setConstanciaMotivo(e.target.value)}
                placeholder="Ej. Limpieza interna y configuración"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Actividades Realizadas *</Label>
              <textarea
                value={constanciaActividades}
                onChange={(e) => setConstanciaActividades(e.target.value)}
                placeholder="Detalle de actividades menores ejecutadas..."
                rows={2}
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Resultado Técnico *</Label>
              <Input
                value={constanciaResultado}
                onChange={(e) => setConstanciaResultado(e.target.value)}
                placeholder="Ej. Equipo operativo a plena conformidad"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Técnico Ejecutor</Label>
              <Input
                value={constanciaTecnico}
                onChange={(e) => setConstanciaTecnico(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalAtencionSimpleOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#2369A1] text-xs">
                Emitir y Firmar Constancia
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
      {/* MODAL DECISIÓN CLIENTE SOBRE DT */}
      {/* ========================================================================= */}
      <Dialog open={modalDecisionDTOpen} onOpenChange={setModalDecisionDTOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Aprobación de Propuesta Técnica ({selectedDTForDecision?.codigoDT})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              El cliente o jefatura autoriza la intervención técnica o rechaza la cotización.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarDecisionDT} className="space-y-3 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDecisionAprobado(true)}
                className={`flex-1 p-3 rounded-lg border text-xs font-semibold text-center ${
                  decisionAprobado 
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600" 
                    : "border-slate-200 text-slate-600"
                }`}
              >
                ✓ APROBAR Propuesta
              </button>
              <button
                type="button"
                onClick={() => setDecisionAprobado(false)}
                className={`flex-1 p-3 rounded-lg border text-xs font-semibold text-center ${
                  !decisionAprobado 
                    ? "border-rose-600 bg-rose-50 text-rose-800 ring-1 ring-rose-600" 
                    : "border-slate-200 text-slate-600"
                }`}
              >
                ✕ RECHAZAR Propuesta
              </button>
            </div>

            {!decisionAprobado && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Motivo del Rechazo *</Label>
                <Input
                  value={decisionMotivoRechazo}
                  onChange={(e) => setDecisionMotivoRechazo(e.target.value)}
                  placeholder="Ej. Presupuesto excede límite comercial"
                  className="text-xs"
                  required={!decisionAprobado}
                />
                <p className="text-[10px] text-rose-600 mt-0.5">
                  El caso pasará a CERRADO SIN REPARACIÓN y se emitirá acta de devolución.
                </p>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalDecisionDTOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#2369A1] text-xs">
                Registrar Decisión
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: GENERAR ORDEN DE SERVICIO (OS) */}
      {/* ========================================================================= */}
      <Dialog open={modalOSOpen} onOpenChange={setModalOSOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              3. Generar Orden de Servicio (OS)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Asigna trabajo técnico operativo al laboratorio (Estado pasará a EN REPARACIÓN).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarOS} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Trabajo</Label>
                <select
                  value={osTipo}
                  onChange={(e) => setOsTipo(e.target.value as any)}
                  className="w-full text-xs h-8 rounded border border-slate-200 px-2"
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
                  className="text-xs"
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
                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Horas Estimadas</Label>
              <Input
                type="number"
                value={osHorasEstimadas}
                onChange={(e) => setOsHorasEstimadas(Number(e.target.value))}
                className="text-xs"
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
