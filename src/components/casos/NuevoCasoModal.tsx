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
  ShieldCheck, 
  FileText, 
  Clock, 
  Plus, 
  ArrowRight,
  Sparkles,
  Building2,
  RefreshCw,
  FolderOpen,
  Wrench
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { getAllClientes, createCliente } from "@/services/clienteService"
import { getAllModelos } from "@/services/modeloService"
import { verificarExpedienteActivoEquipo, crearNuevoCaso } from "@/services/casoService"
import { Caso, Cliente, ModeloEquipo, OrigenIncidencia, PrioridadIncidencia } from "@/types"

interface NuevoCasoModalProps {
  children?: React.ReactNode
  onSuccess?: (codigoCaso: string) => void
}

export function NuevoCasoModal({ children, onSuccess }: NuevoCasoModalProps) {
  const router = useRouter()
  const { perfil, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [verificandoSerie, setVerificandoSerie] = useState(false)

  // Operador autenticado
  const operadorNombre = perfil?.nombreCompleto || user?.displayName || "Operador de Recepción"
  const operadorCorreo = perfil?.correo || user?.email || "recepcion@murtecnologia.com"

  // Catálogos
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [modelos, setModelos] = useState<ModeloEquipo[]>([])

  // Expediente previo detectado
  const [casoExistente, setCasoExistente] = useState<Caso | null>(null)
  const [serieVerificada, setSerieVerificada] = useState(false)

  // Formulario: Activo
  const [serie, setSerie] = useState("")
  const [tipoEquipo, setTipoEquipo] = useState("Laptop")
  const [marca, setMarca] = useState("HP")
  const [modelo, setModelo] = useState("")
  const [partNumber, setPartNumber] = useState("")

  // Formulario: Cliente y Contrato
  const [clienteId, setClienteId] = useState("")
  const [razonSocial, setRazonSocial] = useState("")
  const [ruc, setRuc] = useState("")
  const [contacto, setContacto] = useState("")
  const [telefono, setTelefono] = useState("")
  const [correo, setCorreo] = useState("")
  const [origen, setOrigen] = useState<OrigenIncidencia>("TALLER")
  const [contratoAlquiler, setContratoAlquiler] = useState("")

  // Formulario: Incidencia Inicial
  const [descripcionAveria, setDescripcionAveria] = useState("")
  const [prioridad, setPrioridad] = useState<PrioridadIncidencia>("MEDIA")
  const [requiereAnalisisTecnico, setRequiereAnalisisTecnico] = useState(true)

  // Cliente Inline
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [nuevoClienteRazon, setNuevoClienteRazon] = useState("")
  const [nuevoClienteRuc, setNuevoClienteRuc] = useState("")
  const [nuevoClienteContacto, setNuevoClienteContacto] = useState("")

  useEffect(() => {
    if (open) {
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
        toast.info(`Se encontró expediente activo previo: ${caso.codigoCaso}`)
        // Rellenar automáticamente datos de cliente y activo desde el caso
        if (caso.cliente) {
          setRazonSocial(caso.cliente.razonSocial)
          setRuc(caso.cliente.ruc)
          setContacto(caso.cliente.contacto)
          setTelefono(caso.cliente.telefono || "")
          setCorreo(caso.cliente.correo || "")
        }
        if (caso.equipo) {
          setTipoEquipo(caso.equipo.tipoEquipo)
          setMarca(caso.equipo.marca)
          setModelo(caso.equipo.modelo)
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

  const handleSeleccionarCliente = (id: string) => {
    setClienteId(id)
    const encontrado = clientes.find(c => (c.id || c.ruc) === id)
    if (encontrado) {
      setRazonSocial(encontrado.razonSocial)
      setRuc(encontrado.ruc)
      setContacto(encontrado.contacto || encontrado.nombreContacto || "")
      setTelefono(encontrado.telefono || "")
      setCorreo(encontrado.correo || "")
    }
  }

  const handleCrearNuevoCliente = async () => {
    if (!nuevoClienteRazon || !nuevoClienteRuc) {
      toast.error("Razón social y RUC son obligatorios")
      return
    }
    try {
      await createCliente({
        razonSocial: nuevoClienteRazon,
        ruc: nuevoClienteRuc,
        contacto: nuevoClienteContacto,
        telefono: "",
        correo: ""
      })
      toast.success("Cliente registrado con éxito")
      const actualizados = await getAllClientes()
      setClientes(actualizados)
      setRazonSocial(nuevoClienteRazon)
      setRuc(nuevoClienteRuc)
      setContacto(nuevoClienteContacto)
      setCreandoCliente(false)
    } catch (e) {
      console.error(e)
      toast.error("Error al registrar cliente")
    }
  }

  const handleCrearCaso = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!serie.trim()) {
      toast.error("Ingresa el número de serie del equipo.")
      return
    }
    if (!razonSocial.trim() || !ruc.trim()) {
      toast.error("Completa la información del cliente.")
      return
    }
    if (!descripcionAveria.trim()) {
      toast.error("Describe la avería o motivo de la atención.")
      return
    }

    setGuardando(true)
    try {
      const nuevoCaso = await crearNuevoCaso({
        cliente: {
          razonSocial,
          ruc,
          contacto,
          telefono,
          correo
        },
        equipo: {
          tipoEquipo,
          marca,
          modelo,
          numeroSerie: serie.trim().toUpperCase(),
          partNumber
        },
        origen,
        contratoAlquiler: origen === "ALQUILER" ? contratoAlquiler : undefined,
        responsableApertura: `${operadorNombre} (${operadorCorreo})`,
        incidenciaInicial: {
          descripcion: descripcionAveria,
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
      toast.error(err.message || "Error al aperturar el caso.")
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

      <DialogContent className="sm:max-w-[820px] w-full max-h-[92vh] flex flex-col bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
        {/* Cabecera Fija */}
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

        {/* Formulario y Contenido Desplazable */}
        <form onSubmit={handleCrearCaso} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">

            {/* SECCIÓN 1: Identificación del Activo y N° Serie */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#2369A1]/10 flex items-center justify-center text-[#2369A1]">
                    <Laptop className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. Identificación y Validación del Activo
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Validación de Trazabilidad
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                {/* Input S/N */}
                <div className="sm:col-span-7 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">
                      Número de Serie (S/N) <span className="text-rose-500">*</span>
                    </Label>
                    {serieVerificada && !casoExistente && serie && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Serie Verificada
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej. 5CD2341ABC..."
                      value={serie}
                      onChange={(e) => {
                        setSerie(e.target.value.toUpperCase())
                        setSerieVerificada(false)
                        setCasoExistente(null)
                      }}
                      onBlur={() => handleVerificarSerie()}
                      className="font-mono text-xs uppercase font-bold tracking-wider"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleVerificarSerie()}
                      disabled={verificandoSerie || !serie.trim()}
                      className="text-xs px-3.5 shrink-0 border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      {verificandoSerie ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2369A1]" />
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5 mr-1 text-[#2369A1]" />
                          Validar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Tipo de Equipo */}
                <div className="sm:col-span-5 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Dispositivo</Label>
                  <select
                    value={tipoEquipo}
                    onChange={(e) => setTipoEquipo(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 text-slate-800 focus:outline-none focus:border-[#2369A1]"
                  >
                    <option value="Laptop">Laptop / Portátil</option>
                    <option value="Desktop">Desktop / Computadora</option>
                    <option value="Servidor">Servidor</option>
                    <option value="Impresora">Impresora / Multifuncional</option>
                    <option value="Monitor">Monitor / Pantalla</option>
                    <option value="Otro">Otro Dispositivo</option>
                  </select>
                </div>
              </div>

              {/* Marca, Modelo y Part Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Marca</Label>
                  <Input
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="HP, Lenovo, Dell..."
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Modelo</Label>
                  <Input
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ej. ProBook 450 G9"
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Part Number (P/N)</Label>
                  <Input
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="Opcional"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* ALERTA: Si el equipo ya cuenta con expediente previo o garantía activa */}
              {serieVerificada && casoExistente && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-amber-900">
                        ¡Expediente previo detectado para este activo: {casoExistente.codigoCaso}!
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Estado actual: <strong className="font-semibold">{casoExistente.estado}</strong>
                        {casoExistente.garantia?.activa && (
                          <span className="text-emerald-700 font-bold ml-1.5">
                            • 🛡️ Con Garantía Vigente ({casoExistente.garantia.diasGarantia} días)
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-amber-700 mt-1">
                        Según la regla de trazabilidad única, se recomienda ingresar nuevas incidencias dentro del mismo expediente para conservar el historial técnico.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setOpen(false)
                        router.push(`/casos/${casoExistente.codigoCaso}`)
                      }}
                      className="bg-amber-800 hover:bg-amber-900 text-white text-xs h-7.5 px-3 rounded-lg font-semibold"
                    >
                      Ir al CASO Existente ({casoExistente.codigoCaso})
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <span className="text-[10px] text-amber-700">
                      O puedes continuar abajo si se requiere una atención independiente.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: Cliente Corporativo y Modalidad de Atención */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#2369A1]/10 flex items-center justify-center text-[#2369A1]">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Cliente y Modalidad de Atención
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreandoCliente(!creandoCliente)}
                  className="text-xs font-semibold text-[#2369A1] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {creandoCliente ? "Seleccionar de la lista" : "+ Nuevo Cliente Rápido"}
                </button>
              </div>

              {creandoCliente ? (
                <div className="bg-blue-50/40 border border-blue-200 rounded-lg p-3 space-y-2.5">
                  <p className="text-xs font-bold text-slate-800">Registrar Cliente Nuevo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Razón Social *"
                      value={nuevoClienteRazon}
                      onChange={(e) => setNuevoClienteRazon(e.target.value)}
                      className="text-xs bg-white"
                    />
                    <Input
                      placeholder="RUC (11 dígitos) *"
                      value={nuevoClienteRuc}
                      onChange={(e) => setNuevoClienteRuc(e.target.value)}
                      className="text-xs font-mono bg-white"
                      maxLength={11}
                    />
                    <Input
                      placeholder="Contacto Principal"
                      value={nuevoClienteContacto}
                      onChange={(e) => setNuevoClienteContacto(e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCrearNuevoCliente}
                    className="bg-[#2369A1] text-white text-xs h-7"
                  >
                    Guardar y Usar Cliente
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Seleccionar Cliente Corporativo</Label>
                  <select
                    value={clienteId}
                    onChange={(e) => handleSeleccionarCliente(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 text-slate-800 focus:outline-none focus:border-[#2369A1]"
                  >
                    <option value="">-- Seleccionar de la lista o completar manual --</option>
                    {clientes.map(c => (
                      <option key={c.id || c.ruc} value={c.id || c.ruc}>
                        {c.razonSocial} (RUC: {c.ruc})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Razón Social, RUC y Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Razón Social <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="Nombre o empresa"
                    className="text-xs"
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
                    className="text-xs font-mono"
                    maxLength={11}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Contacto / Solicitante</Label>
                  <Input
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Persona solicitante"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Teléfono y Correo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp</Label>
                  <Input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="9XXXXXXXX"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Correo Electrónico</Label>
                  <Input
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="correo@empresa.com"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Modalidad / Origen de Atención */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-semibold text-slate-700">
                  Modalidad / Origen del Ingreso:
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOrigen("TALLER")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      origen === "TALLER"
                        ? "border-[#2369A1] bg-[#2369A1]/5 ring-1 ring-[#2369A1] text-slate-900 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                      <span className={`w-2 h-2 rounded-full ${origen === "TALLER" ? "bg-[#2369A1]" : "bg-slate-300"}`} />
                      Taller General
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Ingreso estándar para reparación o mantenimiento
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrigen("ALQUILER")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      origen === "ALQUILER"
                        ? "border-[#2369A1] bg-[#2369A1]/5 ring-1 ring-[#2369A1] text-slate-900 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                      <span className={`w-2 h-2 rounded-full ${origen === "ALQUILER" ? "bg-[#2369A1]" : "bg-slate-300"}`} />
                      Alquiler Corporativo
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Equipo bajo contrato de arrendamiento o leasing
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrigen("RECLAMO_GARANTIA")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      origen === "RECLAMO_GARANTIA"
                        ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 text-slate-900 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                      <span className={`w-2 h-2 rounded-full ${origen === "RECLAMO_GARANTIA" ? "bg-emerald-600" : "bg-slate-300"}`} />
                      Reclamo de Garantía
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Retrabajo / falla cubierta por garantía activa
                    </p>
                  </button>
                </div>

                {origen === "ALQUILER" && (
                  <div className="space-y-1 bg-blue-50/40 p-3 rounded-lg border border-blue-200 mt-2">
                    <Label className="text-xs font-semibold text-blue-900">
                      N° Contrato de Alquiler <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="Ej. CTR-ALQ-2026-088"
                      value={contratoAlquiler}
                      onChange={(e) => setContratoAlquiler(e.target.value)}
                      className="text-xs font-mono bg-white"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 3: Incidencia Inicial y Bifurcación de Ruta Técnica */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#2369A1]/10 flex items-center justify-center text-[#2369A1]">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    3. Incidencia Inicial (INC-001) y Triage Técnico
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Ruta Operativa Fase 2
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
                  placeholder="Describe con precisión los síntomas reportados (ej. Equipo no enciende, pantalla parpadea, sobrecalentamiento...)"
                  rows={2}
                  className="w-full text-xs rounded-lg border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:border-[#2369A1] resize-none"
                  required
                />
              </div>

              {/* Prioridad */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nivel de Prioridad</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "BAJA", label: "Baja", desc: "No bloquea", dot: "bg-slate-400" },
                    { id: "MEDIA", label: "Media", desc: "Afecta uso", dot: "bg-blue-500" },
                    { id: "ALTA", label: "Alta", desc: "Inoperativo", dot: "bg-amber-500" },
                    { id: "CRITICA", label: "Crítica", desc: "SLA Urgente", dot: "bg-rose-500" }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPrioridad(p.id as PrioridadIncidencia)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        prioridad === p.id
                          ? "border-[#2369A1] bg-[#2369A1]/5 ring-1 ring-[#2369A1] text-slate-900"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                        {p.label}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* BIFURCACIÓN DE RUTA TÉCNICA (Fase 2) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-semibold text-slate-700">
                  Ruta de Atención Técnica Requerida (Fase 2):
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tarjeta 2A */}
                  <button
                    type="button"
                    onClick={() => setRequiereAnalisisTecnico(false)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      !requiereAnalisisTecnico
                        ? "border-[#2369A1] bg-[#2369A1]/8 ring-1 ring-[#2369A1] text-slate-900 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#2369A1]" />
                        <span className="font-bold text-xs text-slate-900">2A. Soporte Simple</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100/70 text-[#2369A1]">
                        Constancia
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      Limpieza interna, lubricación, reinicio, pruebas rápidas o sustitución temporal.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      • No genera Informe Técnico ni repuestos
                    </p>
                  </button>

                  {/* Tarjeta 2B */}
                  <button
                    type="button"
                    onClick={() => setRequiereAnalisisTecnico(true)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      requiereAnalisisTecnico
                        ? "border-amber-600 bg-amber-50/60 ring-1 ring-amber-600 text-slate-900 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-xs text-slate-900">2B. Diagnóstico (DT)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Informe Técnico
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      Evaluación formal de causa raíz, descarte de componentes y propuesta de repuestos.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      • Requiere aprobación del cliente para pasar a taller
                    </p>
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Footer Fijo */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Operador: <strong className="text-slate-800">{operadorNombre}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={guardando}
                className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 shadow-xs"
              >
                {guardando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Aperturando...
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                    Crear Expediente de Caso
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
