"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  getCasoByCodigo,
  suscribirCaso,
  registrarNuevaIncidencia,
  registrarAtencionSimple,
  actualizarConstanciaAtencion,
  registrarDiagnosticoTecnico,
  registrarDecisionPropuestaTecnica,
  guardarIntervencionTecnicaOS,
  registrarPruebasQAyFinalizarOS,
  asegurarInformeTecnicoCaso,
  asegurarTrazabilidadOrdenadaEnSesion,
  registrarEntregaYActivarGarantia,
  firmarLiquidacionYCerrarCaso
} from "@/services/casoService"
import { getRepuestosCatalogo, crearRepuesto } from "@/services/repuestoService"
import { getUsuariosSistema, resolverNombreTecnico } from "@/services/usuarioService"
import {
  Caso,
  IncidenciaCaso,
  DiagnosticoTecnicoCaso,
  OrdenServicioTrabajo,
  InformeTecnicoCaso,
  PruebasQAChecklist,
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
import { generarInformeTecnicoFinalCaso } from "@/lib/pdf/Constancia"
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
  CheckCircle,
  History,
  Sparkles,
  Search,
  Package,
  Trash2,
  PlusCircle,
  GitBranch
} from "lucide-react"
import { toast } from "sonner"
import { referenciaServicioCaso } from "@/lib/pdf/pdfTheme"
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
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false)
  const [modalCierreOpen, setModalCierreOpen] = useState(false)

  // Formulario: Nueva Incidencia
  const [nuevaIncFalla, setNuevaIncFalla] = useState("")
  const [nuevaIncPrioridad, setNuevaIncPrioridad] = useState<PrioridadIncidencia>("MEDIA")
  const [nuevaIncOrigen, setNuevaIncOrigen] = useState<OrigenIncidencia>("TALLER")
  const [nuevaIncRequiereDT, setNuevaIncRequiereDT] = useState(true)
  const [nuevaIncEsGarantia, setNuevaIncEsGarantia] = useState(false)

  // Formulario: Atención Simple (Constancia)
  const [constanciaEditandoId, setConstanciaEditandoId] = useState<string | null>(null)
  const [constanciaFechaIngreso, setConstanciaFechaIngreso] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [constanciaFechaSalida, setConstanciaFechaSalida] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [constanciaTicketItop, setConstanciaTicketItop] = useState("")
  const [constanciaFallaReal, setConstanciaFallaReal] = useState("")
  const [constanciaActividades, setConstanciaActividades] = useState("Limpieza interna, remoción de polvo, optimización y pruebas de operatividad.")
  const [constanciaResultado, setConstanciaResultado] = useState("Equipo operativo a plena satisfacción.")
  const [constanciaObservaciones, setConstanciaObservaciones] = useState("Ninguna")
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

  // Buscador Normalizado de Repuestos para Modal DT (repuestosCatalogo en Firestore)
  const [repuestoSelId, setRepuestoSelId] = useState("")
  const [repuestoCantidad, setRepuestoCantidad] = useState(1)
  const [busquedaRepuesto, setBusquedaRepuesto] = useState("")
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  // Formulario para Registrar Nuevo Repuesto Detallado (si no existe en catálogo)
  const [mostrarFormNuevoRepuesto, setMostrarFormNuevoRepuesto] = useState(false)
  const [nuevoRepuestoPN, setNuevoRepuestoPN] = useState("")
  const [nuevoRepuestoDesc, setNuevoRepuestoDesc] = useState("")
  const [nuevoRepuestoCat, setNuevoRepuestoCat] = useState("Hardware")
  const [nuevoRepuestoModelo, setNuevoRepuestoModelo] = useState("")
  const [nuevoRepuestoCantidad, setNuevoRepuestoCantidad] = useState(1)
  const [guardandoNuevoRepuesto, setGuardandoNuevoRepuesto] = useState(false)

  // Catálogo de repuestos filtrados en tiempo real (acotado para una interfaz limpia y ligera)
  const repuestosFiltrados = useMemo(() => {
    const q = busquedaRepuesto.trim().toLowerCase()
    if (!q) return repuestosCatalogo.slice(0, 6)
    return repuestosCatalogo.filter(r =>
      r.id.toLowerCase().includes(q) ||
      (r.descripcion && r.descripcion.toLowerCase().includes(q)) ||
      (r.modeloCompatible && r.modeloCompatible.toLowerCase().includes(q)) ||
      (r.categoria && r.categoria.toLowerCase().includes(q))
    ).slice(0, 8)
  }, [repuestosCatalogo, busquedaRepuesto])

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

  // Flujo Interno de Etapa 3: Paso 1 (Esfuerzo Técnico / Actividades y Tiempo) -> Paso 2 (Protocolo QA y Dictamen)
  const DEFAULT_QA_OBS_REPARADO =
    "Protocolo QA superado: encendido y POST de BIOS, funcionamiento del repuesto/componente intervenido, pruebas de red/puertos y limpieza externa conformes."

  const toDatetimeLocal = (iso?: string | null) => {
    try {
      const d = iso ? new Date(iso) : new Date()
      if (isNaN(d.getTime())) return format(new Date(), "yyyy-MM-dd'T'HH:mm")
      return format(d, "yyyy-MM-dd'T'HH:mm")
    } catch {
      return format(new Date(), "yyyy-MM-dd'T'HH:mm")
    }
  }

  const [etapa3PasoManual, setEtapa3PasoManual] = useState<1 | 2 | null>(null)
  const [etapa3SyncKey, setEtapa3SyncKey] = useState("")
  const [guardandoIntervencion, setGuardandoIntervencion] = useState(false)
  const [guardandoQA, setGuardandoQA] = useState(false)

  // Paso 3.1: Técnico Ejecutor, Actividades Realizadas y Horas-Hombre
  const [modoCodigoOS, setModoCodigoOS] = useState<"AUTO" | "MANUAL">("AUTO")
  const [codigoOSManual, setCodigoOSManual] = useState("")
  const [osTipo, setOsTipo] = useState<TipoOrdenServicio>("CORRECTIVA")
  const [intervTecnico, setIntervTecnico] = useState("")
  const [intervActividades, setIntervActividades] = useState("")
  const [intervPiezas, setIntervPiezas] = useState("")
  const [intervHoras, setIntervHoras] = useState(2)
  const [intervFechaInicio, setIntervFechaInicio] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [intervFechaFin, setIntervFechaFin] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"))

  // Paso 3.2: Protocolo de Pruebas de Calidad (QA) y Dictamen Final
  const [qaChecklist, setQaChecklist] = useState<PruebasQAChecklist>({
    encendidoPostBios: false,
    funcionamientoRepuesto: false,
    pruebasRedPuertos: false,
    limpiezaExterna: false
  })
  const [qaResultadoOperatividad, setQaResultadoOperatividad] = useState<"REPARADO" | "OBSERVADO" | "INOPERATIVO">("REPARADO")
  const [qaObservaciones, setQaObservaciones] = useState(DEFAULT_QA_OBS_REPARADO)
  const [qaFirmaDigital, setQaFirmaDigital] = useState("")
  const [qaFirmaAceptada, setQaFirmaAceptada] = useState(true)

  const tecnicosDisponibles = useMemo(() => {
    const nombres = new Set<string>()
    usuarios
      .filter(u => u.activo !== false && (u.rol === "TECNICO" || u.rol === "ADMIN"))
      .forEach(u => {
        if (u.nombreCompleto?.trim()) nombres.add(u.nombreCompleto.trim())
      })
    if (operadorNombre?.trim()) nombres.add(operadorNombre.trim())
    return Array.from(nombres)
  }, [usuarios, operadorNombre])

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

    asegurarTrazabilidadOrdenadaEnSesion().catch((err) => {
      console.warn("Auditoría de trazabilidad en expediente:", err)
    })

    getCasoByCodigo(codigo)
      .then(data => {
        setCaso(data)
        if (data) {
          setEntregaReceptor(data.cliente.contacto || "")
          setEntregaDni(data.cliente.ruc || "")
          if (data.garantia?.activa) setNuevaIncEsGarantia(true)
          if (['ABIERTO', 'EN_DIAGNOSTICO', 'DIAGNOSTICADO', 'APROBADO_PARA_REPARACION', 'PENDIENTE_DE_APROBACION'].includes(data.estado)) {
            setActiveTab("etapa2")
          } else if (['EN_REPARACION', 'EN_PRUEBAS', 'OBSERVADO'].includes(data.estado)) {
            setActiveTab("etapa3")
          } else if (['REPARADO', 'INOPERATIVO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION', 'DIAGNOSTICADO_NO_APROBADO'].includes(data.estado)) {
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
      setIntervTecnico(prev => prev || operadorNombre)
      setOsTecnicoDecision(operadorNombre)
    }
  }, [operadorNombre])

  // Sincronización reactiva del flujo interno de Etapa 3 cuando carga/cambia la OS activa
  useEffect(() => {
    if (!caso) return
    const incs = caso.incidencias || []
    const uInc = incs[incs.length - 1] || incs[0]
    const dtRel = caso.diagnosticos?.find(dt => dt.incidenciaId === uInc?.id)
      || (incs.length <= 1 ? caso.diagnosticos?.[caso.diagnosticos.length - 1] : undefined)
    const osRel = caso.ordenesServicio?.find(os =>
      (dtRel && (os.diagnosticoId === dtRel.id || os.diagnosticoId === dtRel.codigoDT)) ||
      (uInc && os.incidenciaId === uInc.id)
    ) || (incs.length <= 1 ? caso.ordenesServicio?.[caso.ordenesServicio.length - 1] : undefined)

    const syncKey = `${caso.codigoCaso}|${uInc?.id || ""}|${osRel?.id || "SIN_OS"}|${osRel?.estado || ""}`
    if (etapa3SyncKey === syncKey) return
    setEtapa3SyncKey(syncKey)
    setEtapa3PasoManual(null)

    const piezasSugeridasDT = dtRel?.requiereRepuestos && dtRel.repuestosRequeridos?.length
      ? dtRel.repuestosRequeridos.map(r => `${r.partNumber} - ${r.descripcion} (x${r.cantidad})`).join("; ")
      : ""

    setIntervTecnico(osRel?.tecnicoAsignado || operadorNombre)
    setIntervActividades(osRel?.actividadesRealizadas || "")
    setIntervPiezas(osRel?.piezasReemplazadas || piezasSugeridasDT)
    setIntervHoras(osRel?.horasHombreReales || osRel?.horasHombre || 2)
    setIntervFechaInicio(toDatetimeLocal(osRel?.fechaInicio))
    setIntervFechaFin(toDatetimeLocal(osRel?.fechaFin))

    const prevRes = osRel?.pruebasQA?.resultadoOperatividad
      || (osRel?.pruebasQA ? (osRel.pruebasQA.superoQA ? "REPARADO" : "OBSERVADO") : "REPARADO")
    setQaResultadoOperatividad(prevRes)

    const prevChecks = osRel?.pruebasQA?.checklist
    const defaultCheckVal = osRel?.pruebasQA ? Boolean(osRel.pruebasQA.superoQA) : false
    setQaChecklist({
      encendidoPostBios: prevChecks?.encendidoPostBios ?? defaultCheckVal,
      funcionamientoRepuesto: prevChecks?.funcionamientoRepuesto ?? defaultCheckVal,
      pruebasRedPuertos: prevChecks?.pruebasRedPuertos ?? defaultCheckVal,
      limpiezaExterna: prevChecks?.limpiezaExterna ?? defaultCheckVal
    })

    setQaObservaciones(
      osRel?.pruebasQA?.observacionesQA ||
      (prevRes === "REPARADO" ? DEFAULT_QA_OBS_REPARADO : "")
    )
    setQaFirmaDigital(osRel?.firmaDigitalTecnico || osRel?.tecnicoAsignado || operadorNombre)
    setQaFirmaAceptada(true)
  }, [caso, operadorNombre, etapa3SyncKey])

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

  const normalizarFechaParaInputDate = (val?: string | null): string => {
    if (!val) return format(new Date(), "yyyy-MM-dd")
    const s = String(val).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mSlash) return `${mSlash[3]}-${mSlash[2].padStart(2, "0")}-${mSlash[1].padStart(2, "0")}`
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10)
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd")
    } catch { }
    return format(new Date(), "yyyy-MM-dd")
  }

  const formatearFechaVisualConstancia = (val?: string | null, fallbackIso?: string | null): string => {
    const raw = (val || fallbackIso || "").trim()
    if (!raw) return format(new Date(), "dd/MM/yyyy")
    const mYmd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (mYmd) return `${mYmd[3]}/${mYmd[2]}/${mYmd[1]}`
    const mSlash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mSlash) return `${mSlash[1].padStart(2, "0")}/${mSlash[2].padStart(2, "0")}/${mSlash[3]}`
    try {
      return format(new Date(raw), "dd/MM/yyyy")
    } catch {
      return raw
    }
  }

  const abrirModalNuevaConstancia = () => {
    const incRef = caso?.incidencias?.[caso.incidencias.length - 1] || caso?.incidencias?.[0]
    const fechaBase = normalizarFechaParaInputDate(incRef?.fecha || caso?.fechaApertura)
    setConstanciaEditandoId(null)
    setConstanciaFechaIngreso(fechaBase)
    setConstanciaFechaSalida(fechaBase)
    setConstanciaTicketItop("")
    setConstanciaFallaReal("")
    setConstanciaActividades("Limpieza interna, remoción de polvo, optimización y pruebas de operatividad.")
    setConstanciaResultado("Equipo operativo a plena satisfacción.")
    setConstanciaObservaciones("Ninguna")
    setConstanciaTecnico(resolverNombreTecnico(operadorNombre, usuarios))
    setModalAtencionSimpleOpen(true)
  }

  const abrirModalEditarConstancia = (cst: ConstanciaAtencionSimple) => {
    const incRef =
      (cst.incidenciaId ? caso?.incidencias?.find((i) => i.id === cst.incidenciaId) : undefined) ||
      caso?.incidencias?.[0]
    setConstanciaEditandoId(cst.id || cst.codigoConstancia)
    setConstanciaFechaIngreso(
      normalizarFechaParaInputDate(cst.fechaIngreso || incRef?.fecha || caso?.fechaApertura || cst.fecha)
    )
    setConstanciaFechaSalida(
      normalizarFechaParaInputDate(cst.fechaSalida || cst.fecha || incRef?.fecha)
    )
    setConstanciaTicketItop(cst.ticketItop || "")
    setConstanciaFallaReal(cst.fallaReal || "")
    setConstanciaActividades(cst.actividadesRealizadas || "")
    setConstanciaResultado(cst.resultado || "")
    setConstanciaObservaciones(cst.observaciones || "Ninguna")
    setConstanciaTecnico(resolverNombreTecnico(cst.tecnicoResponsable, usuarios, cst.tecnicoId) || operadorNombre)
    setModalAtencionSimpleOpen(true)
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
    if (!constanciaFechaIngreso || !constanciaFechaSalida) {
      toast.error("Por favor ingrese la fecha de ingreso y de salida del servicio.")
      return
    }
    try {
      const tecElegido = resolverNombreTecnico(constanciaTecnico || operadorNombre, usuarios)
      const usuarioMatch = usuarios.find(
        (u) => u.nombreCompleto.trim().toLowerCase() === tecElegido.trim().toLowerCase()
      )

      if (constanciaEditandoId) {
        const actualizada = await actualizarConstanciaAtencion(codigo, constanciaEditandoId, {
          fechaIngreso: constanciaFechaIngreso,
          horaIngreso: "",
          fechaSalida: constanciaFechaSalida,
          horaSalida: "",
          ticketItop: constanciaTicketItop.trim().toUpperCase(),
          fallaReal: constanciaFallaReal.trim() || undefined,
          actividadesRealizadas: constanciaActividades.trim(),
          resultado: constanciaResultado.trim(),
          observaciones: constanciaObservaciones.trim() || "Ninguna",
          tecnicoResponsable: tecElegido,
          tecnicoId: usuarioMatch?.id
        })
        toast.success(`Constancia ${actualizada.codigoConstancia} actualizada con éxito.`)
        setModalAtencionSimpleOpen(false)
        setConstanciaEditandoId(null)
        if (caso) generarConstanciaAtencionPDF(caso, actualizada)
        return
      }

      const incActual = caso?.incidencias?.[caso.incidencias.length - 1] || caso?.incidencias?.[0]
      const motivoDesdeIngreso = incActual?.descripcion || "Soporte menor / mantenimiento preventivo"
      const res = await registrarAtencionSimple(codigo, {
        incidenciaId: incActual?.id,
        motivoSoporte: motivoDesdeIngreso,
        fallaReal: constanciaFallaReal.trim() || undefined,
        actividadesRealizadas: constanciaActividades.trim(),
        resultado: constanciaResultado.trim(),
        ticketItop: constanciaTicketItop.trim().toUpperCase(),
        observaciones: constanciaObservaciones.trim() || "Ninguna",
        tecnicoResponsable: tecElegido,
        tecnicoId: usuarioMatch?.id,
        fechaIngreso: constanciaFechaIngreso,
        horaIngreso: "",
        fechaSalida: constanciaFechaSalida,
        horaSalida: ""
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
    if (!dtDetalle.trim() || !dtHallazgos.trim()) {
      toast.error("Completa el diagnóstico detallado y la falla real.")
      return
    }
    if (dtRequiereRepuestos && dtRepuestosSeleccionados.length === 0) {
      toast.error("Ha marcado que el caso requiere repuestos. Debe vincular al menos una pieza del catálogo normalizado repuestosCatalogo.")
      return
    }
    try {
      const incActual = caso?.incidencias?.[caso.incidencias.length - 1] || caso?.incidencias?.[0]
      const tecElegido = resolverNombreTecnico(dtTecnico || operadorNombre, usuarios)
      const nuevoDt = await registrarDiagnosticoTecnico(codigo, {
        incidenciaId: incActual?.id,
        tecnicoResponsable: tecElegido,
        tipoFalla: dtTipoFalla,
        hallazgos: dtHallazgos,
        diagnosticoDetallado: dtDetalle,
        danosFisicos: dtDanosFisicos,
        requiereRepuestos: dtRequiereRepuestos,
        repuestosRequeridos: dtRepuestosSeleccionados,
        recomendaciones: dtRecomendaciones,
        solucionPropuesta: dtRecomendaciones
      })
      toast.success(`Diagnóstico ${nuevoDt.codigoDT} registrado en expediente. Estado: DIAGNOSTICADO.`)
      setModalDiagnosticoOpen(false)
      setDtHallazgos("")
      setDtDetalle("")
      setDtDanosFisicos("")
      setDtRecomendaciones("")
      setDtRequiereRepuestos(false)
      setDtRepuestosSeleccionados([])
      setRepuestoSelId("")
      setRepuestoCantidad(1)
      setBusquedaRepuesto("")
      if (caso) {
        generarInformeTecnicoCasoPDF({ ...caso, estado: 'DIAGNOSTICADO' }, nuevoDt)
      }
    } catch (err: any) {
      toast.error(err.message || "Error al registrar diagnóstico.")
    }
  }

  const handleAgregarRepuesto = () => {
    if (!repuestoSelId) {
      toast.error("Seleccione un repuesto de la lista o registre una nueva pieza.")
      return
    }
    const item = repuestosCatalogo.find(r => r.id === repuestoSelId)
    if (!item) {
      toast.error("El repuesto seleccionado no existe en el catálogo.")
      return
    }

    const existenteIndex = dtRepuestosSeleccionados.findIndex(r => r.partNumber === item.id)
    if (existenteIndex >= 0) {
      setDtRepuestosSeleccionados(prev => prev.map((r, i) =>
        i === existenteIndex ? { ...r, cantidad: r.cantidad + Math.max(1, repuestoCantidad) } : r
      ))
      toast.success(`Se sumaron ${repuestoCantidad} und a [${item.id}].`)
    } else {
      setDtRepuestosSeleccionados(prev => [
        ...prev,
        {
          partNumber: item.id,
          descripcion: item.descripcion,
          cantidad: Math.max(1, repuestoCantidad)
        }
      ])
      toast.success(`Pieza [${item.id}] vinculada al diagnóstico.`)
    }
    setRepuestoSelId("")
    setRepuestoCantidad(1)
    setBusquedaRepuesto("")
    setMostrarSugerencias(false)
  }

  const handleGuardarNuevoRepuesto = async () => {
    const pn = nuevoRepuestoPN.trim().toUpperCase()
    const desc = nuevoRepuestoDesc.trim()
    if (!pn) {
      toast.error("Debe ingresar el Part Number (P/N) de la pieza.")
      return
    }
    if (!desc) {
      toast.error("Debe ingresar la descripción técnica detallada.")
      return
    }

    setGuardandoNuevoRepuesto(true)
    try {
      const nuevoItem: RepuestoCatalogo = {
        id: pn,
        descripcion: desc,
        marca: caso?.equipo?.marca || "HP",
        modeloCompatible: nuevoRepuestoModelo.trim() || caso?.equipo?.modelo || "General",
        categoria: nuevoRepuestoCat || "Hardware",
        stock: 0,
        activo: true
      }

      await crearRepuesto(nuevoItem)

      setRepuestosCatalogo(prev => {
        const sinDuplicado = prev.filter(r => r.id !== pn)
        return [nuevoItem, ...sinDuplicado]
      })

      const cant = Math.max(1, nuevoRepuestoCantidad)
      const existenteIndex = dtRepuestosSeleccionados.findIndex(r => r.partNumber === pn)
      if (existenteIndex >= 0) {
        setDtRepuestosSeleccionados(prev => prev.map((r, i) =>
          i === existenteIndex ? { ...r, cantidad: r.cantidad + cant } : r
        ))
      } else {
        setDtRepuestosSeleccionados(prev => [
          ...prev,
          {
            partNumber: pn,
            descripcion: desc,
            cantidad: cant
          }
        ])
      }

      toast.success(`Pieza [${pn}] registrada en catálogo y vinculada al DT.`)

      setNuevoRepuestoPN("")
      setNuevoRepuestoDesc("")
      setNuevoRepuestoCat("Hardware")
      setNuevoRepuestoModelo("")
      setNuevoRepuestoCantidad(1)
      setMostrarFormNuevoRepuesto(false)
      setBusquedaRepuesto("")
      setRepuestoSelId("")
      setMostrarSugerencias(false)
    } catch (err: any) {
      console.error(err)
      toast.error("Error al registrar el nuevo repuesto en el catálogo.")
    } finally {
      setGuardandoNuevoRepuesto(false)
    }
  }

  const handleEliminarRepuesto = (index: number) => {
    setDtRepuestosSeleccionados(prev => prev.filter((_, i) => i !== index))
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
        if (caso && selectedDTForDecision) {
          const dtConRechazo = {
            ...selectedDTForDecision,
            aprobacionCliente: {
              fechaDecision: new Date().toISOString(),
              aprobado: false,
              motivoRechazo: decisionMotivoRechazo
            }
          }
          generarInformeTecnicoCasoPDF(
            { ...caso, estado: 'CERRADO_SIN_REPARACION' },
            dtConRechazo
          )
        }
      }

      setModalDecisionDTOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Error al registrar decisión.")
    }
  }

  // PASO 3.1 (Flujo interno Etapa 3): Guardar Técnico Ejecutor, Actividades Realizadas y Horas-Hombre -> Pasa a QA
  const handleGuardarIntervencionPaso1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intervTecnico.trim()) {
      toast.error("Seleccione al Técnico Ejecutor responsable de la reparación.")
      return
    }
    if (!intervActividades.trim()) {
      toast.error("Detalle las actividades técnicas ejecutadas en taller.")
      return
    }
    const horasNum = Number(intervHoras)
    if (!horasNum || horasNum <= 0) {
      toast.error("Consigne las horas-hombre invertidas (mayor a 0).")
      return
    }

    const incActual = caso?.incidencias?.[caso.incidencias.length - 1] || caso?.incidencias?.[0]
    const dtRelacionado = caso?.diagnosticos?.find(dt => dt.incidenciaId === incActual?.id)
      || (caso?.incidencias && caso.incidencias.length <= 1 ? caso.diagnosticos?.[caso.diagnosticos.length - 1] : undefined)
    const osExistente = caso?.ordenesServicio?.find(os =>
      (dtRelacionado && (os.diagnosticoId === dtRelacionado.id || os.diagnosticoId === dtRelacionado.codigoDT)) ||
      (incActual && os.incidenciaId === incActual.id)
    ) || (caso?.incidencias && caso.incidencias.length <= 1 ? caso?.ordenesServicio?.[caso.ordenesServicio.length - 1] : undefined)

    if (!osExistente && modoCodigoOS === "MANUAL" && !codigoOSManual.trim()) {
      toast.error("Digite el código de Orden de Servicio externo o seleccione correlativo automático.")
      return
    }

    const inicioDate = intervFechaInicio ? new Date(intervFechaInicio) : new Date()
    const finDate = intervFechaFin ? new Date(intervFechaFin) : new Date()
    if (!isNaN(inicioDate.getTime()) && !isNaN(finDate.getTime()) && finDate.getTime() < inicioDate.getTime()) {
      toast.error("La fecha/hora de término no puede ser anterior a la de inicio.")
      return
    }

    setGuardandoIntervencion(true)
    try {
      const osGuardada = await guardarIntervencionTecnicaOS(codigo, {
        osId: osExistente?.id,
        codigoOSManual: !osExistente && modoCodigoOS === "MANUAL" ? codigoOSManual.trim().toUpperCase() : undefined,
        tipo: osTipo,
        incidenciaId: incActual?.id,
        diagnosticoId: dtRelacionado?.id || dtRelacionado?.codigoDT,
        tecnicoAsignado: intervTecnico.trim(),
        actividadesRealizadas: intervActividades.trim(),
        piezasReemplazadas: intervPiezas.trim() || undefined,
        horasHombreReales: horasNum,
        fechaInicio: !isNaN(inicioDate.getTime()) ? inicioDate.toISOString() : new Date().toISOString(),
        fechaFin: !isNaN(finDate.getTime()) ? finDate.toISOString() : new Date().toISOString(),
        autor: operadorNombre
      })
      setQaFirmaDigital(prev => prev || osGuardada.tecnicoAsignado || operadorNombre)
      setEtapa3PasoManual(null)
      setCodigoOSManual("")
      setModoCodigoOS("AUTO")
      toast.success(`Actividades y esfuerzo (${horasNum} h-h) registrados en ${osGuardada.codigoOS}. Continúe con las Pruebas de Calidad (QA).`)
    } catch (err: any) {
      toast.error(err.message || "Error al guardar las actividades de intervención.")
    } finally {
      setGuardandoIntervencion(false)
    }
  }

  // PASO 3.2 (Flujo interno Etapa 3): Protocolo de Pruebas de Calidad (QA) y Dictamen Final
  const handleGuardarQAPaso2 = async (e: React.FormEvent) => {
    e.preventDefault()
    const incActual = caso?.incidencias?.[caso.incidencias.length - 1] || caso?.incidencias?.[0]
    const dtRelacionado = caso?.diagnosticos?.find(dt => dt.incidenciaId === incActual?.id)
      || (caso?.incidencias && caso.incidencias.length <= 1 ? caso.diagnosticos?.[caso.diagnosticos.length - 1] : undefined)
    const osParaQA = caso?.ordenesServicio?.find(os =>
      (dtRelacionado && (os.diagnosticoId === dtRelacionado.id || os.diagnosticoId === dtRelacionado.codigoDT)) ||
      (incActual && os.incidenciaId === incActual.id)
    ) || (caso?.incidencias && caso.incidencias.length <= 1 ? caso?.ordenesServicio?.[caso.ordenesServicio.length - 1] : undefined)

    if (!osParaQA) {
      toast.error("Primero registre las actividades realizadas y el tiempo en el Paso 1.")
      return
    }

    const todasPruebasSuperadas =
      qaChecklist.encendidoPostBios &&
      qaChecklist.funcionamientoRepuesto &&
      qaChecklist.pruebasRedPuertos &&
      qaChecklist.limpiezaExterna

    if (qaResultadoOperatividad === "REPARADO" && !todasPruebasSuperadas) {
      toast.error("Para dictaminar REPARADO / LISTO, debe verificar las 4 pruebas operativas del protocolo QA.")
      return
    }
    if (!qaObservaciones.trim()) {
      toast.error(
        qaResultadoOperatividad === "INOPERATIVO"
          ? "Sustente el daño irreversible o la falta de disponibilidad de partes discontinuadas."
          : "Ingrese las observaciones del control de calidad (QA)."
      )
      return
    }
    if (qaResultadoOperatividad !== "OBSERVADO" && !qaFirmaDigital.trim()) {
      toast.error("Confirme el técnico acreditador para cerrar formalmente la Orden de Servicio.")
      return
    }

    setGuardandoQA(true)
    try {
      const informeEmitido = await registrarPruebasQAyFinalizarOS(codigo, osParaQA.id, {
        actividadesRealizadas: osParaQA.actividadesRealizadas || intervActividades.trim() || osParaQA.actividades,
        piezasReemplazadas: osParaQA.piezasReemplazadas || intervPiezas.trim() || undefined,
        horasHombreReales: osParaQA.horasHombreReales || Number(intervHoras) || osParaQA.horasHombre || 1,
        checklist: qaChecklist,
        resultadoOperatividad: qaResultadoOperatividad,
        superoQA: qaResultadoOperatividad === "REPARADO",
        esIrreparable: qaResultadoOperatividad === "INOPERATIVO",
        observacionesQA: qaObservaciones.trim(),
        firmaDigitalTecnico: qaResultadoOperatividad !== "OBSERVADO" ? qaFirmaDigital.trim() : undefined,
        tecnico: qaFirmaDigital.trim() || osParaQA.tecnicoAsignado || operadorNombre
      })
      setEtapa3PasoManual(null)
      const sufijoIT = informeEmitido ? ` · Informe Técnico ${informeEmitido.codigoInforme} emitido` : ""
      if (qaResultadoOperatividad === "REPARADO") {
        toast.success(`Control QA aprobado: Orden ${osParaQA.codigoOS} finalizada${sufijoIT} y Etapa 4 habilitada.`)
      } else if (qaResultadoOperatividad === "INOPERATIVO") {
        toast.warning(`Dictamen INOPERATIVO registrado${sufijoIT}. Etapa 4 habilitada para baja técnica o reemplazo.`)
      } else {
        toast.info("Equipo marcado como OBSERVADO en QA. Retorna al Paso 1 para ajuste en taller.")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al registrar el protocolo QA.")
    } finally {
      setGuardandoQA(false)
    }
  }

  const handleDescargarInformeTecnicoFinal = async (osTargetId?: string) => {
    if (!caso) return
    try {
      const { caso: casoConIT, informe } = await asegurarInformeTecnicoCaso(
        caso.id || caso.codigoCaso,
        osTargetId
      )
      setCaso(casoConIT)
      await generarInformeTecnicoFinalCaso(casoConIT, { informe, osId: osTargetId })
    } catch (err) {
      console.error("Error asegurando correlativo IT del informe:", err)
      await generarInformeTecnicoFinalCaso(caso, { osId: osTargetId })
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

  const incidencias = caso.incidencias || []
  const primeraInc = incidencias[0]
  const ultimaInc = incidencias[incidencias.length - 1] || primeraInc

  // Diagnóstico asociado a la incidencia activa:
  // 1. Coincidencia por incidenciaId
  // 2. Fallback para expedientes con 1 sola incidencia o datos previos
  const dtActual = caso.diagnosticos?.find(dt => dt.incidenciaId === ultimaInc?.id)
    || (incidencias.length <= 1 ? caso.diagnosticos?.[caso.diagnosticos.length - 1] : undefined)

  // Constancia asociada a la incidencia activa:
  const constanciaActual = caso.constancias?.find(c => c.incidenciaId === ultimaInc?.id)
    || (incidencias.length <= 1 ? caso.constancias?.[caso.constancias.length - 1] : undefined)

  // OS asociada a la incidencia o DT activo:
  const osActual = caso.ordenesServicio?.find(os =>
    (dtActual && (os.diagnosticoId === dtActual.id || os.diagnosticoId === dtActual.codigoDT)) ||
    (ultimaInc && os.incidenciaId === ultimaInc.id)
  ) || (incidencias.length <= 1 ? caso.ordenesServicio?.[caso.ordenesServicio.length - 1] : undefined)

  const ultimoDT = dtActual || caso.diagnosticos?.[caso.diagnosticos.length - 1]
  const ultimaOS = osActual || caso.ordenesServicio?.[caso.ordenesServicio.length - 1]
  const ultimaConstancia = constanciaActual || caso.constancias?.[caso.constancias.length - 1]

  const informeActual: InformeTecnicoCaso | undefined =
    (osActual
      ? caso.informesTecnicos?.find(
        (it) =>
          (osActual.informeTecnicoId && it.codigoInforme === osActual.informeTecnicoId) ||
          it.ordenServicioId === osActual.codigoOS ||
          it.ordenServicioId === osActual.id
      )
      : undefined) ||
    (incidencias.length <= 1 ? caso.informesTecnicos?.[caso.informesTecnicos.length - 1] : undefined)
  const ultimoInforme = informeActual || caso.informesTecnicos?.[caso.informesTecnicos.length - 1]

  const estadoNorm = (caso.estado || "")
    .trim()
    .replace(/ /g, "_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()

  // Bifurcación clave del Flujo de Negocio para la Incidencia Activa:
  const requiereAnalisisTecnico = ultimaInc?.requiereAnalisisTecnico ?? true
  const tieneConstanciaActual = Boolean(constanciaActual)
  const tieneDTActual = Boolean(dtActual)
  const esRutaSimple = !requiereAnalisisTecnico

  const etapas = [
    {
      id: "etapa1" as const,
      num: 1,
      label: "Ingreso / Incidencia",
      sub: ultimaInc ? (ultimaInc.codigoINC || "Recepción") : (caso.origen === "ALQUILER" ? "Alquiler Corp." : "Recepción"),
      badge: "Listo",
      badgeColor: "bg-emerald-100 text-emerald-800",
      activo: false,
      completo: true
    },
    {
      id: "etapa2" as const,
      num: 2,
      label: esRutaSimple ? "2.A Atención Simple" : "2.B Diagnóstico",
      sub: esRutaSimple
        ? (tieneConstanciaActual ? `Constancia ${constanciaActual?.codigoConstancia}` : 'Requiere Constancia')
        : (dtActual ? `${dtActual.codigoDT} · ${dtActual.estado === 'APROBADO' ? 'Aprobado' : dtActual.estado === 'RECHAZADO' ? 'Rechazado' : 'Por Autorizar'}` : 'Pendiente DT'),
      badge: esRutaSimple
        ? (tieneConstanciaActual ? 'Listo' : 'En Curso')
        : (dtActual ? (dtActual.estado === 'APROBADO' ? 'Aprobado' : dtActual.estado === 'RECHAZADO' ? 'Rechazado' : 'Por Autorizar') : 'Pendiente'),
      badgeColor: esRutaSimple
        ? (tieneConstanciaActual ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800")
        : (dtActual?.estado === 'APROBADO' ? "bg-emerald-100 text-emerald-800" : dtActual?.estado === 'RECHAZADO' ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"),
      activo: esRutaSimple
        ? !tieneConstanciaActual
        : ['ABIERTO', 'EN_DIAGNOSTICO', 'PENDIENTE_DE_APROBACION', 'DIAGNOSTICADO'].includes(estadoNorm),
      completo: esRutaSimple
        ? tieneConstanciaActual
        : (['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'EN_PRUEBAS', 'REPARADO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(estadoNorm) || Boolean(dtActual?.estado === 'APROBADO'))
    },
    {
      id: "etapa3" as const,
      num: 3,
      label: esRutaSimple ? "3. Taller (Omitido)" : "3. Intervención & QA",
      sub: esRutaSimple
        ? 'No aplica a 2.A'
        : (osActual
          ? (osActual.estado === 'FINALIZADA'
            ? (osActual.pruebasQA?.resultadoOperatividad === 'INOPERATIVO' ? `${osActual.codigoOS} · Inoperativo` : `${osActual.codigoOS} · Reparado / Listo`)
            : osActual.estado === 'EN_PRUEBAS'
              ? `${osActual.codigoOS} · En Pruebas QA`
              : (osActual.pruebasQA?.resultadoOperatividad === 'OBSERVADO' ? `${osActual.codigoOS} · Observado` : `${osActual.codigoOS} · Actividades y Horas`))
          : (dtActual?.estado === 'APROBADO' ? 'Paso 1: Actividades' : 'Bloqueado')),
      badge: esRutaSimple
        ? 'No Aplica'
        : (osActual
          ? (osActual.estado === 'FINALIZADA'
            ? (osActual.pruebasQA?.resultadoOperatividad === 'INOPERATIVO' ? 'Inoperativo' : 'Reparado')
            : osActual.estado === 'EN_PRUEBAS'
              ? 'Paso 2: QA'
              : 'Paso 1: Taller')
          : (dtActual?.estado === 'APROBADO' ? 'Por Iniciar' : 'Bloqueado')),
      badgeColor: esRutaSimple
        ? "bg-slate-100 text-slate-500"
        : (osActual?.estado === 'FINALIZADA' ? "bg-emerald-100 text-emerald-800" : osActual ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"),
      activo: !esRutaSimple && ['APROBADO_PARA_REPARACION', 'EN_REPARACION', 'EN_PRUEBAS', 'OBSERVADO'].includes(estadoNorm),
      completo: esRutaSimple ? tieneConstanciaActual : ['REPARADO', 'INOPERATIVO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)
    },
    {
      id: "etapa4" as const,
      num: 4,
      label: "4. Entrega y Cierre",
      sub: ['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)
        ? 'Finalizado'
        : (estadoNorm === 'INOPERATIVO'
          ? 'Baja / Devolución'
          : (estadoNorm === 'REPARADO' || (tieneConstanciaActual && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)))
            ? 'Listo para Entrega'
            : (esRutaSimple ? 'Esperando Constancia' : 'Bloqueado')),
      badge: ['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)
        ? 'Emitido'
        : (estadoNorm === 'REPARADO' || (tieneConstanciaActual && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)))
          ? 'Listo'
          : 'Bloqueado',
      badgeColor: ['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)
        ? "bg-emerald-100 text-emerald-800"
        : (estadoNorm === 'REPARADO' || tieneConstanciaActual)
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-100 text-slate-500",
      activo: ['REPARADO', 'INOPERATIVO'].includes(estadoNorm) || (tieneConstanciaActual && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(estadoNorm)),
      completo: ['ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(estadoNorm)
    },
    {
      id: "historial" as const,
      num: null,
      label: "Historial & Auditoría",
      sub: `${caso.historial?.length || 0} eventos registrados`,
      badge: `${caso.historial?.length || 0}`,
      badgeColor: "bg-slate-100 text-slate-700 border border-slate-200",
      activo: false,
      completo: false
    }
  ]

  // Atención Simple: flujo corto de 3 pasos (Ingreso → Atención y Constancia → Entrega).
  // Se oculta la Etapa 3 (Taller/QA) porque no aplica y solo distrae al técnico.
  const etapasVisibles = esRutaSimple
    ? etapas
        .filter((e) => e.id !== "etapa3")
        .map((e) => {
          if (e.id === "etapa2") return { ...e, label: "Atención y Constancia" }
          if (e.id === "etapa4") return { ...e, num: 3, label: "Entrega y Cierre" }
          return e
        })
    : etapas

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">

      {/* Top Bar Superior Organizado y Sin Acumulación */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-2.5 flex items-center justify-between gap-3">

          {/* Zona Izquierda: Navegación + Identidad del Expediente */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => router.push('/casos')}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70 shrink-0"
              title="Volver a lista de Casos"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="hidden md:flex items-center gap-2.5 shrink-0">
              <MurLogo size="sm" showSubtitle={false} />
              <span className="text-slate-300 select-none">/</span>
            </div>

            <span className="font-mono text-sm font-bold text-[#2369A1] whitespace-nowrap shrink-0">
              {caso.codigoCaso}
            </span>

            <CasoStateBadge estado={caso.estado} size="sm" />

            <div className="hidden xl:inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100/80 border border-slate-200 px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap shrink-0">
              <span className="font-semibold text-slate-800">{incidencias.length} INC</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-amber-700">{caso.diagnosticos?.length || 0} DT</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-violet-700">{caso.ordenesServicio?.length || 0} OS</span>
              {(caso.informesTecnicos?.length || 0) > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-[#2369A1]">{caso.informesTecnicos!.length} IT</span>
                </>
              )}
              {(caso.constancias?.length || 0) > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-teal-700">{caso.constancias.length} CA</span>
                </>
              )}
            </div>
          </div>

          {/* Zona Derecha: Documentos del Expediente + Menú Compacto de Usuario */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Grupo de acciones y descargas del expediente */}
            <div className="hidden sm:flex items-center gap-1.5">
              {(dtActual || ultimoDT) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generarInformeTecnicoCasoPDF(caso, (dtActual || ultimoDT)!)}
                  className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-8 px-2.5 gap-1.5 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 text-[#2369A1] shrink-0" />
                  <span className="hidden lg:inline">Informe DT</span>
                  <span className="font-mono text-[11px] text-slate-500 lg:text-slate-700">
                    ({(dtActual || ultimoDT)!.codigoDT})
                  </span>
                </Button>
              )}

              {(constanciaActual || ultimaConstancia) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generarConstanciaAtencionPDF(caso, (constanciaActual || ultimaConstancia)!)}
                  className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-8 px-2.5 gap-1.5 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="hidden lg:inline">Constancia</span>
                  <span className="font-mono text-[11px]">
                    ({(constanciaActual || ultimaConstancia)!.codigoConstancia})
                  </span>
                </Button>
              )}

              {((ultimaOS && ultimaOS.estado === "FINALIZADA") || Boolean(ultimoInforme)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDescargarInformeTecnicoFinal(ultimaOS?.codigoOS)}
                  className="border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs h-8 px-2.5 gap-1.5 font-semibold whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden lg:inline">Informe Técnico</span>
                  <span className="font-mono text-[11px]">
                    {ultimoInforme ? `(${ultimoInforme.codigoInforme})` : "(PDF)"}
                  </span>
                </Button>
              )}

              {caso.garantia?.activa && (
                <Button
                  size="sm"
                  onClick={() => {
                    setNuevaIncEsGarantia(true)
                    setNuevaIncOrigen("RECLAMO_GARANTIA")
                    setModalIncidenciaOpen(true)
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-2.5 gap-1.5 font-semibold shadow-xs whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">Reingreso</span>
                  <span>Garantía</span>
                </Button>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block shrink-0" />

            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">

        {/* Stepper Maestro Interactivo Unificado (Navegación de 5 Etapas) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className={`grid grid-cols-2 md:grid-cols-3 ${esRutaSimple ? "lg:grid-cols-4" : "lg:grid-cols-5"} gap-2.5`}>
            {etapasVisibles.map((etapa) => {
              const isSelected = activeTab === etapa.id
              return (
                <button
                  key={etapa.id}
                  type="button"
                  onClick={() => setActiveTab(etapa.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 w-full cursor-pointer relative overflow-hidden ${isSelected
                      ? 'border-[#2369A1] ring-2 ring-[#2369A1]/20 bg-blue-50/50 shadow-xs'
                      : 'hover:border-slate-300 hover:bg-slate-50/60 bg-white border-slate-200'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#2369A1]" />
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${etapa.completo
                      ? 'bg-emerald-600 text-white'
                      : etapa.activo
                        ? 'bg-[#2369A1] text-white shadow-xs'
                        : etapa.id === 'historial'
                          ? (isSelected ? 'bg-[#2369A1] text-white' : 'bg-slate-100 text-slate-600 border border-slate-200')
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                    {etapa.completo ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : etapa.id === 'historial' ? (
                      <History className="w-4 h-4" />
                    ) : (
                      etapa.num
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 truncate">
                        {etapa.id === 'historial' ? 'Auditoría' : `Etapa ${etapa.num}`}
                      </span>
                      {etapa.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${etapa.activo
                            ? 'text-blue-700 bg-blue-100 animate-pulse'
                            : etapa.completo
                              ? 'text-emerald-700 bg-emerald-100'
                              : 'text-slate-600 bg-slate-100'
                          }`}>
                          {etapa.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-bold truncate mt-0.5 ${isSelected ? 'text-[#2369A1]' : 'text-slate-900'}`}>
                      {etapa.label}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {etapa.sub}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${caso.origen === "ALQUILER" ? "bg-purple-50 text-purple-700 border-purple-200" :
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
                {(caso.contratoAlquiler || caso.ordenServicioCliente) && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-1 rounded block">
                      Servicio contratado: <strong>{referenciaServicioCaso(caso)}</strong>
                      {caso.servicioId && <span className="ml-1 font-mono text-[10px] text-purple-500">({caso.servicioId})</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Trazabilidad Documental del Expediente (Vínculos Canónicos) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-[#2369A1]" />
                  Trazabilidad Documental
                </span>
                <span className="text-[11px] font-mono font-bold text-[#2369A1] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {caso.codigoCaso}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">1. Incidencia Activa:</span>
                  <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                    {ultimaInc?.codigoINC || "INC-001"}
                  </span>
                </div>
                {esRutaSimple ? (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">2.A Constancia Atención:</span>
                    <span className={`font-mono font-semibold px-1.5 py-0.5 rounded ${constanciaActual ? "text-teal-800 bg-teal-50 border border-teal-200" : "text-slate-400"
                      }`}>
                      {constanciaActual?.codigoConstancia || "Pendiente"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">2.B Diagnóstico Técnico:</span>
                      <span className={`font-mono font-semibold px-1.5 py-0.5 rounded ${dtActual ? "text-amber-800 bg-amber-50 border border-amber-200" : "text-slate-400"
                        }`}>
                        {dtActual?.codigoDT || "Pendiente"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">3. Orden de Servicio:</span>
                      <span className={`font-mono font-semibold px-1.5 py-0.5 rounded ${osActual ? "text-violet-800 bg-violet-50 border border-violet-200" : "text-slate-400"
                        }`}>
                        {osActual?.codigoOS || "Pendiente"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">4. Informe Técnico:</span>
                      <span className={`font-mono font-semibold px-1.5 py-0.5 rounded ${informeActual ? "text-emerald-800 bg-emerald-50 border border-emerald-200" : "text-slate-400"
                        }`}>
                        {informeActual?.codigoInforme || (osActual?.estado === "FINALIZADA" ? "Al descargar" : "Pendiente QA")}
                      </span>
                    </div>
                  </>
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

            {/* Decisión de Aprobación de Diagnóstico (si existe para el ciclo activo) */}
            {dtActual?.estado === "APROBADO" && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  Diagnóstico Autorizado por Cliente
                </span>
                <p className="text-emerald-700 text-[11px]">
                  Presupuesto y alcance de DT {dtActual.codigoDT} aprobados para proceder a la reparación de taller.
                </p>
              </div>
            )}

          </div>

          {/* Columna Derecha: Contenido del Flujo Guiado en 4 Etapas */}
          <div className="lg:col-span-2 space-y-4">

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

                {/* Resumen de Incidencia Activa */}
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#2369A1] bg-white px-2 py-0.5 rounded border border-blue-200">
                          {ultimaInc?.codigoINC || "INC-001"}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ultimaInc?.prioridad === "CRITICA" ? "bg-rose-50 text-rose-700 border-rose-300 font-bold" :
                            ultimaInc?.prioridad === "ALTA" ? "bg-amber-50 text-amber-700 border-amber-300" :
                              "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                          Prioridad {ultimaInc?.prioridad || "MEDIA"}
                        </span>
                        {incidencias.length > 1 && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            Incidencia Activa
                          </span>
                        )}
                        {ultimaInc?.aplicaGarantia && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Reingreso en Garantía
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {ultimaInc?.fecha ? format(new Date(ultimaInc.fecha), "dd/MM/yyyy HH:mm") : format(new Date(caso.fechaApertura), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Falla / Avería Reportada:</span>
                      <p className="text-xs text-slate-800 mt-0.5 leading-relaxed font-medium">
                        {ultimaInc?.descripcion || "Avería general reportada al momento del ingreso."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Reportado por: <strong className="text-slate-700">{ultimaInc?.reportadoPor || caso.cliente.contacto}</strong></span>
                      <span>Origen: <strong className="text-slate-700">{ultimaInc?.origen || caso.origen}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[11px]">Apertura de Expediente</span>
                      <span className="font-mono font-bold text-slate-800">
                        {format(new Date(caso.fechaApertura), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[11px]">Total Incidencias en Expediente</span>
                      <span className="font-semibold text-slate-800">
                        {incidencias.length} {incidencias.length === 1 ? "Incidencia" : "Incidencias / Reingresos"}
                      </span>
                    </div>
                  </div>

                  {/* Si hay múltiples incidencias (ej. reingresos) */}
                  {incidencias.length > 1 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Historial de Incidencias Previas de este Equipo ({incidencias.length - 1}):
                      </span>
                      {incidencias.slice(0, incidencias.length - 1).reverse().map((inc) => (
                        <div key={inc.id} className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#2369A1]">{inc.codigoINC}</span>
                              <span className="text-slate-500">• Prioridad {inc.prioridad}</span>
                              {inc.aplicaGarantia && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Garantía
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">{format(new Date(inc.fecha), "dd/MM/yyyy HH:mm")}</span>
                          </div>
                          <p className="text-slate-700">{inc.descripcion}</p>
                          <span className="text-[10px] text-slate-400 block">Reportado por {inc.reportadoPor}</span>
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
                      {esRutaSimple ? "Continuar: Atención y Constancia →" : "Continuar a Etapa 2: Diagnóstico →"}
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
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Atención y Constancia</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Soporte rápido sin taller. Registra lo realizado y descarga la constancia para la firma del cliente.
                    </p>
                  </div>
                </div>

                {/* Guía didáctica de 3 pasos */}
                {(() => {
                  const entregado = ["ENTREGADO", "EN_GARANTIA", "CERRADO"].includes(estadoNorm)
                  const actual = !tieneConstanciaActual ? 1 : entregado ? 4 : 2
                  const pasos = ["Registrar atención", "Descargar y firmar constancia", "Entregar equipo"]
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      {pasos.map((txt, i) => {
                        const n = i + 1
                        const hecho = n < actual
                        const enCurso = n === actual
                        return (
                          <div key={txt} className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                              hecho ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : enCurso ? "bg-[#2369A1] text-white border-[#2369A1]"
                                  : "bg-white text-slate-400 border-slate-200"}`}>
                              <span className="font-mono">{hecho ? "✓" : n}</span>
                              {txt}
                            </div>
                            {n < pasos.length && <span className="text-slate-300">›</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Si no hay constancia emitida aún */}
                {!tieneConstanciaActual && (
                  <div className="py-8 text-center space-y-3 bg-slate-50/60 border border-dashed border-slate-300 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Paso 1: registra la atención</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                        Indica qué se hizo y el resultado. Las horas de ingreso y salida se escriben a mano en la constancia impresa.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={abrirModalNuevaConstancia}
                      className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Registrar atención y generar constancia
                    </Button>
                  </div>
                )}

                {/* Si ya existe constancia emitida */}
                {ultimaConstancia && (
                  <div className="space-y-4">
                    <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/30 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirModalEditarConstancia(ultimaConstancia)}
                            className="text-xs h-7.5 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 gap-1.5"
                          >
                            <PenTool className="w-3.5 h-3.5 text-teal-700" />
                            Editar Constancia
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generarConstanciaAtencionPDF(caso, ultimaConstancia)}
                            className="text-xs h-7.5 border-teal-300 bg-white hover:bg-teal-50 text-teal-900 gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-teal-700" />
                            Constancia de Atención (PDF)
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs bg-white p-3.5 rounded-lg border border-teal-100 space-y-2.5">
                        {/* Bloque de Fechas y Horas de Ingreso y Salida */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-teal-50 bg-slate-50/80 p-2 rounded-md">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha de Ingreso</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatearFechaVisualConstancia(ultimaConstancia.fechaIngreso, ultimaInc?.fecha || caso.fechaApertura)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Hora de Ingreso</span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="inline-block w-12 h-4 bg-white border border-slate-400 rounded-[2px] shadow-2xs" title="Cuadrito vacío en PDF para anotar manualmente al firmar" />
                              <span className="text-[10px] text-slate-500">Manual al firmar</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Salida</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatearFechaVisualConstancia(ultimaConstancia.fechaSalida, ultimaConstancia.fecha)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Hora de Salida</span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="inline-block w-12 h-4 bg-white border border-slate-400 rounded-[2px] shadow-2xs" title="Cuadrito vacío en PDF para anotar manualmente al firmar" />
                              <span className="text-[10px] text-slate-500">Manual al firmar</span>
                            </span>
                          </div>
                        </div>

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

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Técnico: <strong>{resolverNombreTecnico(ultimaConstancia.tecnicoResponsable, usuarios, ultimaConstancia.tecnicoId)}</strong>
                        </span>
                        <span>
                          Ingreso: {formatearFechaVisualConstancia(ultimaConstancia.fechaIngreso, ultimaInc?.fecha)} · Salida: {formatearFechaVisualConstancia(ultimaConstancia.fechaSalida, ultimaConstancia.fecha)} · Horas en blanco para firma
                        </span>
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
                            Paso 2 y 3: imprime la constancia, hazla firmar y entrega el equipo
                          </span>
                          <span className="text-[11px] text-emerald-800">
                            Cuando el cliente firme, registra la entrega para cerrar el caso.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generarConstanciaAtencionPDF(caso, ultimaConstancia)}
                          className="border-emerald-300 bg-white text-emerald-800 text-xs font-semibold gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar constancia
                        </Button>
                        {!["ENTREGADO", "EN_GARANTIA", "CERRADO"].includes(estadoNorm) && (
                          <Button
                            size="sm"
                            onClick={() => setModalEntregaOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Registrar entrega de equipo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === "etapa2" && (
              /* VISTA RUTA 2.B: DIAGNÓSTICO TÉCNICO FORMAL (DT) */
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Etapa 2.B: Evaluación Técnica & Diagnóstico (DT)</h3>
                    <p className="text-xs text-slate-500">Evaluación detallada de laboratorio, descarte de fallas, cotización de repuestos y aprobación.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setModalDiagnosticoOpen(true)}
                    className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs h-8 gap-1.5 shadow-xs font-semibold"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    {!dtActual ? "Registrar Diagnóstico (DT)" : "+ Nueva Evaluación DT"}
                  </Button>
                </div>

                {/* Caso A: No hay diagnóstico registrado para la incidencia activa */}
                {!dtActual && (
                  <div className="py-10 text-center space-y-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl">
                    <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Evaluación Técnica en Laboratorio Pendiente {ultimaInc ? `para ${ultimaInc.codigoINC}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                        {ultimaInc ? `Incidencia: "${ultimaInc.descripcion}". ` : ''}
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

                {/* Caso B: Diagnóstico Técnico emitido para la incidencia activa */}
                {dtActual && (
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                            {dtActual.codigoDT}
                          </span>
                          {dtActual.incidenciaId && (
                            <span className="font-mono text-xs font-bold text-[#2369A1] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {dtActual.incidenciaId}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-800">
                            Falla: <strong>{dtActual.tipoFalla}</strong>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dtActual.estado === "APROBADO" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              dtActual.estado === "RECHAZADO" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                            }`}>
                            {dtActual.estado === "APROBADO" ? "APROBADO POR CLIENTE" :
                              dtActual.estado === "RECHAZADO" ? "RECHAZADO" : "PENDIENTE DE DECISIÓN"}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generarInformeTecnicoCasoPDF(caso, dtActual)}
                          className="text-xs h-7.5 border-slate-300 text-slate-700 gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-[#2369A1]" />
                          Informe DT (PDF)
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-700 block">Diagnóstico Detallado:</span>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{dtActual.diagnosticoDetallado}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 block">Falla Real:</span>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{dtActual.hallazgos}</p>
                        </div>
                        {dtActual.danosFisicos && (
                          <div className="md:col-span-2 pt-1 border-t border-slate-200/60">
                            <span className="font-bold text-slate-700 block">Condición Estética y Daños Físicos Externos:</span>
                            <p className="text-slate-600 mt-0.5 leading-relaxed">{dtActual.danosFisicos}</p>
                          </div>
                        )}
                        {dtActual.solucionPropuesta && (
                          <div className="md:col-span-2 pt-1 border-t border-slate-200/60">
                            <span className="font-bold text-slate-700 block">Solución Propuesta:</span>
                            <p className="text-slate-600 mt-0.5 leading-relaxed">{dtActual.solucionPropuesta}</p>
                          </div>
                        )}
                      </div>

                      {dtActual.requiereRepuestos && dtActual.repuestosRequeridos?.length > 0 && (
                        <div className="text-xs border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 text-[11px]">
                            Repuestos Requeridos ({dtActual.repuestosRequeridos.length})
                          </div>
                          <div className="p-2 space-y-1">
                            {dtActual.repuestosRequeridos.map((r, i) => (
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
                        <span>Evaluador: <strong>{dtActual.tecnicoResponsable}</strong></span>
                        <span>Fecha: {format(new Date(dtActual.fecha), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                    </div>

                    {/* Bloque de Decisión de Aprobación */}
                    {dtActual.estado !== "APROBADO" && dtActual.estado !== "RECHAZADO" ? (
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
                              setSelectedDTForDecision(dtActual)
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
                              setSelectedDTForDecision(dtActual)
                              setDecisionAprobado(true)
                              setGenerarOSAlAprobar(true)
                              setModoCodigoOSDecision("AUTO")
                              setCodigoOSManualDecision("")
                              setOsActividadesDecision(dtActual.solucionPropuesta || dtActual.recomendaciones || `Ejecución de trabajos según diagnóstico ${dtActual.codigoDT}`)
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
                    ) : dtActual.estado === "APROBADO" ? (
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

                {/* Historial Completo de Diagnósticos del Expediente */}
                {caso.diagnosticos && caso.diagnosticos.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#2369A1]" />
                        Historial de Diagnósticos Técnicos del Expediente ({caso.diagnosticos.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[...caso.diagnosticos].reverse().map((dt) => {
                        const esElActivo = dt.id === dtActual?.id
                        return (
                          <div
                            key={dt.id}
                            className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${esElActivo ? "bg-blue-50/40 border-blue-200" : "bg-slate-50 border-slate-200"
                              }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-800">{dt.codigoDT}</span>
                                {dt.incidenciaId && (
                                  <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                                    {dt.incidenciaId}
                                  </span>
                                )}
                                <span className="text-slate-500">• {dt.tipoFalla}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dt.estado === 'APROBADO' ? 'bg-emerald-100 text-emerald-800' :
                                    dt.estado === 'RECHAZADO' ? 'bg-rose-100 text-rose-800' :
                                      'bg-amber-100 text-amber-800'
                                  }`}>
                                  {dt.estado}
                                </span>
                                {esElActivo && (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                    Ciclo Activo
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-[11px] line-clamp-1">{dt.hallazgos || dt.diagnosticoDetallado}</p>
                              <span className="text-[10px] text-slate-400">
                                Por {dt.tecnicoResponsable} • {format(new Date(dt.fecha), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generarInformeTecnicoCasoPDF(caso, dt)}
                              className="h-7 text-xs border-slate-300 text-slate-700 shrink-0 gap-1 bg-white hover:bg-slate-50"
                            >
                              <Download className="w-3 h-3 text-[#2369A1]" />
                              Informe {dt.codigoDT}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
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
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
                {/* Encabezado limpio de Etapa 3 + Contador de Trazabilidad en Tiempo Real */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Etapa 3: Intervención Técnica y Control de Calidad (QA)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Flujo interno de taller: registre primero las actividades y el tiempo invertido, y luego valide el protocolo QA para cerrar la intervención.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                    <span className="font-bold text-slate-700">{incidencias.length} INC</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-bold text-amber-700">{caso.diagnosticos?.length || 0} DT</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-bold text-violet-700">{caso.ordenesServicio?.length || 0} OS</span>
                  </div>
                </div>

                {/* Si la Etapa 2 no está completa ni aprobada: BLOQUEO */}
                {(!dtActual || dtActual.estado !== "APROBADO") && !['EN_REPARACION', 'EN_PRUEBAS', 'OBSERVADO', 'INOPERATIVO', 'REPARADO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO'].includes(caso.estado) ? (
                  <div className="py-12 text-center space-y-2 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                    <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">Etapa 3 Bloqueada</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Para iniciar la intervención en taller se requiere que el diagnóstico técnico de la incidencia activa sea aprobado en la Etapa 2.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("etapa2")}
                      className="bg-[#2369A1] text-white text-xs mt-2"
                    >
                      Ir a Etapa 2: Diagnóstico
                    </Button>
                  </div>
                ) : (() => {
                  const pasoAuto: 1 | 2 | 3 =
                    osActual?.estado === "FINALIZADA"
                      ? 3
                      : osActual?.estado === "EN_PRUEBAS"
                        ? 2
                        : 1
                  const pasoInterno: 1 | 2 | 3 = etapa3PasoManual ?? pasoAuto
                  const paso1Listo = Boolean(
                    osActual && (osActual.estado === "EN_PRUEBAS" || osActual.estado === "FINALIZADA" || osActual.actividadesRealizadas)
                  )
                  const paso2Listo = Boolean(osActual && osActual.estado === "FINALIZADA")
                  const checksMarcadosCount = [
                    qaChecklist.encendidoPostBios,
                    qaChecklist.funcionamientoRepuesto,
                    qaChecklist.pruebasRedPuertos,
                    qaChecklist.limpiezaExterna
                  ].filter(Boolean).length

                  return (
                    <div className="space-y-4">
                      {/* Mini Stepper del Flujo Interno de Etapa 3 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => {
                            if (osActual && !intervActividades) {
                              setIntervActividades(osActual.actividadesRealizadas || osActual.actividades || "")
                            }
                            setEtapa3PasoManual(1)
                          }}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 cursor-pointer ${pasoInterno === 1
                              ? "bg-white border-violet-500 ring-1 ring-violet-500/30 shadow-2xs"
                              : paso1Listo
                                ? "bg-white/70 border-emerald-200 hover:bg-white"
                                : "bg-transparent border-transparent"
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${pasoInterno === 1
                              ? "bg-violet-600 text-white"
                              : paso1Listo
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}>
                            {paso1Listo && pasoInterno !== 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-900 block truncate">
                              Actividades y Tiempo
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {paso1Listo ? `${osActual?.horasHombreReales || osActual?.horasHombre}h registradas` : "Esfuerzo en taller"}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          disabled={!paso1Listo}
                          onClick={() => paso1Listo && setEtapa3PasoManual(2)}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 ${!paso1Listo
                              ? "opacity-55 cursor-not-allowed border-transparent"
                              : pasoInterno === 2
                                ? "bg-white border-emerald-600 ring-1 ring-emerald-600/30 shadow-2xs cursor-pointer"
                                : paso2Listo
                                  ? "bg-white/70 border-emerald-200 hover:bg-white cursor-pointer"
                                  : "bg-white/60 border-slate-200 hover:bg-white cursor-pointer"
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${pasoInterno === 2
                              ? "bg-emerald-600 text-white"
                              : paso2Listo
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}>
                            {paso2Listo && pasoInterno !== 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-900 block truncate">
                              Pruebas de Calidad (QA)
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {paso2Listo
                                ? (osActual?.pruebasQA?.resultadoOperatividad === "INOPERATIVO" ? "Dictamen: Inoperativo" : "Dictamen: Reparado")
                                : paso1Listo ? "Verificar checklist" : "Complete el Paso 1"}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          disabled={!paso2Listo}
                          onClick={() => paso2Listo && setEtapa3PasoManual(null)}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 ${!paso2Listo
                              ? "opacity-55 cursor-not-allowed border-transparent"
                              : pasoInterno === 3
                                ? "bg-white border-[#2369A1] ring-1 ring-[#2369A1]/30 shadow-2xs cursor-pointer"
                                : "bg-white/70 border-slate-200 hover:bg-white cursor-pointer"
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${paso2Listo ? "bg-[#2369A1] text-white" : "bg-slate-200 text-slate-600"
                            }`}>
                            {paso2Listo ? <CheckCircle2 className="w-3.5 h-3.5" /> : "3"}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-900 block truncate">
                              Intervención Finalizada
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {paso2Listo ? "Pase a Etapa 4 habilitado" : "Pendiente de cierre QA"}
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* ================================================================= */}
                      {/* PASO INTERNO 1: TÉCNICO EJECUTOR, ACTIVIDADES REALIZADAS Y TIEMPO */}
                      {/* ================================================================= */}
                      {pasoInterno === 1 && (
                        <form onSubmit={handleGuardarIntervencionPaso1} className="border border-slate-200 rounded-xl p-4 bg-white space-y-4 shadow-2xs">
                          {/* Barra contextual de OS y alcance aprobado en DT */}
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-violet-800 bg-violet-50 px-2.5 py-1 rounded border border-violet-200">
                                {osActual ? osActual.codigoOS : `OS-${String((caso.ordenesServicio?.length || 0) + 1).padStart(3, "0")} (Nueva)`}
                              </span>
                              {dtActual && (
                                <span className="font-mono text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Ref: {dtActual.codigoDT}
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-800">
                                Paso 1: Registro de Actividades Realizadas y Horas-Hombre
                              </span>
                            </div>
                            {!osActual && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => setModoCodigoOS(modoCodigoOS === "AUTO" ? "MANUAL" : "AUTO")}
                                  className="text-violet-700 hover:underline font-semibold"
                                >
                                  {modoCodigoOS === "AUTO" ? "Usar código ERP manual" : "Usar correlativo automático"}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Si aún no existe OS y eligieron código manual externo */}
                          {!osActual && modoCodigoOS === "MANUAL" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-amber-900">Código OS Externo (ERP / SAP) *</Label>
                                <Input
                                  value={codigoOSManual}
                                  onChange={(e) => setCodigoOSManual(e.target.value.toUpperCase())}
                                  placeholder="Ej. OS-2026-8931"
                                  className="text-xs h-8 font-mono bg-white"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Tipo de Orden</Label>
                                <select
                                  value={osTipo}
                                  onChange={(e) => setOsTipo(e.target.value as TipoOrdenServicio)}
                                  className="w-full text-xs h-8 rounded-md border border-slate-200 px-2 bg-white"
                                >
                                  <option value="CORRECTIVA">Correctiva</option>
                                  <option value="PREVENTIVA">Preventiva</option>
                                  <option value="GARANTIA">Garantía</option>
                                  <option value="MANTENIMIENTO">Mantenimiento</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Aviso si viene devuelto como OBSERVADO desde QA */}
                          {osActual?.pruebasQA?.resultadoOperatividad === "OBSERVADO" && (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">Equipo Observado en Control QA — Requiere Ajuste en Taller</span>
                                <p className="text-[11px] text-amber-800 mt-0.5">{osActual.pruebasQA.observacionesQA}</p>
                              </div>
                            </div>
                          )}

                          {/* Referencia compacta del diagnóstico aprobado */}
                          {(dtActual?.solucionPropuesta || osActual?.actividades || (dtActual?.requiereRepuestos && dtActual.repuestosRequeridos?.length)) && (
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  Alcance aprobado para reparación:
                                </span>
                                {(dtActual?.solucionPropuesta || osActual?.actividades) && !intervActividades && (
                                  <button
                                    type="button"
                                    onClick={() => setIntervActividades(dtActual?.solucionPropuesta || osActual?.actividades || "")}
                                    className="text-[11px] font-semibold text-[#2369A1] hover:underline"
                                  >
                                    + Usar como base
                                  </button>
                                )}
                              </div>
                              <p className="text-slate-700 leading-relaxed">
                                {dtActual?.solucionPropuesta || osActual?.actividades || dtActual?.hallazgos}
                              </p>
                              {dtActual?.requiereRepuestos && dtActual.repuestosRequeridos?.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  <span className="text-[11px] font-semibold text-slate-500">Repuestos aprobados:</span>
                                  {dtActual.repuestosRequeridos.map((rep, idx) => (
                                    <span key={idx} className="text-[11px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                                      [{rep.partNumber}] {rep.descripcion} (x{rep.cantidad})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 1. Técnico Ejecutor Responsable */}
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-violet-600" />
                              Técnico Ejecutor Responsable *
                            </Label>
                            <select
                              value={intervTecnico}
                              onChange={(e) => setIntervTecnico(e.target.value)}
                              className="w-full text-xs h-9 rounded-md border border-slate-200 px-2.5 bg-white text-slate-800 font-medium focus:outline-none focus:border-violet-500"
                              required
                            >
                              <option value="" disabled>Seleccione al técnico responsable...</option>
                              {intervTecnico && !tecnicosDisponibles.includes(intervTecnico) && (
                                <option value={intervTecnico}>{intervTecnico}</option>
                              )}
                              {tecnicosDisponibles.map((nombre) => (
                                <option key={nombre} value={nombre}>
                                  {nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Actividades Técnicas Ejecutadas + Plantillas rápidas */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <Label className="text-xs font-semibold text-slate-800">
                                Actividades Técnicas Ejecutadas *
                              </Label>
                              <span className="text-[10px] text-slate-400">Plantillas rápidas homologadas:</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {[
                                {
                                  label: "Teclado por P/N",
                                  act: "Reemplazo de ensamble de teclado por Part Number homologado, limpieza interna de chasis y mantenimiento del sistema de ventilación.",
                                  piezas: "M36312-001 - SPS-TOP COVER W/ KBD CP+PS BL US",
                                  horas: 2.5
                                },
                                {
                                  label: "Cambio / Ajuste Bisagras",
                                  act: "Reemplazo y ajuste mecánico de bisagras de pantalla, refuerzo de puntos de anclaje y lubricación para apertura y cierre uniforme.",
                                  piezas: "Kit / Ajuste de bisagras de pantalla",
                                  horas: 1.5
                                },
                                {
                                  label: "Mant. Placa Madre",
                                  act: "Mantenimiento electrónico de placa madre, limpieza ultrasónica/isopropílica de contactos, renovación de pasta térmica y drenado eléctrico.",
                                  piezas: "Insumos de laboratorio electrónico",
                                  horas: 2.5
                                },
                                {
                                  label: "Touchpad",
                                  act: "Desensamble inferior, reemplazo y calibración de módulo touchpad con ajuste de conector flex.",
                                  piezas: "M42237-001 - SPS-TOUCHPAD 14",
                                  horas: 2
                                },
                                {
                                  label: "Antena Wi-Fi",
                                  act: "Apertura de cubierta de display y sustitución de cableado coaxial de antena interna Wi-Fi/Bluetooth.",
                                  piezas: "M36338-001 - SPS-ANTENNA CABLE KIT",
                                  horas: 2
                                }
                              ].map((tpl, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    setIntervActividades(tpl.act)
                                    if (!intervPiezas) setIntervPiezas(tpl.piezas)
                                    setIntervHoras(tpl.horas)
                                  }}
                                  className="text-[11px] bg-violet-50/70 border border-violet-200 text-violet-900 hover:bg-violet-100 px-2 py-0.5 rounded-md font-medium transition-colors"
                                >
                                  + {tpl.label}
                                </button>
                              ))}
                            </div>

                            <textarea
                              value={intervActividades}
                              onChange={(e) => setIntervActividades(e.target.value)}
                              placeholder="Detalle las labores ejecutadas en taller (ej. reemplazo de teclado por Part Number, cambio de bisagras, mantenimiento electrónico de placa madre)..."
                              rows={3}
                              className="w-full text-xs border border-slate-200 rounded-md p-2.5 resize-none bg-white focus:outline-none focus:border-violet-500"
                              required
                            />

                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">
                                Repuesto / Part Number Instalado <span className="font-normal text-slate-400">(opcional)</span>
                              </Label>
                              <Input
                                value={intervPiezas}
                                onChange={(e) => setIntervPiezas(e.target.value)}
                                placeholder="Ej. M36312-001 - Teclado US / Sin reemplazo de piezas"
                                className="text-xs h-8 bg-white"
                              />
                            </div>
                          </div>

                          {/* 3. Tiempo Invertido: Horas-Hombre y Fechas de Inicio / Término */}
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-violet-600" />
                                Horas-Hombre *
                              </Label>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  value={intervHoras}
                                  onChange={(e) => setIntervHoras(Number(e.target.value))}
                                  min={0.5}
                                  step={0.5}
                                  className="text-xs h-8.5 bg-white font-bold w-24"
                                  required
                                />
                                <span className="text-[11px] text-slate-500">hrs</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">Inicio de Intervención *</Label>
                              <Input
                                type="datetime-local"
                                value={intervFechaInicio}
                                onChange={(e) => setIntervFechaInicio(e.target.value)}
                                className="text-xs h-8.5 bg-white"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">Término de Intervención *</Label>
                              <Input
                                type="datetime-local"
                                value={intervFechaFin}
                                onChange={(e) => setIntervFechaFin(e.target.value)}
                                className="text-xs h-8.5 bg-white"
                                required
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] text-slate-500">
                              Paso 1 de 2: Al guardar, se habilitará el protocolo de pruebas de calidad (QA).
                            </span>
                            <div className="flex items-center gap-2">
                              {etapa3PasoManual !== null && paso1Listo && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEtapa3PasoManual(null)}
                                  className="text-xs h-8"
                                >
                                  Cancelar
                                </Button>
                              )}
                              <Button
                                type="submit"
                                size="sm"
                                disabled={guardandoIntervencion}
                                className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8.5 font-semibold shadow-xs"
                              >
                                {guardandoIntervencion ? "Guardando..." : "Guardar Actividades y Pasar a QA →"}
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}

                      {/* ================================================================= */}
                      {/* PASO INTERNO 2: PROTOCOLO DE PRUEBAS DE CALIDAD (QA) Y DICTAMEN   */}
                      {/* ================================================================= */}
                      {pasoInterno === 2 && osActual && (
                        <form onSubmit={handleGuardarQAPaso2} className="border border-slate-200 rounded-xl p-4 bg-white space-y-4 shadow-2xs">
                          {/* Resumen compacto de lo registrado en el Paso 1 */}
                          <div className="p-3 rounded-lg bg-violet-50/50 border border-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-violet-900 bg-white px-2 py-0.5 rounded border border-violet-200">
                                  {osActual.codigoOS}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  Técnico: {osActual.tecnicoAsignado}
                                </span>
                                <span className="text-violet-800 font-semibold">
                                  • {osActual.horasHombreReales || osActual.horasHombre} h-h
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2">
                                {osActual.actividadesRealizadas || osActual.actividades}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIntervActividades(osActual.actividadesRealizadas || osActual.actividades || "")
                                setEtapa3PasoManual(1)
                              }}
                              className="text-xs h-7.5 border-violet-200 text-violet-800 bg-white hover:bg-violet-50 shrink-0"
                            >
                              ← Editar Actividades
                            </Button>
                          </div>

                          {/* Checklist Operativo QA */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                  Lista de Verificación de Pruebas Operativas (QA)
                                </span>
                                <p className="text-[11px] text-slate-500">
                                  Verifique las pruebas operativas previas al cierre de la Orden de Servicio ({checksMarcadosCount}/4 verificadas).
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setQaChecklist({
                                    encendidoPostBios: true,
                                    funcionamientoRepuesto: true,
                                    pruebasRedPuertos: true,
                                    limpiezaExterna: true
                                  })
                                }
                                className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
                              >
                                ✓ Marcar las 4 conformes
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {[
                                {
                                  key: "encendidoPostBios" as const,
                                  titulo: "1. Encendido y POST de BIOS",
                                  desc: "Arranque limpio sin códigos de error ni bloqueos"
                                },
                                {
                                  key: "funcionamientoRepuesto" as const,
                                  titulo: "2. Funcionamiento del repuesto / ajuste",
                                  desc: "Operatividad validada del componente intervenido"
                                },
                                {
                                  key: "pruebasRedPuertos" as const,
                                  titulo: "3. Pruebas de red y puertos",
                                  desc: "Wi-Fi, LAN, USB, video, audio y carga eléctrica"
                                },
                                {
                                  key: "limpiezaExterna" as const,
                                  titulo: "4. Limpieza externa y ensamble",
                                  desc: "Presentación física íntegra y tornillería completa"
                                }
                              ].map((item) => {
                                const checked = qaChecklist[item.key]
                                return (
                                  <label
                                    key={item.key}
                                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${checked
                                        ? "bg-emerald-50/70 border-emerald-300"
                                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-50"
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        setQaChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))
                                      }
                                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                                    />
                                    <div className="min-w-0">
                                      <span className="text-xs font-semibold text-slate-800 block">{item.titulo}</span>
                                      <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>

                          {/* Dictamen Final de la Intervención */}
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <Label className="text-xs font-bold text-slate-800 block">
                              Dictamen Final de la Intervención *
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setQaResultadoOperatividad("REPARADO")
                                  if (!qaObservaciones.trim()) setQaObservaciones(DEFAULT_QA_OBS_REPARADO)
                                }}
                                className={`p-3 rounded-lg border text-left transition-all ${qaResultadoOperatividad === "REPARADO"
                                    ? "border-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-600 shadow-2xs"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                  }`}
                              >
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  REPARADO / LISTO
                                </div>
                                <p className="text-[10px] text-emerald-700 mt-1 leading-tight">
                                  Superó QA. Cierra la OS como Finalizada y desbloquea 4. Entrega y Cierre.
                                </p>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setQaResultadoOperatividad("INOPERATIVO")
                                  if (qaObservaciones === DEFAULT_QA_OBS_REPARADO) setQaObservaciones("")
                                }}
                                className={`p-3 rounded-lg border text-left transition-all ${qaResultadoOperatividad === "INOPERATIVO"
                                    ? "border-rose-600 bg-rose-50/80 ring-1 ring-rose-600 shadow-2xs"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                  }`}
                              >
                                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                                  <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  INOPERATIVO
                                </div>
                                <p className="text-[10px] text-rose-700 mt-1 leading-tight">
                                  Daño irreversible o partes discontinuadas. Sustenta baja o reemplazo.
                                </p>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setQaResultadoOperatividad("OBSERVADO")
                                  if (qaObservaciones === DEFAULT_QA_OBS_REPARADO) setQaObservaciones("")
                                }}
                                className={`p-3 rounded-lg border text-left transition-all ${qaResultadoOperatividad === "OBSERVADO"
                                    ? "border-amber-600 bg-amber-50/80 ring-1 ring-amber-600 shadow-2xs"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                  }`}
                              >
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  OBSERVADO
                                </div>
                                <p className="text-[10px] text-amber-700 mt-1 leading-tight">
                                  No superó alguna prueba. Retorna al Paso 1 para reajuste en taller.
                                </p>
                              </button>
                            </div>
                          </div>

                          {/* Observaciones QA y Conformidad de Cierre */}
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">
                                {qaResultadoOperatividad === "INOPERATIVO"
                                  ? "Sustento Técnico de Inoperatividad / Baja *"
                                  : qaResultadoOperatividad === "OBSERVADO"
                                    ? "Detalle de la Observación Detectada en QA *"
                                    : "Observaciones del Control QA *"}
                              </Label>
                              <textarea
                                value={qaObservaciones}
                                onChange={(e) => setQaObservaciones(e.target.value)}
                                rows={2}
                                placeholder={
                                  qaResultadoOperatividad === "INOPERATIVO"
                                    ? "Indique el daño irreversible o la falta de disponibilidad de partes discontinuadas..."
                                    : qaResultadoOperatividad === "OBSERVADO"
                                      ? "Indique qué prueba falló y qué ajuste debe realizar el técnico en taller..."
                                      : "Detalle breve del resultado de pruebas operativas..."
                                }
                                className="w-full text-xs border border-slate-200 rounded-md p-2 resize-none bg-white"
                                required
                              />
                            </div>

                            {qaResultadoOperatividad !== "OBSERVADO" && (
                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-semibold text-slate-700">Técnico Acreditador QA *</Label>
                                  <Input
                                    value={qaFirmaDigital}
                                    onChange={(e) => setQaFirmaDigital(e.target.value)}
                                    className="text-xs h-8 bg-white font-medium"
                                    required
                                  />
                                </div>
                                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 sm:pt-4">
                                  <input
                                    type="checkbox"
                                    checked={qaFirmaAceptada}
                                    onChange={(e) => setQaFirmaAceptada(e.target.checked)}
                                    className="rounded border-slate-300 mt-0.5 text-[#2369A1]"
                                    required
                                  />
                                  <span>Confirmo el protocolo QA y autorizo el cierre de la Orden de Servicio.</span>
                                </label>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEtapa3PasoManual(1)}
                              className="text-xs h-8"
                            >
                              ← Volver a Paso 1
                            </Button>

                            <Button
                              type="submit"
                              size="sm"
                              disabled={guardandoQA}
                              className={`text-white text-xs h-8.5 font-semibold shadow-xs ${qaResultadoOperatividad === "REPARADO"
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : qaResultadoOperatividad === "INOPERATIVO"
                                    ? "bg-rose-600 hover:bg-rose-700"
                                    : "bg-amber-600 hover:bg-amber-700"
                                }`}
                            >
                              {guardandoQA
                                ? "Procesando..."
                                : qaResultadoOperatividad === "REPARADO"
                                  ? "Finalizar Intervención como REPARADO / LISTO ✓"
                                  : qaResultadoOperatividad === "INOPERATIVO"
                                    ? "Finalizar Intervención como INOPERATIVO"
                                    : "Guardar OBSERVADO y Volver a Taller"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* ================================================================= */}
                      {/* PASO INTERNO 3: RESUMEN CONSOLIDADO DE INTERVENCIÓN FINALIZADA    */}
                      {/* ================================================================= */}
                      {pasoInterno === 3 && osActual && (
                        <div className="space-y-4">
                          {/* Banner de estado final de taller */}
                          <div className={`p-3.5 rounded-xl border flex items-center justify-between flex-wrap gap-2 ${osActual.pruebasQA?.resultadoOperatividad === "INOPERATIVO"
                              ? "bg-rose-50/80 border-rose-300 text-rose-950"
                              : "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                            }`}>
                            <div className="flex items-center gap-2.5">
                              {osActual.pruebasQA?.resultadoOperatividad === "INOPERATIVO" ? (
                                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              )}
                              <div>
                                <span className="text-xs font-bold block">
                                  {osActual.pruebasQA?.resultadoOperatividad === "INOPERATIVO"
                                    ? `Orden ${osActual.codigoOS} Finalizada — Estado INOPERATIVO`
                                    : `Orden ${osActual.codigoOS} Finalizada — Estado REPARADO / LISTO`}
                                </span>
                                <span className="text-[11px] opacity-85">
                                  {osActual.pruebasQA?.resultadoOperatividad === "INOPERATIVO"
                                    ? "Sustento técnico registrado para baja o reemplazo definitivo. Pestaña 4 habilitada."
                                    : "Control QA superado satisfactoriamente. Pestaña 4 (Entrega y Cierre) desbloqueada."}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIntervActividades(osActual.actividadesRealizadas || osActual.actividades || "")
                                setEtapa3PasoManual(1)
                              }}
                              className="text-xs h-7.5 bg-white border-slate-200 text-slate-700 gap-1"
                            >
                              <PenTool className="w-3 h-3" />
                              Editar Registro
                            </Button>
                          </div>

                          {/* Resumen de los 2 bloques del flujo interno */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {/* Bloque 1: Actividades y Esfuerzo */}
                            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <Wrench className="w-3.5 h-3.5 text-violet-600" />
                                  1. Actividades y Horas-Hombre
                                </span>
                                <span className="font-mono font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-200 text-[11px]">
                                  {osActual.horasHombreReales || osActual.horasHombre} h-h
                                </span>
                              </div>
                              <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-slate-200/80 whitespace-pre-line">
                                {osActual.actividadesRealizadas || osActual.actividades}
                              </p>
                              {osActual.piezasReemplazadas && (
                                <p className="text-[11px] text-slate-600">
                                  <strong>Repuesto / Pieza:</strong>{" "}
                                  <span className="font-mono">{osActual.piezasReemplazadas}</span>
                                </p>
                              )}
                              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/70 space-y-0.5">
                                <p>Técnico Ejecutor: <strong className="text-slate-700">{osActual.tecnicoAsignado}</strong></p>
                                <p>
                                  Periodo:{" "}
                                  {osActual.fechaInicio ? format(new Date(osActual.fechaInicio), "dd/MM/yyyy HH:mm") : "N/A"}
                                  {" → "}
                                  {osActual.fechaFin ? format(new Date(osActual.fechaFin), "dd/MM/yyyy HH:mm") : "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Bloque 2: Protocolo QA */}
                            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  2. Protocolo de Calidad (QA)
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${osActual.pruebasQA?.resultadoOperatividad === "INOPERATIVO"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  }`}>
                                  {osActual.pruebasQA?.resultadoOperatividad === "INOPERATIVO" ? "INOPERATIVO" : "REPARADO / LISTO"}
                                </span>
                              </div>

                              {osActual.pruebasQA?.checklist && (
                                <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded border border-slate-200/80 text-[11px]">
                                  {[
                                    { ok: osActual.pruebasQA.checklist.encendidoPostBios, label: "POST de BIOS" },
                                    { ok: osActual.pruebasQA.checklist.funcionamientoRepuesto, label: "Repuesto / Ajuste" },
                                    { ok: osActual.pruebasQA.checklist.pruebasRedPuertos, label: "Red y Puertos" },
                                    { ok: osActual.pruebasQA.checklist.limpiezaExterna, label: "Limpieza Externa" }
                                  ].map((c, idx) => (
                                    <span key={idx} className="flex items-center gap-1 text-slate-700">
                                      {c.ok ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      ) : (
                                        <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                      )}
                                      {c.label}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                {osActual.pruebasQA?.observacionesQA || "Protocolo QA completado."}
                              </p>

                              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/70">
                                <span>
                                  Acreditado por:{" "}
                                  <strong className="text-slate-700">
                                    {osActual.firmaDigitalTecnico || osActual.pruebasQA?.tecnicoQA || osActual.tecnicoAsignado}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Acciones de pase a Etapa 4 */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDescargarInformeTecnicoFinal(osActual.codigoOS)}
                              className="border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5 text-[#2369A1]" />
                              Informe Técnico{informeActual ? ` (${informeActual.codigoInforme})` : " (PDF)"}
                            </Button>
                            {osActual.pruebasQA?.resultadoOperatividad === "INOPERATIVO" ? (
                              <Button
                                size="sm"
                                onClick={() => setActiveTab("etapa4")}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1"
                              >
                                Ir a Etapa 4: Baja / Devolución →
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setActiveTab("etapa4")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                              >
                                Ir a Etapa 4: Entrega y Cierre →
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Historial de Órdenes de Servicio previas (si existen múltiples ciclos) */}
                {caso.ordenesServicio && caso.ordenesServicio.length > 1 && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-violet-600" />
                      Historial de Órdenes de Trabajo del Expediente ({caso.ordenesServicio.length})
                    </span>
                    <div className="space-y-2">
                      {[...caso.ordenesServicio].reverse().map((os) => {
                        const esLaActiva = os.id === osActual?.id
                        return (
                          <div
                            key={os.id}
                            className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${esLaActiva ? "bg-violet-50/40 border-violet-200" : "bg-slate-50 border-slate-200"
                              }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-800">{os.codigoOS}</span>
                                {os.incidenciaId && (
                                  <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                                    {os.incidenciaId}
                                  </span>
                                )}
                                {os.diagnosticoId && (
                                  <span className="text-[10px] font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-amber-800">
                                    {os.diagnosticoId}
                                  </span>
                                )}
                                {os.informeTecnicoId && (
                                  <span className="text-[10px] font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800">
                                    {os.informeTecnicoId}
                                  </span>
                                )}
                                <span className="text-slate-500">• {os.tipo}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${os.estado === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-800'
                                  }`}>
                                  {os.estado}
                                </span>
                                {esLaActiva && (
                                  <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                                    Ciclo Activo
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-[11px] line-clamp-1">{os.actividadesRealizadas || os.actividades}</p>
                              <span className="text-[10px] text-slate-400">
                                Por {os.tecnicoAsignado} • {os.horasHombreReales || os.horasHombre}h
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
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
                  <h3 className="text-sm font-bold text-slate-900">
                    {esRutaSimple ? "Entrega y Cierre" : "Etapa 4: Entrega, Garantía & Cierre"}
                  </h3>
                  <p className="text-xs text-slate-500">Coordinación de entrega con el cliente, activación de cobertura de garantía y liquidación técnica final.</p>
                </div>

                {/* Si aún no está reparado, ni inoperativo, ni entregado, ni tiene atención simple: BLOQUEO */}
                {!['REPARADO', 'INOPERATIVO', 'ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(estadoNorm) && !constanciaActual ? (
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
                ) : estadoNorm === "INOPERATIVO" && !caso.entrega ? (
                  /* Equipo declarado Inoperativo (Irreparable o costo inviable) */
                  <div className="py-8 px-6 text-center space-y-3 bg-rose-50/70 border border-rose-300 rounded-xl">
                    <AlertCircle className="w-9 h-9 text-rose-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-950">
                        Equipo Declarado INOPERATIVO (Irreparable o Costo Inviable)
                      </h4>
                      <p className="text-xs text-rose-800 max-w-lg mx-auto mt-1">
                        La intervención técnica concluyó que el equipo no es reparable de manera viable. Emita el Informe Técnico Final y registre la devolución formal del activo al cliente.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleDescargarInformeTecnicoFinal(osActual?.codigoOS || ultimaOS?.codigoOS)}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold gap-1.5 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Informe Técnico{ultimoInforme ? ` (${ultimoInforme.codigoInforme})` : " Final (PDF)"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setModalEntregaOpen(true)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 shadow-xs"
                      >
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Registrar Devolución de Activo
                      </Button>
                    </div>
                  </div>
                ) : (estadoNorm === "REPARADO" || (Boolean(constanciaActual) && !['ENTREGADO', 'EN_GARANTIA', 'CERRADO', 'CERRADO_SIN_REPARACION'].includes(estadoNorm))) ? (
                  /* Listo para entregar (Por reparación QA o por Atención Simple) */
                  <div className="py-8 px-6 text-center space-y-3 bg-emerald-50/60 border border-emerald-300 rounded-xl">
                    <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        {constanciaActual ? "Soporte Menor Ejecutado — Listo para Entrega y Cierre" : "Equipo Reparado y QA Conforme"}
                      </h4>
                      <p className="text-xs text-emerald-800 max-w-lg mx-auto mt-1">
                        {constanciaActual
                          ? `Atención simple acreditada con constancia ${constanciaActual.codigoConstancia}. Procede a registrar la devolución formal al cliente.`
                          : "El equipo está 100% operativo y probado. Registre la entrega del activo al cliente para activar la garantía o proceder a la liquidación final."}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {constanciaActual && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirModalEditarConstancia(constanciaActual)}
                            className="text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700 gap-1.5"
                          >
                            <PenTool className="w-3.5 h-3.5 text-teal-700" />
                            Editar Constancia ({constanciaActual.codigoConstancia})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generarConstanciaAtencionPDF(caso, constanciaActual)}
                            className="text-xs border-teal-300 bg-white hover:bg-teal-50 text-teal-900 font-semibold gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-teal-700" />
                            Constancia ({constanciaActual.codigoConstancia})
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        onClick={() => setModalEntregaOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 shadow-xs"
                      >
                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                        Registrar Entrega de Equipo
                      </Button>
                    </div>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        {ultimaOS ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDescargarInformeTecnicoFinal(ultimaOS.codigoOS)}
                            className="text-xs border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50 font-semibold gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            Informe Técnico{ultimoInforme ? ` (${ultimoInforme.codigoInforme})` : " (PDF)"}
                          </Button>
                        ) : ultimaConstancia ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalEditarConstancia(ultimaConstancia)}
                              className="text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-50 gap-1.5"
                            >
                              <PenTool className="w-3.5 h-3.5 text-teal-700" />
                              Editar Fecha / Hora
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generarConstanciaAtencionPDF(caso, ultimaConstancia)}
                              className="text-xs border-teal-300 text-teal-900 bg-white hover:bg-teal-50 font-semibold gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5 text-teal-600" />
                              Constancia ({ultimaConstancia.codigoConstancia})
                            </Button>
                          </>
                        ) : null}
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
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${h.tipo === "APERTURA" ? "bg-[#2369A1]" :
                          h.tipo === "INCIDENCIA" ? "bg-blue-500" :
                            h.tipo === "DIAGNOSTICO" ? "bg-amber-500" :
                              h.tipo === "ORDEN_SERVICIO" ? "bg-violet-500" :
                                h.tipo === "INFORME_TECNICO" ? "bg-sky-600" :
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
                  className={`p-2 rounded-lg border text-left transition-all ${nuevaIncRequiereDT
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
                  className={`p-2 rounded-lg border text-left transition-all ${!nuevaIncRequiereDT
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
      <Dialog
        open={modalAtencionSimpleOpen}
        onOpenChange={(open) => {
          setModalAtencionSimpleOpen(open)
          if (!open) setConstanciaEditandoId(null)
        }}
      >
        <DialogContent className="max-w-lg font-sans max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {constanciaEditandoId
                ? `Editar Constancia de Atención (${constanciaEditandoId})`
                : "2A. Atención Simple (Constancia de Atención)"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ingrese manualmente la fecha y hora de inicio (ingreso) y término (salida) de la atención para reflejarlas en la Constancia de Atención.
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

            {/* Bloque de Fechas de Atención y Cuadritos Vacíos para Hora Manual */}
            <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-700" />
                  Fechas de Atención y Cuadros de Hora (Para Firma)
                </span>
                <span className="text-[10px] text-teal-700 font-medium">Impreso en Constancia</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Fecha de Ingreso <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={constanciaFechaIngreso}
                    onChange={(e) => setConstanciaFechaIngreso(e.target.value)}
                    className="text-xs h-8.5 bg-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Hora de Ingreso (PDF)
                  </Label>
                  <div className="h-8.5 px-2.5 rounded-md border border-dashed border-slate-300 bg-white/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="inline-block w-14 h-4 bg-white border border-slate-500 rounded-[2px]" />
                    <span className="text-[10px] font-medium text-slate-500">Vacío p/ llenar al firmar</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Fecha de Salida <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={constanciaFechaSalida}
                    onChange={(e) => setConstanciaFechaSalida(e.target.value)}
                    className="text-xs h-8.5 bg-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Hora de Salida (PDF)
                  </Label>
                  <div className="h-8.5 px-2.5 rounded-md border border-dashed border-slate-300 bg-white/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="inline-block w-14 h-4 bg-white border border-slate-500 rounded-[2px]" />
                    <span className="text-[10px] font-medium text-slate-500">Vacío p/ llenar al firmar</span>
                  </div>
                </div>
              </div>
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
                placeholder="Ej. R-019284, T-45810, I-000904"
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
              <Label className="text-xs font-semibold text-slate-800">Técnico Responsable *</Label>
              <select
                value={constanciaTecnico}
                onChange={(e) => setConstanciaTecnico(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-200 px-2.5 bg-white text-slate-800 font-medium"
                required
              >
                <option value="" disabled>Seleccione al técnico responsable...</option>
                {constanciaTecnico && !tecnicosDisponibles.includes(constanciaTecnico) && (
                  <option value={constanciaTecnico}>{constanciaTecnico}</option>
                )}
                {tecnicosDisponibles.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Campos opcionales plegados para no abrumar al técnico */}
            <details className="group rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
              <summary className="text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                Más detalles (opcional): falla real y observaciones
              </summary>
              <div className="space-y-3 pt-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-800">Falla Real (Diagnóstico Inmediato)</Label>
                  <Input
                    value={constanciaFallaReal}
                    onChange={(e) => setConstanciaFallaReal(e.target.value)}
                    placeholder="Ej. Ventilador obstruido / Memoria RAM desajustada"
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-800">Observaciones</Label>
                  <Input
                    value={constanciaObservaciones}
                    onChange={(e) => setConstanciaObservaciones(e.target.value)}
                    placeholder="Ej. Ninguna / Se recomienda cambio preventivo en 6 meses"
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            </details>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalAtencionSimpleOpen(false)
                  setConstanciaEditandoId(null)
                }}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold">
                {constanciaEditandoId ? "Guardar Cambios y Descargar PDF" : "Emitir y Descargar Constancia (PDF)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2B: DIAGNÓSTICO TÉCNICO FORMAL (DT) */}
      {/* ========================================================================= */}
      <Dialog open={modalDiagnosticoOpen} onOpenChange={setModalDiagnosticoOpen}>
        <DialogContent className="sm:max-w-[760px] w-full max-h-[92vh] flex flex-col bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl font-sans">
          {/* Cabecera Fija */}
          <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                    2B. Evaluación y Diagnóstico Técnico (DT)
                  </DialogTitle>
                  {ultimaInc && (
                    <span className="text-xs font-mono font-bold text-[#2369A1] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {ultimaInc.codigoINC}
                    </span>
                  )}
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {ultimaInc ? (
                    <span>Evaluando incidencia activa: <strong className="text-slate-700">{ultimaInc.descripcion}</strong></span>
                  ) : (
                    "Genera dictamen formal de laboratorio, causa raíz y requerimiento de repuestos."
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleGuardarDiagnostico} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Cuerpo desplazable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 min-h-0">
              {/* Plantillas Rápidas de Diagnóstico Homologadas MUR */}
              <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#2369A1] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Plantillas Técnicas MUR (Llenado Rápido)
                  </span>
                  <span className="text-[10px] text-slate-500">Clic para autocompletar</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: "Cruce en Teclado",
                      tipo: "HARDWARE" as const,
                      danos: "Desgaste general por uso en carcasa y teclas.",
                      hallazgos: "Cruce interno en circuito / matriz de teclado",
                      detalle: "Se realizó inspección física y pruebas funcionales de entrada, evidenciándose cruce interno en la matriz del teclado que ocasiona ingreso errático de caracteres. Se requiere cambio de ensamble de teclado y mantenimiento preventivo interno.",
                      solucion: "Realizar cambio de teclado y mantenimiento preventivo interno",
                      pn: "M36312-001",
                      partDesc: "SPS-TOP COVER W/ KBD CP+PS BL US"
                    },
                    {
                      label: "Touchpad / Clic",
                      tipo: "HARDWARE" as const,
                      danos: "Desgaste general por uso en área de reposamuñecas.",
                      hallazgos: "Falla física en microswitch / mecanismo de clic del touchpad",
                      detalle: "Se realizó test funcional de periféricos de entrada, evidenciándose daño en el switch de clic y respuesta errática del touchpad. Se requiere reemplazo del módulo de touchpad y mantenimiento preventivo.",
                      solucion: "Realizar cambio de módulo de touchpad y mantenimiento",
                      pn: "M42237-001",
                      partDesc: "SPS-TOUCHPAD 14"
                    },
                    {
                      label: "Placa Madre / Sin Encendido",
                      tipo: "HARDWARE" as const,
                      danos: "Desgaste general por uso en chasis.",
                      hallazgos: "Falla a nivel de circuitos de alimentación en placa madre (Motherboard inoperativa)",
                      detalle: "Se realizaron pruebas con cargador y batería operativa, descartándose problemas de periféricos. La placa madre no responde a la secuencia de encendido por cortocircuito en línea principal.",
                      solucion: "Realizar cambio de placa madre y pruebas de encendido",
                      pn: "M36403-601",
                      partDesc: "SPS-MB UMA i5-1145 WIN"
                    },
                    {
                      label: "Bloqueo / Drenado Eléctrico",
                      tipo: "HARDWARE" as const,
                      danos: "Buen estado cosmético, sin daños físicos externos.",
                      hallazgos: "Bloqueo o protección eléctrica temporal del sistema",
                      detalle: "El equipo no completaba secuencia de arranque. Se realizó apertura para inspección interna, desconexión de batería, retiro y reinstalación de memorias RAM y drenado de energía residual.",
                      solucion: "Realizar drenado de energía residual y reinicio eléctrico para validar funcionamiento",
                      pn: null,
                      partDesc: null
                    },
                    {
                      label: "Bisagras de Pantalla",
                      tipo: "HARDWARE" as const,
                      danos: "Holgura y juego mecánico en bisagras de pantalla.",
                      hallazgos: "Desajuste mecánico en anclaje de bisagras de pantalla",
                      detalle: "Se verificó movimiento excesivo e inestabilidad en el panel de pantalla por pernos flojos en el anclaje de las bisagras internas.",
                      solucion: "Ajuste, lubricación y calibración de bisagras de pantalla",
                      pn: null,
                      partDesc: null
                    },
                    {
                      label: "Antena Wi-Fi / Bluetooth",
                      tipo: "HARDWARE" as const,
                      danos: "Desgaste leve por uso.",
                      hallazgos: "Inconveniente en antena Wi-Fi por rotura interna",
                      detalle: "Se verificó desconexión y baja intensidad de señal inalámbrica debido a fisura interna en el cable coaxial de la antena del display.",
                      solucion: "Sustitución de cable de antena interna Wi-Fi/Bluetooth",
                      pn: "M36338-001",
                      partDesc: "SPS-ANTENNA CABLE KIT"
                    }
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDtTipoFalla(tpl.tipo);
                        setDtDanosFisicos(tpl.danos);
                        setDtHallazgos(tpl.hallazgos);
                        setDtDetalle(tpl.detalle);
                        setDtRecomendaciones(tpl.solucion);
                        if (tpl.pn) {
                          setDtRequiereRepuestos(true);
                          const catalogItem = repuestosCatalogo.find(r => r.id === tpl.pn);
                          setDtRepuestosSeleccionados([
                            {
                              partNumber: tpl.pn,
                              descripcion: catalogItem?.descripcion || tpl.partDesc || tpl.pn,
                              cantidad: 1
                            }
                          ]);
                          setRepuestoSelId(tpl.pn);
                        } else {
                          setDtRequiereRepuestos(false);
                          setDtRepuestosSeleccionados([]);
                          setRepuestoSelId("");
                        }
                        toast.success(`Plantilla "${tpl.label}" cargada.`);
                      }}
                      className="text-[11px] bg-white border border-blue-200 text-slate-700 hover:bg-blue-100/60 hover:text-[#2369A1] hover:border-blue-300 px-2 py-0.5 rounded-md font-medium transition-colors"
                    >
                      + {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tipo de Falla</Label>
                  <select
                    value={dtTipoFalla}
                    onChange={(e) => setDtTipoFalla(e.target.value as any)}
                    className="w-full text-xs h-8.5 rounded-md border border-slate-200 px-2.5 bg-white text-slate-800"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="SOFTWARE">Software / SO</option>
                    <option value="OPERATIVO">Operativo / Uso</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-800">Técnico Evaluador *</Label>
                  <select
                    value={dtTecnico}
                    onChange={(e) => setDtTecnico(e.target.value)}
                    className="w-full text-xs h-8.5 rounded-md border border-slate-200 px-2.5 bg-white text-slate-800 font-medium"
                    required
                  >
                    <option value="" disabled>Seleccione al técnico evaluador...</option>
                    {dtTecnico && !tecnicosDisponibles.includes(dtTecnico) && (
                      <option value={dtTecnico}>{dtTecnico}</option>
                    )}
                    {tecnicosDisponibles.map((nombre) => (
                      <option key={nombre} value={nombre}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Condición Estética y Daños Físicos Externos</Label>
                <Input
                  value={dtDanosFisicos}
                  onChange={(e) => setDtDanosFisicos(e.target.value)}
                  placeholder="Ej. Carcasa en buen estado / Raspones leves en bisel superior"
                  className="text-xs h-8.5 bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Diagnóstico Detallado *</Label>
                <textarea
                  value={dtDetalle}
                  onChange={(e) => setDtDetalle(e.target.value)}
                  placeholder="Descripción técnica exhaustiva del problema y pruebas de descarte..."
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Falla Real (Causa Raíz / Conclusión) *</Label>
                <Input
                  value={dtHallazgos}
                  onChange={(e) => setDtHallazgos(e.target.value)}
                  placeholder="Ej. Cortocircuito en línea de 19V / Mosfet dañado"
                  className="text-xs h-8.5 bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Recomendaciones / Solución</Label>
                <Input
                  value={dtRecomendaciones}
                  onChange={(e) => setDtRecomendaciones(e.target.value)}
                  placeholder="Ej. Reemplazo de módulo y pasta térmica"
                  className="text-xs h-8.5 bg-white"
                />
              </div>

              {/* Checkbox Requiere Repuestos */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chkRepuestos"
                      checked={dtRequiereRepuestos}
                      onChange={(e) => {
                        setDtRequiereRepuestos(e.target.checked)
                        if (!e.target.checked) {
                          setDtRepuestosSeleccionados([])
                          setRepuestoSelId("")
                          setBusquedaRepuesto("")
                        }
                      }}
                      className="rounded border-slate-300 text-[#2369A1] focus:ring-[#2369A1]"
                    />
                    <Label htmlFor="chkRepuestos" className="text-xs font-semibold cursor-pointer text-slate-800">
                      Requiere Repuestos / Componentes
                    </Label>
                  </div>
                  {dtRequiereRepuestos && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Package className="w-3 h-3 text-amber-700" />
                      {dtRepuestosSeleccionados.length} pieza(s) vinculada(s)
                    </span>
                  )}
                </div>

                {/* Panel Normalizado de Repuestos Requeridos (DT) */}
                {dtRequiereRepuestos && (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    {/* Encabezado limpio */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-[#2369A1]" />
                        <span className="text-xs font-bold text-slate-800">
                          Requerimiento de Repuestos / Componentes
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                        {dtRepuestosSeleccionados.length} pieza(s) agregada(s)
                      </span>
                    </div>

                    {!mostrarFormNuevoRepuesto ? (
                      /* Modo Búsqueda Ligera y No Sobrecargada */
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {/* Buscador predictivo compacto con dropdown flotante */}
                          <div className="relative flex-1 min-w-0">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                              type="text"
                              value={busquedaRepuesto}
                              onChange={(e) => {
                                setBusquedaRepuesto(e.target.value)
                                setMostrarSugerencias(true)
                                if (!e.target.value) setRepuestoSelId("")
                              }}
                              onFocus={() => setMostrarSugerencias(true)}
                              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 250)}
                              placeholder="Buscar por P/N o descripción del repuesto..."
                              className="text-xs pl-8 pr-7 h-8.5 bg-white border-slate-300"
                            />
                            {busquedaRepuesto && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBusquedaRepuesto("")
                                  setRepuestoSelId("")
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                title="Limpiar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Dropdown de Sugerencias Flotante y Ligero */}
                            {mostrarSugerencias && (
                              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
                                {repuestosFiltrados.length > 0 ? (
                                  repuestosFiltrados.map((rep) => (
                                    <button
                                      key={rep.id}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        setRepuestoSelId(rep.id)
                                        setBusquedaRepuesto(`[${rep.id}] ${rep.descripcion}`)
                                        setMostrarSugerencias(false)
                                      }}
                                      className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50/80 transition-colors flex items-center justify-between gap-2 ${repuestoSelId === rep.id ? "bg-blue-50 text-[#2369A1] font-semibold" : "text-slate-700"
                                        }`}
                                    >
                                      <div className="truncate flex-1">
                                        <span className="font-mono font-bold text-slate-900 mr-1.5">[{rep.id}]</span>
                                        <span>{rep.descripcion}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                        {rep.categoria || "Repuesto"}
                                      </span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="p-3 text-center text-xs text-slate-500">
                                    No se encontraron repuestos con ese término en el catálogo.
                                  </div>
                                )}

                                {/* Opción rápida para registrar si no está en la lista */}
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setNuevoRepuestoPN(busquedaRepuesto.startsWith("[") ? "" : busquedaRepuesto.toUpperCase())
                                    setNuevoRepuestoModelo(caso?.equipo?.modelo || "")
                                    setMostrarFormNuevoRepuesto(true)
                                    setMostrarSugerencias(false)
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#2369A1] bg-slate-50 hover:bg-blue-50 transition-colors flex items-center gap-1.5 border-t border-slate-100"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>¿No está en la lista? + Registrar nueva pieza detallada</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Cantidad y Botón Añadir */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <Label className="text-[11px] text-slate-600 font-medium">Cant:</Label>
                              <Input
                                type="number"
                                min={1}
                                value={repuestoCantidad}
                                onChange={(e) => setRepuestoCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 text-xs bg-white h-8.5 text-center font-bold"
                              />
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAgregarRepuesto}
                              disabled={!repuestoSelId}
                              className="bg-[#2369A1] hover:bg-[#1a517e] text-white text-xs h-8.5 px-3 font-semibold shrink-0 gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Añadir
                            </Button>
                          </div>
                        </div>

                        {/* Enlace discreto para añadir pieza personalizada */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>Seleccione del catálogo o registre si requiere una pieza nueva.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNuevoRepuestoPN(busquedaRepuesto.startsWith("[") ? "" : busquedaRepuesto.toUpperCase())
                              setNuevoRepuestoModelo(caso?.equipo?.modelo || "")
                              setMostrarFormNuevoRepuesto(true)
                              setMostrarSugerencias(false)
                            }}
                            className="text-[#2369A1] hover:underline font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registrar nueva pieza detallada</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Formulario Detallado y Estructurado para Nuevo Repuesto */
                      <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2.5 shadow-2xs animate-in fade-in-50 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <PlusCircle className="w-4 h-4 text-[#2369A1]" />
                            <span className="text-xs font-bold text-slate-800">
                              Detalle de la Nueva Pieza Requerida
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMostrarFormNuevoRepuesto(false)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Volver al buscador"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-700">Part Number (P/N) *</Label>
                            <Input
                              placeholder="Ej. M12345-001 o REF-KBD-01"
                              value={nuevoRepuestoPN}
                              onChange={(e) => setNuevoRepuestoPN(e.target.value.toUpperCase())}
                              className="text-xs h-7.5 bg-slate-50/50 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-700">Categoría del Componente</Label>
                            <select
                              value={nuevoRepuestoCat}
                              onChange={(e) => setNuevoRepuestoCat(e.target.value)}
                              className="w-full text-xs h-7.5 rounded border border-slate-200 px-2 bg-slate-50/50 text-slate-800"
                            >
                              <option value="Hardware">Hardware General</option>
                              <option value="Pantalla">Pantalla / Display / Flex</option>
                              <option value="Teclado">Teclado / Top Cover</option>
                              <option value="Touchpad">Touchpad / Clic</option>
                              <option value="Placa Madre">Placa Madre / Motherboard</option>
                              <option value="Batería">Batería / Alimentación / DC Jack</option>
                              <option value="Almacenamiento">SSD / HDD / RAM</option>
                              <option value="Refrigeración">Ventilador / Disipador</option>
                              <option value="Carcasa">Carcasa / Bisagras / Bisel</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-slate-700">Descripción Técnica Detallada *</Label>
                          <Input
                            placeholder="Ej. SPS-TOP COVER W/ KBD CP+PS BL US (Cubierta superior con teclado)"
                            value={nuevoRepuestoDesc}
                            onChange={(e) => setNuevoRepuestoDesc(e.target.value)}
                            className="text-xs h-7.5 bg-slate-50/50"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-700">Modelo Compatible</Label>
                            <Input
                              placeholder="Ej. EliteBook 840 G8"
                              value={nuevoRepuestoModelo}
                              onChange={(e) => setNuevoRepuestoModelo(e.target.value)}
                              className="text-xs h-7.5 bg-slate-50/50"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-700">Cantidad Requerida</Label>
                            <Input
                              type="number"
                              min={1}
                              value={nuevoRepuestoCantidad}
                              onChange={(e) => setNuevoRepuestoCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                              className="text-xs h-7.5 bg-slate-50/50 text-center font-bold"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setMostrarFormNuevoRepuesto(false)}
                            className="text-xs h-7.5 text-slate-600"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={guardandoNuevoRepuesto}
                            onClick={handleGuardarNuevoRepuesto}
                            className="bg-[#2369A1] hover:bg-[#1a517e] text-white text-xs h-7.5 px-3 font-semibold gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {guardandoNuevoRepuesto ? "Guardando..." : "Guardar en Catálogo y Vincular al DT"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Tabla Limpia de Repuestos Requeridos (Sin Stock, puramente piezas y cantidades necesarias) */}
                    {dtRepuestosSeleccionados.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-[11px]">
                              <tr>
                                <th className="py-1.5 px-3 text-left font-semibold">P/N</th>
                                <th className="py-1.5 px-3 text-left font-semibold">Descripción del Repuesto Requerido</th>
                                <th className="py-1.5 px-2 text-center font-semibold w-24">Cantidad</th>
                                <th className="py-1.5 px-2 text-center font-semibold w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {dtRepuestosSeleccionados.map((rep, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2 px-3 font-mono font-bold text-[#2369A1] text-[11px] whitespace-nowrap">
                                    {rep.partNumber}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700 text-[11px]">
                                    <div className="truncate max-w-[340px]" title={rep.descripcion}>
                                      {rep.descripcion}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center font-bold text-slate-900 text-xs">
                                    <span className="bg-blue-50 text-[#2369A1] border border-blue-200 px-2 py-0.5 rounded-md font-mono text-[11px]">
                                      {rep.cantidad} und
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarRepuesto(idx)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                      title="Quitar pieza requerida"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Diagnóstico con repuestos:</strong> Busque la pieza requerida en el catálogo o use <strong>&quot;+ Registrar nueva pieza detallada&quot;</strong> si el repuesto aún no está catalogado.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Fijo al Fondo */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0 rounded-b-2xl">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                <span>Fase 2: Diagnóstico y Cotización Estructurada</span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalDiagnosticoOpen(false)} className="text-xs">
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs">
                  Guardar Diagnóstico DT
                </Button>
              </div>
            </div>
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
                className={`flex-1 p-3 rounded-lg border text-xs font-semibold text-center transition-all ${decisionAprobado
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
              >
                ✓ APROBAR Intervención
              </button>
              <button
                type="button"
                onClick={() => setDecisionAprobado(false)}
                className={`flex-1 p-3 rounded-lg border text-xs font-semibold text-center transition-all ${!decisionAprobado
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
                          className={`p-2.5 rounded-lg border text-left transition-all ${modoCodigoOSDecision === "AUTO"
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
                          className={`p-2.5 rounded-lg border text-left transition-all ${modoCodigoOSDecision === "MANUAL"
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
