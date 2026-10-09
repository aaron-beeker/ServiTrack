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
  FolderOpen
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

      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 font-sans">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-[#2369A1]">
            <FolderOpen className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
              Apertura de Expediente Técnico (CASO)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Expediente único con trazabilidad completa de incidencias, diagnósticos, órdenes de trabajo, alquileres y garantías.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCrearCaso} className="space-y-6 pt-3">
          
          {/* PASO 1: Identificación del Activo y N° Serie */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#2369A1]" />
                1. Identificar Activo (Equipo / N° Serie)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Paso 1 del ciclo de vida
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Número de Serie (S/N) <span className="text-rose-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej. 5CD2341ABC"
                    value={serie}
                    onChange={(e) => {
                      setSerie(e.target.value.toUpperCase())
                      setSerieVerificada(false)
                      setCasoExistente(null)
                    }}
                    onBlur={() => handleVerificarSerie()}
                    className="font-mono text-xs uppercase"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleVerificarSerie()}
                    disabled={verificandoSerie || !serie.trim()}
                    className="text-xs px-3 shrink-0 border-slate-300"
                  >
                    {verificandoSerie ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2369A1]" />
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 mr-1 text-[#2369A1]" />
                        Verificar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de Equipo</Label>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Marca</Label>
                <Input
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="HP, Lenovo, Dell..."
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Modelo</Label>
                <Input
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ej. ProBook 450 G9"
                  className="text-xs"
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
              <div className="mt-3 bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-amber-900">
                      ¡Expediente previo detectado para este activo: {casoExistente.codigoCaso}!
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Estado actual: <strong className="font-semibold">{casoExistente.estado}</strong> • 
                      {casoExistente.garantia?.activa ? (
                        <span className="text-emerald-700 font-bold ml-1">
                          🛡️ Garantía Vigente ({casoExistente.garantia.diasGarantia} días)
                        </span>
                      ) : (
                        <span className="ml-1">Expediente activo en taller</span>
                      )}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Según la regla funcional, se debe mantener el expediente único para no perder la trazabilidad de retrabajos o garantías.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                  <Button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      router.push(`/casos/${casoExistente.codigoCaso}`)
                    }}
                    className="bg-amber-800 hover:bg-amber-900 text-white text-xs h-7 px-3 rounded-md font-semibold"
                  >
                    Recuperar CASO Existente ({casoExistente.codigoCaso})
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  <span className="text-[10px] text-amber-700 italic">
                    (Te redirigirá para registrar la nueva incidencia dentro del mismo expediente)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* PASO 2: Cliente y Origen de Atención (Alquiler / Taller / Garantía) */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2369A1]" />
                2. Cliente y Origen de la Atención
              </span>
              <button
                type="button"
                onClick={() => setCreandoCliente(!creandoCliente)}
                className="text-[11px] font-semibold text-[#2369A1] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {creandoCliente ? "Seleccionar Existente" : "+ Nuevo Cliente"}
              </button>
            </div>

            {creandoCliente ? (
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5">
                <p className="text-xs font-bold text-slate-800">Registrar Nuevo Cliente Rápido</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Razón Social *"
                    value={nuevoClienteRazon}
                    onChange={(e) => setNuevoClienteRazon(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="RUC (11 dígitos) *"
                    value={nuevoClienteRuc}
                    onChange={(e) => setNuevoClienteRuc(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <Input
                    placeholder="Contacto Principal"
                    value={nuevoClienteContacto}
                    onChange={(e) => setNuevoClienteContacto(e.target.value)}
                    className="text-xs"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Razón Social</Label>
                <Input
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Razón Social"
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">RUC</Label>
                <Input
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="20XXXXXXXXX"
                  className="text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Contacto / Solicitante</Label>
                <Input
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="Nombre de contacto"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Selección de Origen y Contrato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Origen de la Atención</Label>
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value as OrigenIncidencia)}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 text-slate-800 focus:outline-none focus:border-[#2369A1]"
                >
                  <option value="TALLER">Taller General (Ingreso ordinario)</option>
                  <option value="ALQUILER">Alquiler Corporativo (Bajo contrato)</option>
                  <option value="RECLAMO_GARANTIA">Reclamo de Garantía (Reingreso por falla)</option>
                </select>
              </div>

              {origen === "ALQUILER" && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Label className="text-xs font-semibold text-slate-700">
                    N° Contrato de Alquiler <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ej. CTR-ALQ-2026-088"
                    value={contratoAlquiler}
                    onChange={(e) => setContratoAlquiler(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* PASO 3: Registro de Incidencia Inicial y Bifurcación */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2369A1]" />
                3. Incidencia Inicial (INC-001) y Ruta de Atención
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Prioridad e Impacto
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Falla / Problema Reportado <span className="text-rose-500">*</span>
              </Label>
              <textarea
                value={descripcionAveria}
                onChange={(e) => setDescripcionAveria(e.target.value)}
                placeholder="Describe con precisión los síntomas manifestados por el usuario o cliente..."
                rows={2}
                className="w-full text-xs rounded-md border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:border-[#2369A1] resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nivel de Prioridad</Label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value as PrioridadIncidencia)}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 text-slate-800 focus:outline-none focus:border-[#2369A1]"
                >
                  <option value="BAJA">Baja - No bloquea operaciones</option>
                  <option value="MEDIA">Media - Trabajo normal afectado</option>
                  <option value="ALTA">Alta - Equipo inoperativo</option>
                  <option value="CRITICA">Crítica - SLA contractual urgente</option>
                </select>
              </div>

              {/* BIFURCACIÓN DE FLUJO */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Ruta de Atención Requerida</Label>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setRequiereAnalisisTecnico(false)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      !requiereAnalisisTecnico
                        ? "border-[#2369A1] bg-blue-50/80 text-[#2369A1] font-semibold ring-1 ring-[#2369A1]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-bold text-[11px]">2A. Soporte Simple</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Limpieza, reinicio, config. Emite Constancia.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequiereAnalisisTecnico(true)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      requiereAnalisisTecnico
                        ? "border-[#2369A1] bg-blue-50/80 text-[#2369A1] font-semibold ring-1 ring-[#2369A1]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-bold text-[11px]">2B. Diagnóstico (DT)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Descarte técnico, repuestos e Informe Formal.
                    </p>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Footer del Formulario */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <p className="text-[11px] text-slate-400">
              Registrado por: <strong className="text-slate-600 font-semibold">{operadorNombre}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="text-xs border-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardando}
                className="bg-[#2369A1] hover:bg-[#1B5380] text-white text-xs font-semibold px-4 shadow-xs"
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
