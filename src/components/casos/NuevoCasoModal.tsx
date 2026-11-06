"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Laptop, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Plus, 
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  RefreshCw,
  FolderOpen,
  Check,
  X,
  Phone,
  Mail,
  User,
  CreditCard,
  Edit3
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { getAllClientes, createCliente } from "@/services/clienteService"
import { getAllModelos, createModelo } from "@/services/modeloService"
import { verificarExpedienteActivoEquipo, crearNuevoCaso, registrarNuevaIncidencia } from "@/services/casoService"
import { Caso, Cliente, ModeloEquipo, OrigenIncidencia, PrioridadIncidencia } from "@/types"

interface NuevoCasoModalProps {
  children?: React.ReactNode
  onSuccess?: (codigoCaso: string) => void
}

const SINTOMAS_RAPIDOS = [
  "Pantalla oscura o parpadeo intermitente",
  "Equipo no enciende / sin energía",
  "Mantenimiento preventivo y limpieza física",
  "Sobrecalentamiento y apagado repentino",
  "Lentitud extrema o bloqueo de sistema operativo",
  "Falla de disco duro / no inicia Windows",
  "Sustitución de monitor o componente en alquiler"
]

export function NuevoCasoModal({ children, onSuccess }: NuevoCasoModalProps) {
  const router = useRouter()
  const { perfil, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [verificandoSerie, setVerificandoSerie] = useState(false)

  // Paso actual del Stepper Guiado (1: Activo, 2: Cliente, 3: Triage)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Operador autenticado
  const operadorNombre = perfil?.nombreCompleto || user?.displayName || "Operador de Recepción"
  const operadorCorreo = perfil?.correo || user?.email || "recepcion@murtecnologia.com"

  // Catálogos
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [modelos, setModelos] = useState<ModeloEquipo[]>([])

  // Expediente previo detectado
  const [casoExistente, setCasoExistente] = useState<Caso | null>(null)
  const [serieVerificada, setSerieVerificada] = useState(false)

  // Formulario: Activo (Paso 1)
  const [serie, setSerie] = useState("")
  const [tipoEquipo, setTipoEquipo] = useState("Laptop")
  const [marca, setMarca] = useState("HP")
  const [modelo, setModelo] = useState("")
  const [partNumber, setPartNumber] = useState("")

  // Catálogo de Modelos e Inline
  const [modeloSeleccionadoId, setModeloSeleccionadoId] = useState("")
  const [creandoModelo, setCreandoModelo] = useState(false)
  const [guardandoModelo, setGuardandoModelo] = useState(false)
  const [nuevoModeloTipo, setNuevoModeloTipo] = useState("Laptop")
  const [nuevoModeloMarca, setNuevoModeloMarca] = useState("")
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState("")
  const [nuevoModeloPartNumber, setNuevoModeloPartNumber] = useState("")

  // Formulario: Cliente y Modalidad (Paso 2)
  const [clienteId, setClienteId] = useState("")
  const [razonSocial, setRazonSocial] = useState("")
  const [ruc, setRuc] = useState("")
  const [contacto, setContacto] = useState("")
  const [telefono, setTelefono] = useState("")
  const [correo, setCorreo] = useState("")
  const [origen, setOrigen] = useState<OrigenIncidencia>("TALLER")
  const [contratoAlquiler, setContratoAlquiler] = useState("")
  const [modoEditarCliente, setModoEditarCliente] = useState(false)

  // Cliente Inline rápido
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [nuevoClienteRazon, setNuevoClienteRazon] = useState("")
  const [nuevoClienteRuc, setNuevoClienteRuc] = useState("")
  const [nuevoClienteContacto, setNuevoClienteContacto] = useState("")
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("")
  const [nuevoClienteCorreo, setNuevoClienteCorreo] = useState("")

  // Formulario: Incidencia Inicial y Triage (Paso 3)
  const [descripcionAveria, setDescripcionAveria] = useState("")
  const [prioridad, setPrioridad] = useState<PrioridadIncidencia>("MEDIA")
  const [requiereAnalisisTecnico, setRequiereAnalisisTecnico] = useState<boolean>(true)

  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      getAllClientes().then(setClientes).catch(console.error)
      getAllModelos().then(setModelos).catch(console.error)
    }
  }, [open])

  // Verificación de Serie
  const handleVerificarSerie = async (serieAValidar?: string) => {
    const valor = (serieAValidar || serie).trim().toUpperCase()
    if (!valor) return

    setVerificandoSerie(true)
    try {
      const caso = await verificarExpedienteActivoEquipo(valor)
      setCasoExistente(caso)
      setSerieVerificada(true)

      if (caso) {
        toast.info(`¡Expediente previo encontrado: ${caso.codigoCaso}! Datos del activo y cliente cargados automáticamente.`)
        // Rellenar automáticamente datos de cliente y activo desde el caso
        if (caso.cliente) {
          setRazonSocial(caso.cliente.razonSocial)
          setRuc(caso.cliente.ruc)
          setContacto(caso.cliente.contacto)
          setTelefono(caso.cliente.telefono || "")
          setCorreo(caso.cliente.correo || "")
          setClienteId(caso.cliente.ruc)
          setModoEditarCliente(false)
        }
        if (caso.equipo) {
          setTipoEquipo(caso.equipo.tipoEquipo || "Laptop")
          setMarca(caso.equipo.marca || "HP")
          setModelo(caso.equipo.modelo || "")
          setPartNumber(caso.equipo.partNumber || "")
        }
        if (caso.garantia?.activa) {
          setOrigen("RECLAMO_GARANTIA")
        }
        if (caso.contratoAlquiler) {
          setContratoAlquiler(caso.contratoAlquiler)
          setOrigen("ALQUILER")
        }
      }
    } catch (err) {
      console.error(err)
      toast.error("Error al validar el número de serie.")
    } finally {
      setVerificandoSerie(false)
    }
  }

  // Selección automática y en lote de Cliente (Razón Social, RUC, Contacto, Teléfono, Correo)
  const handleSeleccionarCliente = (id: string) => {
    setClienteId(id)
    if (!id) {
      setRazonSocial("")
      setRuc("")
      setContacto("")
      setTelefono("")
      setCorreo("")
      setModoEditarCliente(true)
      return
    }

    if (id === "__NUEVO__") {
      setRazonSocial("")
      setRuc("")
      setContacto("")
      setTelefono("")
      setCorreo("")
      setModoEditarCliente(true)
      return
    }

    const encontrado = clientes.find(c => (c.id || c.ruc) === id || c.ruc === id)
    if (encontrado) {
      setRazonSocial(encontrado.razonSocial)
      setRuc(encontrado.ruc)
      setContacto(encontrado.contacto || encontrado.nombreContacto || "")
      setTelefono(encontrado.telefono || "")
      setCorreo(encontrado.correo || "")
      setModoEditarCliente(false)
      toast.success(`Datos de ${encontrado.razonSocial} autocompletados correctamente.`)
    }
  }

  const handleCrearNuevoCliente = async () => {
    if (!nuevoClienteRazon.trim() || !nuevoClienteRuc.trim()) {
      toast.error("Razón social y RUC son obligatorios")
      return
    }
    try {
      const nuevo = await createCliente({
        razonSocial: nuevoClienteRazon.trim(),
        ruc: nuevoClienteRuc.trim(),
        contacto: nuevoClienteContacto.trim(),
        telefono: nuevoClienteTelefono.trim(),
        correo: nuevoClienteCorreo.trim()
      })
      toast.success("Cliente registrado y seleccionado con éxito")
      const actualizados = await getAllClientes()
      setClientes(actualizados)
      setClienteId(nuevo.id || nuevo.ruc)
      setRazonSocial(nuevo.razonSocial)
      setRuc(nuevo.ruc)
      setContacto(nuevo.contacto)
      setTelefono(nuevo.telefono || "")
      setCorreo(nuevo.correo || "")
      setCreandoCliente(false)
      setModoEditarCliente(false)
    } catch (e) {
      console.error(e)
      toast.error("Error al registrar cliente")
    }
  }

  // Selección automática de Modelo de Equipo (Plantilla)
  const handleSeleccionarModelo = (id: string) => {
    setModeloSeleccionadoId(id)
    if (!id) return
    const mod = modelos.find(m => (m.id || m.nombre) === id)
    if (mod) {
      setTipoEquipo(mod.tipo)
      setMarca(mod.marca)
      setModelo(mod.nombre)
      if (mod.partNumberSugerido) {
        setPartNumber(mod.partNumberSugerido)
      }
      toast.info(`Plantilla cargada: ${mod.marca} ${mod.nombre}`)
    }
  }

  // Registrar Nuevo Modelo Rápido en Catálogo
  const handleCrearNuevoModelo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!nuevoModeloMarca.trim() || !nuevoModeloNombre.trim()) {
      toast.error("Marca y Nombre del modelo son obligatorios.")
      return
    }

    setGuardandoModelo(true)
    try {
      const nuevo = await createModelo({
        marca: nuevoModeloMarca.trim(),
        nombre: nuevoModeloNombre.trim(),
        tipo: nuevoModeloTipo.trim() || "Laptop",
        partNumberSugerido: nuevoModeloPartNumber.trim() || ""
      })

      const lista = await getAllModelos()
      setModelos(lista)
      setModeloSeleccionadoId(nuevo.id || "")
      setTipoEquipo(nuevo.tipo)
      setMarca(nuevo.marca)
      setModelo(nuevo.nombre)
      if (nuevo.partNumberSugerido) {
        setPartNumber(nuevo.partNumberSugerido)
      }

      setCreandoModelo(false)
      setNuevoModeloMarca("")
      setNuevoModeloNombre("")
      setNuevoModeloPartNumber("")
      toast.success(`Modelo "${nuevo.marca} ${nuevo.nombre}" registrado y aplicado.`)
    } catch (err) {
      console.error(err)
      toast.error("Error al registrar el modelo.")
    } finally {
      setGuardandoModelo(false)
    }
  }

  // Validaciones por paso
  const validarPaso1 = () => {
    if (!serie.trim()) {
      toast.error("Por favor ingrese el número de serie (S/N) del equipo.")
      return false
    }
    if (!marca.trim() || !modelo.trim()) {
      toast.error("Por favor complete la marca y modelo del equipo.")
      return false
    }
    return true
  }

  const validarPaso2 = () => {
    if (!razonSocial.trim() || !ruc.trim()) {
      toast.error("Por favor seleccione un cliente o complete Razón Social y RUC.")
      return false
    }
    if (origen === "ALQUILER" && !contratoAlquiler.trim()) {
      toast.error("Por favor ingrese el número de contrato de alquiler.")
      return false
    }
    return true
  }

  // Submit Final
  const handleCrearCaso = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validarPaso1()) {
      setCurrentStep(1)
      return
    }
    if (!validarPaso2()) {
      setCurrentStep(2)
      return
    }
    if (!descripcionAveria.trim()) {
      setCurrentStep(3)
      toast.error("Por favor describa la avería o motivo de la atención.")
      return
    }

    setGuardando(true)
    try {
      if (casoExistente) {
        // ETAPA 0 DEL FLUJO: Si existe caso previo abierto o en garantía, RECUPERAR CASO EXISTENTE y registrar nueva INC
        const esGarantia = Boolean(casoExistente.garantia?.activa) || origen === "RECLAMO_GARANTIA"
        const nuevaInc = await registrarNuevaIncidencia(casoExistente.codigoCaso, {
          descripcion: descripcionAveria.trim(),
          prioridad,
          reportadoPor: contacto || razonSocial,
          origen: esGarantia ? "RECLAMO_GARANTIA" : origen,
          requiereAnalisisTecnico,
          esReingresoGarantia: esGarantia,
          autor: `${operadorNombre} (${operadorCorreo})`
        })

        toast.success(`Incidencia ${nuevaInc.codigoINC} anexada al expediente único ${casoExistente.codigoCaso}.`)
        setOpen(false)
        if (onSuccess) onSuccess(casoExistente.codigoCaso)
        router.push(`/casos/${casoExistente.codigoCaso}`)
        return
      }

      // Si no existe caso previo activo: Apertura NUEVO CASO (CASO-XXXXXX)
      const nuevoCaso = await crearNuevoCaso({
        cliente: {
          razonSocial: razonSocial.trim(),
          ruc: ruc.trim(),
          contacto: contacto.trim(),
          telefono: telefono.trim(),
          correo: correo.trim()
        },
        equipo: {
          tipoEquipo,
          marca: marca.trim(),
          modelo: modelo.trim(),
          numeroSerie: serie.trim().toUpperCase(),
          partNumber: partNumber.trim()
        },
        origen,
        contratoAlquiler: origen === "ALQUILER" ? contratoAlquiler.trim() : undefined,
        responsableApertura: `${operadorNombre} (${operadorCorreo})`,
        incidenciaInicial: {
          descripcion: descripcionAveria.trim(),
          prioridad,
          reportadoPor: contacto || razonSocial,
          requiereAnalisisTecnico
        }
      })

      toast.success(`Expediente ${nuevoCaso.codigoCaso} aperturado con éxito.`)
      setOpen(false)
      if (onSuccess) onSuccess(nuevoCaso.codigoCaso)
      router.push(`/casos/${nuevoCaso.codigoCaso}`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error al procesar el caso.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        children ? (
          children as any
        ) : (
          <Button className="bg-[#2369A1] hover:bg-[#1B5380] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs flex items-center gap-1.5 transition-all">
            <Plus className="w-4 h-4" />
            Aperturar Caso / Expediente
          </Button>
        )
      } />

      <DialogContent className="sm:max-w-[760px] w-full max-h-[92vh] flex flex-col bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
        {/* Cabecera Principal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2369A1]/10 border border-[#2369A1]/20 flex items-center justify-center text-[#2369A1] shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Apertura de Expediente Técnico
                </DialogTitle>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2369A1]/10 text-[#2369A1] border border-[#2369A1]/20">
                  CASO MÁSTER
                </span>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Registro de activo, identificación de cliente y triage de ruta técnica • MUR Tecnología S.A.C.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Stepper Guiado y Visualmente Ligero */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {/* Paso 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${
                currentStep === 1
                  ? "bg-white border border-[#2369A1]/40 shadow-xs text-[#2369A1] ring-1 ring-[#2369A1]/20 font-bold"
                  : serie.trim()
                    ? "bg-white/70 hover:bg-white text-slate-700 border border-slate-200/80"
                    : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 font-bold ${
                currentStep === 1
                  ? "bg-[#2369A1] text-white"
                  : serie.trim()
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
              }`}>
                {serie.trim() && currentStep !== 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
              </div>
              <div className="truncate">
                <span className="text-xs block leading-tight">1. Activo & Serie</span>
                <span className="text-[10px] text-slate-400 block truncate font-normal">
                  {serie ? `${serie}` : "S/N del equipo"}
                </span>
              </div>
            </button>

            {/* Paso 2 */}
            <button
              type="button"
              onClick={() => {
                if (validarPaso1()) setCurrentStep(2)
              }}
              className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${
                currentStep === 2
                  ? "bg-white border border-[#2369A1]/40 shadow-xs text-[#2369A1] ring-1 ring-[#2369A1]/20 font-bold"
                  : razonSocial.trim()
                    ? "bg-white/70 hover:bg-white text-slate-700 border border-slate-200/80"
                    : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 font-bold ${
                currentStep === 2
                  ? "bg-[#2369A1] text-white"
                  : razonSocial.trim()
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
              }`}>
                {razonSocial.trim() && currentStep !== 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
              </div>
              <div className="truncate">
                <span className="text-xs block leading-tight">2. Cliente & Origen</span>
                <span className="text-[10px] text-slate-400 block truncate font-normal">
                  {razonSocial ? razonSocial : "Empresa / RUC"}
                </span>
              </div>
            </button>

            {/* Paso 3 */}
            <button
              type="button"
              onClick={() => {
                if (validarPaso1() && validarPaso2()) setCurrentStep(3)
              }}
              className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${
                currentStep === 3
                  ? "bg-white border border-[#2369A1]/40 shadow-xs text-[#2369A1] ring-1 ring-[#2369A1]/20 font-bold"
                  : descripcionAveria.trim()
                    ? "bg-white/70 hover:bg-white text-slate-700 border border-slate-200/80"
                    : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 font-bold ${
                currentStep === 3
                  ? "bg-[#2369A1] text-white"
                  : descripcionAveria.trim()
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
              }`}>
                {descripcionAveria.trim() && currentStep !== 3 ? <Check className="w-3.5 h-3.5" /> : "3"}
              </div>
              <div className="truncate">
                <span className="text-xs block leading-tight">3. Falla & Triage</span>
                <span className="text-[10px] text-slate-400 block truncate font-normal">
                  {requiereAnalisisTecnico ? "Ruta 2.B DT" : "Ruta 2.A Simple"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Contenido Guiado Paso a Paso */}
        <form onSubmit={handleCrearCaso} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">

            {/* ========================================================================= */}
            {/* PASO 1: IDENTIFICACIÓN DEL ACTIVO Y SERIE */}
            {/* ========================================================================= */}
            {currentStep === 1 && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-[#2369A1]" />
                      Paso 1: Número de Serie & Datos del Activo
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreandoModelo(!creandoModelo)}
                      className="text-xs font-semibold text-[#2369A1] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {creandoModelo ? "Seleccionar de la lista" : "+ Crear Nuevo Modelo"}
                    </button>
                  </div>

                  {/* Input S/N */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Número de Serie (S/N) <span className="text-rose-500">*</span>
                      </Label>
                      {serieVerificada && !casoExistente && serie && (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Serie Verificada (Sin caso previo)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ej. CNC41717B5, 5CD2341ABC..."
                        value={serie}
                        onChange={(e) => {
                          setSerie(e.target.value.toUpperCase())
                          setSerieVerificada(false)
                          setCasoExistente(null)
                        }}
                        onBlur={() => handleVerificarSerie()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleVerificarSerie()
                          }
                        }}
                        className="font-mono text-xs uppercase font-bold tracking-wider bg-white h-9"
                        autoFocus
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleVerificarSerie()}
                        disabled={verificandoSerie || !serie.trim()}
                        className="text-xs px-4 shrink-0 border-slate-300 text-slate-700 hover:bg-slate-50 h-9"
                      >
                        {verificandoSerie ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2369A1]" />
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5 mr-1.5 text-[#2369A1]" />
                            Validar Serie
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* ALERTA: Si el equipo ya cuenta con expediente previo o garantía activa */}
                  {serieVerificada && casoExistente && (
                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-[#2369A1] shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <p className="font-bold text-slate-900">
                            ¡Expediente previo detectado: {casoExistente.codigoCaso} ({casoExistente.estado})!
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            El sistema recuperó automáticamente la información del activo y cliente. Al enviar este formulario, se anexará una nueva <strong>Incidencia (INC)</strong> manteniendo el expediente único.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setCurrentStep(3)}
                          className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs h-7 px-3 font-semibold gap-1"
                        >
                          Ir directo a Falla & Triage (Paso 3) →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Panel Opcional: Registrar Nuevo Modelo en Catálogo */}
                  {creandoModelo && (
                    <div className="bg-blue-50/40 border border-blue-200 rounded-lg p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#2369A1]" />
                          Registrar Nuevo Modelo en Catálogo
                        </p>
                        <button
                          type="button"
                          onClick={() => setCreandoModelo(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[11px] text-slate-700">Tipo *</Label>
                          <select
                            value={nuevoModeloTipo}
                            onChange={(e) => setNuevoModeloTipo(e.target.value)}
                            className="w-full text-xs h-8 rounded border border-slate-300 bg-white px-2 mt-0.5 text-slate-800"
                          >
                            <option value="Laptop">Laptop</option>
                            <option value="Desktop">Desktop</option>
                            <option value="Monitor">Monitor</option>
                            <option value="All-in-One">All-in-One</option>
                            <option value="Servidor">Servidor</option>
                            <option value="Impresora">Impresora</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-700">Marca *</Label>
                          <Input
                            placeholder="HP, Lenovo, Dell..."
                            value={nuevoModeloMarca}
                            onChange={(e) => setNuevoModeloMarca(e.target.value)}
                            className="text-xs bg-white h-8 mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-700">Modelo *</Label>
                          <Input
                            placeholder="Ej. Pro SFF 400 G9"
                            value={nuevoModeloNombre}
                            onChange={(e) => setNuevoModeloNombre(e.target.value)}
                            className="text-xs bg-white h-8 mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-700">P/N Sugerido</Label>
                          <Input
                            placeholder="Opcional"
                            value={nuevoModeloPartNumber}
                            onChange={(e) => setNuevoModeloPartNumber(e.target.value)}
                            className="text-xs bg-white h-8 mt-0.5 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setCreandoModelo(false)}
                          className="text-xs h-7 border-slate-300"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCrearNuevoModelo}
                          disabled={guardandoModelo}
                          className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs h-7 font-semibold"
                        >
                          {guardandoModelo ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                          Guardar Modelo
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Plantilla de Modelo Rápido */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Cargar Plantilla de Modelo Frecuente</span>
                      <span className="text-[10px] text-slate-400 font-normal">Autocompleta Tipo, Marca y P/N</span>
                    </Label>
                    <select
                      value={modeloSeleccionadoId}
                      onChange={(e) => handleSeleccionarModelo(e.target.value)}
                      className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 text-slate-800 focus:outline-none focus:border-[#2369A1]"
                    >
                      <option value="">-- Seleccionar modelo del catálogo para autocompletar --</option>
                      {modelos.map(m => (
                        <option key={m.id || m.nombre} value={m.id || m.nombre}>
                          [{m.marca}] {m.nombre} ({m.tipo}){m.partNumberSugerido ? ` • P/N: ${m.partNumberSugerido}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Datos del Dispositivo */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Tipo de Equipo</Label>
                      <select
                        value={tipoEquipo}
                        onChange={(e) => setTipoEquipo(e.target.value)}
                        className="w-full text-xs h-8.5 rounded-md border border-slate-200 bg-white px-2.5 text-slate-800 focus:outline-none focus:border-[#2369A1]"
                      >
                        <option value="Laptop">Laptop / Portátil</option>
                        <option value="Desktop">Desktop / Computadora</option>
                        <option value="Monitor">Monitor / Pantalla</option>
                        <option value="All-in-One">All-in-One</option>
                        <option value="Servidor">Servidor</option>
                        <option value="Impresora">Impresora</option>
                        <option value="Otro">Otro Dispositivo</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Marca <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        placeholder="HP, Lenovo, Dell..."
                        className="text-xs bg-white h-8.5"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Modelo <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        placeholder="Ej. Pro SFF 400 G9"
                        className="text-xs bg-white h-8.5"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Part Number (P/N)</Label>
                      <Input
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        placeholder="Opcional"
                        className="text-xs font-mono bg-white h-8.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (validarPaso1()) setCurrentStep(2)
                    }}
                    className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 h-9 gap-1.5 shadow-xs"
                  >
                    Siguiente: Cliente & Modalidad
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 2: CLIENTE CORPORATIVO Y MODALIDAD DE ATENCIÓN */}
            {/* ========================================================================= */}
            {currentStep === 2 && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#2369A1]" />
                      Paso 2: Identificación del Cliente y Modalidad
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreandoCliente(!creandoCliente)}
                      className="text-xs font-semibold text-[#2369A1] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {creandoCliente ? "Volver a la lista" : "+ Registrar Nuevo Cliente"}
                    </button>
                  </div>

                  {/* Panel Opcional: Nuevo Cliente Rápido */}
                  {creandoCliente ? (
                    <div className="bg-blue-50/40 border border-blue-200 rounded-lg p-3 space-y-2.5">
                      <p className="text-xs font-bold text-slate-800">Registrar Nuevo Cliente Corporativo</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          placeholder="Razón Social *"
                          value={nuevoClienteRazon}
                          onChange={(e) => setNuevoClienteRazon(e.target.value)}
                          className="text-xs bg-white h-8"
                        />
                        <Input
                          placeholder="RUC (11 dígitos) *"
                          value={nuevoClienteRuc}
                          onChange={(e) => setNuevoClienteRuc(e.target.value)}
                          className="text-xs font-mono bg-white h-8"
                          maxLength={11}
                        />
                        <Input
                          placeholder="Contacto Principal"
                          value={nuevoClienteContacto}
                          onChange={(e) => setNuevoClienteContacto(e.target.value)}
                          className="text-xs bg-white h-8"
                        />
                        <Input
                          placeholder="Teléfono / WhatsApp"
                          value={nuevoClienteTelefono}
                          onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                          className="text-xs bg-white h-8"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setCreandoCliente(false)}
                          className="text-xs h-7"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCrearNuevoCliente}
                          className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs h-7 font-semibold"
                        >
                          Guardar y Usar Cliente
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Selector de Cliente con Autocompletado Instantáneo */
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span>Seleccionar Cliente Registrado:</span>
                        <span className="text-[10px] text-slate-400 font-normal">Autocompleta Razón Social, RUC, Contacto, Tel y Correo</span>
                      </Label>
                      <select
                        value={clienteId}
                        onChange={(e) => handleSeleccionarCliente(e.target.value)}
                        className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 text-slate-800 focus:outline-none focus:border-[#2369A1]"
                      >
                        <option value="">-- Seleccionar cliente de la lista para llenado automático --</option>
                        {clientes.map(c => (
                          <option key={c.id || c.ruc} value={c.id || c.ruc}>
                            {c.razonSocial} (RUC: {c.ruc})
                          </option>
                        ))}
                        <option value="__NUEVO__">+ Ingresar otro cliente manualmente...</option>
                      </select>
                    </div>
                  )}

                  {/* TARJETA DE CLIENTE CONFIRMADO (Visually Light & Usable) */}
                  {razonSocial && !modoEditarCliente ? (
                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2369A1] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Cliente Seleccionado y Autocompletado
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{razonSocial}</h4>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setModoEditarCliente(true)}
                          className="text-[11px] h-7 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          Modificar datos
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-blue-100 text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">RUC</span>
                          <span className="font-mono font-bold text-slate-800">{ruc}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Contacto</span>
                          <span className="font-medium text-slate-800 truncate block">{contacto || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Teléfono</span>
                          <span className="text-slate-800">{telefono || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Correo</span>
                          <span className="text-slate-800 truncate block">{correo || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Campos Editables de Cliente */
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold text-slate-700">
                            Razón Social <span className="text-rose-500">*</span>
                          </Label>
                          <Input
                            value={razonSocial}
                            onChange={(e) => setRazonSocial(e.target.value)}
                            placeholder="Nombre de la empresa o cliente"
                            className="text-xs bg-white h-8.5"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">
                            RUC <span className="text-rose-500">*</span>
                          </Label>
                          <Input
                            value={ruc}
                            onChange={(e) => setRuc(e.target.value)}
                            placeholder="20XXXXXXXXX"
                            className="text-xs font-mono bg-white h-8.5"
                            maxLength={11}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Contacto / Solicitante</Label>
                          <Input
                            value={contacto}
                            onChange={(e) => setContacto(e.target.value)}
                            placeholder="Persona que reporta"
                            className="text-xs bg-white h-8.5"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp</Label>
                          <Input
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            placeholder="9XXXXXXXX"
                            className="text-xs bg-white h-8.5"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Correo Electrónico</Label>
                          <Input
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            placeholder="contacto@empresa.com"
                            className="text-xs bg-white h-8.5"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modalidad / Origen del Ingreso */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <Label className="text-xs font-semibold text-slate-700">
                      Modalidad / Origen del Servicio:
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrigen("TALLER")}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          origen === "TALLER"
                            ? "border-[#2369A1] bg-[#2369A1]/5 ring-1 ring-[#2369A1] text-slate-900 shadow-2xs font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                          <span className={`w-2 h-2 rounded-full ${origen === "TALLER" ? "bg-[#2369A1]" : "bg-slate-300"}`} />
                          Taller General
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Ingreso particular / estándar</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrigen("ALQUILER")}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          origen === "ALQUILER"
                            ? "border-[#2369A1] bg-[#2369A1]/5 ring-1 ring-[#2369A1] text-slate-900 shadow-2xs font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                          <span className={`w-2 h-2 rounded-full ${origen === "ALQUILER" ? "bg-[#2369A1]" : "bg-slate-300"}`} />
                          Alquiler Corporativo
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Activo bajo contrato de alquiler</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrigen("RECLAMO_GARANTIA")}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          origen === "RECLAMO_GARANTIA"
                            ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 text-slate-900 shadow-2xs font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                          <span className={`w-2 h-2 rounded-full ${origen === "RECLAMO_GARANTIA" ? "bg-emerald-600" : "bg-slate-300"}`} />
                          Reclamo de Garantía
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Retrabajo / cobertura activa</p>
                      </button>
                    </div>

                    {origen === "ALQUILER" && (
                      <div className="space-y-1 bg-blue-50/40 p-2.5 rounded-lg border border-blue-200 mt-1">
                        <Label className="text-xs font-semibold text-blue-900">
                          N° Contrato de Alquiler <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          placeholder="Ej. CTR-ALQ-2026-088"
                          value={contratoAlquiler}
                          onChange={(e) => setContratoAlquiler(e.target.value)}
                          className="text-xs font-mono bg-white h-8"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs h-9 border-slate-300 gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (validarPaso2()) setCurrentStep(3)
                    }}
                    className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 h-9 gap-1.5 shadow-xs"
                  >
                    Siguiente: Falla & Triage
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 3: AVERÍA REPORTADA Y TRIAGE DE RUTA */}
            {/* ========================================================================= */}
            {currentStep === 3 && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#2369A1]" />
                      Paso 3: Falla / Avería Reportada & Triage de Ruta
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      INC-001
                    </span>
                  </div>

                  {/* Falla Reportada */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Falla / Síntoma Reportado por el Cliente <span className="text-rose-500">*</span>
                    </Label>
                    <textarea
                      value={descripcionAveria}
                      onChange={(e) => setDescripcionAveria(e.target.value)}
                      placeholder="Describa el problema reportado (ej: pantalla oscurece de manera intermitente durante la jornada)..."
                      rows={3}
                      className="w-full text-xs rounded-lg border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:border-[#2369A1] resize-none bg-white"
                      required
                      autoFocus
                    />

                    {/* Chips de síntomas rápidos */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Sugerencias rápidas (haga clic para insertar):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SINTOMAS_RAPIDOS.map((sintoma, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setDescripcionAveria(prev => prev ? `${prev}. ${sintoma}` : sintoma)
                            }}
                            className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-[#2369A1] hover:border-blue-200 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full transition-all"
                          >
                            + {sintoma}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prioridad */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-semibold text-slate-700">Nivel de Prioridad:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "BAJA", label: "Baja", desc: "No bloquea", dot: "bg-slate-400" },
                        { id: "MEDIA", label: "Media", desc: "Uso parcial", dot: "bg-blue-500" },
                        { id: "ALTA", label: "Alta", desc: "Inoperativo", dot: "bg-amber-500" },
                        { id: "CRITICA", label: "Crítica", desc: "SLA Urgente", dot: "bg-rose-500" }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPrioridad(p.id as PrioridadIncidencia)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            prioridad === p.id
                              ? "border-[#2369A1] bg-[#2369A1]/5 ring-1 ring-[#2369A1] text-slate-900 font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                            {p.label}
                          </div>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{p.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bifurcación Clave del Flujo Oficial (Ruta 2.B vs 2.A) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <Label className="text-xs font-bold text-slate-800">
                      Triage de Ruta Técnica: ¿Requiere análisis técnico y descarte formal?
                    </Label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRequiereAnalisisTecnico(true)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          requiereAnalisisTecnico
                            ? "border-[#2369A1] bg-blue-50/60 ring-2 ring-[#2369A1] text-slate-900 shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <span className={`w-2.5 h-2.5 rounded-full ${requiereAnalisisTecnico ? "bg-[#2369A1]" : "bg-slate-300"}`} />
                            SÍ — Ruta 2.B Diagnóstico (DT)
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#2369A1]">
                            Laboratorio
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Pasa a <strong>2.B Diagnóstico Técnico (DT)</strong>, cotización de repuestos y aprobación previa de jefatura/cliente antes de taller.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRequiereAnalisisTecnico(false)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          !requiereAnalisisTecnico
                            ? "border-teal-600 bg-teal-50/80 ring-2 ring-teal-600 text-slate-900 shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <span className={`w-2.5 h-2.5 rounded-full ${!requiereAnalisisTecnico ? "bg-teal-600" : "bg-slate-300"}`} />
                            NO — Ruta 2.A Atención Simple
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                            Soporte Menor
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Mantenimiento rápido, sustitución directa o configuración. Emite <strong>Constancia de Atención</strong> y pasa a entrega.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Resumen del Caso Previo al Envío */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-600">
                    <div className="truncate">
                      <span>Activo: <strong className="text-slate-800">{marca} {modelo} ({serie})</strong></span>
                      <span className="mx-2">•</span>
                      <span>Cliente: <strong className="text-slate-800">{razonSocial}</strong></span>
                    </div>
                    <span className="font-bold text-[#2369A1] shrink-0">
                      {requiereAnalisisTecnico ? "Ruta 2.B" : "Ruta 2.A"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs h-9 border-slate-300 gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Anterior
                  </Button>

                  <Button
                    type="submit"
                    disabled={guardando}
                    className={casoExistente ? "bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-5 h-9 shadow-xs" : "bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-5 h-9 shadow-xs"}
                  >
                    {guardando ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Procesando...
                      </>
                    ) : casoExistente ? (
                      <>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {casoExistente.garantia?.activa 
                          ? `Reingreso por Garantía (${casoExistente.codigoCaso})`
                          : (casoExistente.estado === "CERRADO" || casoExistente.estado === "CERRADO_SIN_REPARACION")
                            ? `Reactivar Expediente (${casoExistente.codigoCaso})`
                            : `Anexar Incidencia a ${casoExistente.codigoCaso}`}
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                        Aperturar Expediente Técnico (Caso)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* Footer Fijo de Estado y Operador */}
          <div className="px-6 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Operador: <strong className="text-slate-800">{operadorNombre}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-700 text-xs font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
