"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Search, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Laptop, 
  FileEdit,
  ArrowRight,
  ExternalLink,
  UserCheck,
  X,
  Sparkles
} from "lucide-react"
import { verificarSerieActiva, crearOrdenServicio } from "@/services/ordenServicioService"
import { getAllClientes, createCliente } from "@/services/clienteService"
import { getAllModelos, createModelo } from "@/services/modeloService"
import { Cliente, ModeloEquipo, OrdenServicio } from "@/types"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"

interface TicketModalProps {
  children?: React.ReactNode
  onSuccess?: (nuevoCodigoDT: string) => void
}

export function TicketModal({ children, onSuccess }: TicketModalProps) {
  const router = useRouter()
  const { perfil, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [verificandoSerie, setVerificandoSerie] = useState(false)

  // Datos del operador obtenidos automáticamente de la sesión autenticada
  const nombreOperador = perfil?.nombreCompleto || user?.displayName || "Operador de Recepción"
  const correoOperador = perfil?.correo || user?.email || "recepcion@mur-tecno.com.pe"
  const cargoOperador = perfil?.cargo || (perfil?.rol === "ADMIN" ? "Administrador General" : perfil?.rol === "TECNICO" ? "Técnico de Taller" : "Asesor Comercial")
  const operadorRegistro = perfil?.nombreCompleto ? `${perfil.nombreCompleto} (${correoOperador})` : correoOperador

  // Catálogos Maestros para Autollenado
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [modelos, setModelos] = useState<ModeloEquipo[]>([])

  // Selectores de Plantilla / Autocompletado
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>("")
  const [modeloSeleccionadoId, setModeloSeleccionadoId] = useState<string>("")

  // Estados para Creación Rápida Inline
  const [mostrandoNuevoCliente, setMostrandoNuevoCliente] = useState(false)
  const [guardandoNuevoCliente, setGuardandoNuevoCliente] = useState(false)
  const [nuevoClienteRazon, setNuevoClienteRazon] = useState("")
  const [nuevoClienteRuc, setNuevoClienteRuc] = useState("")
  const [nuevoClienteContacto, setNuevoClienteContacto] = useState("")
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("")
  const [nuevoClienteCorreo, setNuevoClienteCorreo] = useState("")
  const [nuevoClienteDireccion, setNuevoClienteDireccion] = useState("")

  const [mostrandoNuevoModelo, setMostrandoNuevoModelo] = useState(false)
  const [guardandoNuevoModelo, setGuardandoNuevoModelo] = useState(false)
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState("")
  const [nuevoModeloMarca, setNuevoModeloMarca] = useState("HP")
  const [nuevoModeloTipo, setNuevoModeloTipo] = useState("Laptop")
  const [nuevoModeloPartNumber, setNuevoModeloPartNumber] = useState("")

  // Estado del formulario principal - Serie y Validación
  const [serie, setSerie] = useState("")
  const [serieChecked, setSerieChecked] = useState(false)
  const [ordenActivaBloqueante, setOrdenActivaBloqueante] = useState<OrdenServicio | null>(null)

  // Estado - Cliente
  const [ruc, setRuc] = useState("")
  const [razonSocial, setRazonSocial] = useState("")
  const [contacto, setContacto] = useState("")
  const [telefono, setTelefono] = useState("")
  const [correo, setCorreo] = useState("")

  // Estado - Equipo
  const [tipoEquipo, setTipoEquipo] = useState("Laptop")
  const [marca, setMarca] = useState("HP")
  const [modelo, setModelo] = useState("")
  const [partNumber, setPartNumber] = useState("")

  // Estado - Falla
  const [fallaReportada, setFallaReportada] = useState("")

  // Cargar catálogos al abrir el modal
  useEffect(() => {
    if (open) {
      // 1. Clientes
      getAllClientes().then(data => setClientes(data)).catch(err => console.error(err))
      // 2. Modelos
      getAllModelos().then(data => setModelos(data)).catch(err => console.error(err))
    }
  }, [open])

  const resetForm = () => {
    setSerie("")
    setSerieChecked(false)
    setOrdenActivaBloqueante(null)
    setRuc("")
    setRazonSocial("")
    setContacto("")
    setTelefono("")
    setCorreo("")
    setTipoEquipo("Laptop")
    setMarca("HP")
    setModelo("")
    setPartNumber("")
    setFallaReportada("")
    setClienteSeleccionadoId("")
    setModeloSeleccionadoId("")
    setMostrandoNuevoCliente(false)
    setMostrandoNuevoModelo(false)
    setGuardando(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setTimeout(resetForm, 200)
    }
  }

  // Selección automática de Cliente
  const handleSelectCliente = (clienteId: string) => {
    setClienteSeleccionadoId(clienteId)
    if (!clienteId) return
    const cli = clientes.find(c => c.id === clienteId || c.ruc === clienteId)
    if (cli) {
      setRazonSocial(cli.razonSocial)
      setRuc(cli.ruc)
      setContacto(cli.contacto)
      setTelefono(cli.telefono || "")
      setCorreo(cli.correo || "")
      toast.success(`Datos cargados: ${cli.razonSocial}`)
    }
  }

  // Selección automática de Modelo de Equipo
  const handleSelectModelo = (modeloId: string) => {
    setModeloSeleccionadoId(modeloId)
    if (!modeloId) return
    const mod = modelos.find(m => m.id === modeloId)
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

  // Crear y Autoseleccionar Nuevo Cliente
  const handleGuardarNuevoCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    const rucLimpio = nuevoClienteRuc.trim()
    if (!/^[0-9]{11}$/.test(rucLimpio)) {
      toast.error("El RUC empresarial debe tener exactamente 11 dígitos numéricos.")
      return
    }
    if (!nuevoClienteRazon.trim()) {
      toast.error("La Razón Social es requerida.")
      return
    }

    setGuardandoNuevoCliente(true)
    try {
      const nuevo = await createCliente({
        razonSocial: nuevoClienteRazon.trim(),
        ruc: rucLimpio,
        contacto: nuevoClienteContacto.trim() || "Contacto General",
        telefono: nuevoClienteTelefono.trim() || "",
        correo: nuevoClienteCorreo.trim() || "",
        direccion: nuevoClienteDireccion.trim() || ""
      })

      const lista = await getAllClientes()
      setClientes(lista)
      setClienteSeleccionadoId(nuevo.id || nuevo.ruc)
      setRazonSocial(nuevo.razonSocial)
      setRuc(nuevo.ruc)
      setContacto(nuevo.contacto)
      setTelefono(nuevo.telefono || "")
      setCorreo(nuevo.correo || "")

      setMostrandoNuevoCliente(false)
      toast.success(`Cliente "${nuevo.razonSocial}" registrado y seleccionado.`)
    } catch (err: any) {
      console.error(err)
      toast.error("Error al registrar cliente.")
    } finally {
      setGuardandoNuevoCliente(false)
    }
  }

  // Crear y Autoseleccionar Nuevo Modelo
  const handleGuardarNuevoModelo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoModeloNombre.trim() || !nuevoModeloMarca.trim()) {
      toast.error("Marca y Modelo son obligatorios.")
      return
    }

    setGuardandoNuevoModelo(true)
    try {
      const mod = await createModelo({
        nombre: nuevoModeloNombre.trim(),
        marca: nuevoModeloMarca.trim(),
        tipo: nuevoModeloTipo.trim() || "Laptop",
        partNumberSugerido: nuevoModeloPartNumber.trim() || ""
      })

      const lista = await getAllModelos()
      setModelos(lista)
      setModeloSeleccionadoId(mod.id || "")
      setTipoEquipo(mod.tipo)
      setMarca(mod.marca)
      setModelo(mod.nombre)
      if (mod.partNumberSugerido) {
        setPartNumber(mod.partNumberSugerido)
      }

      setMostrandoNuevoModelo(false)
      toast.success(`Modelo "${mod.marca} ${mod.nombre}" registrado y aplicado.`)
    } catch (err) {
      console.error(err)
      toast.error("Error al registrar modelo.")
    } finally {
      setGuardandoNuevoModelo(false)
    }
  }



  // Verificación estricta de la regla de negocio (Etapa 1)
  const handleVerificarSerie = async (serieAProbar?: string) => {
    const valor = (serieAProbar !== undefined ? serieAProbar : serie).trim().toUpperCase()
    if (!valor) {
      toast.warning("Ingrese un número de serie a verificar.")
      return
    }

    setVerificandoSerie(true)
    try {
      const res = await verificarSerieActiva(valor)
      setSerieChecked(true)
      if (res) {
        setOrdenActivaBloqueante(res)
        toast.error(`Bloqueo: El equipo con serie ${valor} ya se encuentra en taller (${res.codigoDT} - ${res.estadoGeneral}).`)
      } else {
        setOrdenActivaBloqueante(null)
        toast.success(`Serie ${valor} disponible para ingreso.`)
      }
    } catch (err) {
      console.error(err)
      toast.error("Error al validar el número de serie.")
    } finally {
      setVerificandoSerie(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!serie.trim()) {
      toast.error("El número de serie es obligatorio.")
      return
    }

    if (!serieChecked) {
      toast.info("Verificando disponibilidad de la serie en el taller...")
      const res = await verificarSerieActiva(serie.trim().toUpperCase())
      setSerieChecked(true)
      if (res) {
        setOrdenActivaBloqueante(res)
        toast.error(`Bloqueo: El equipo con serie ${serie} ya se encuentra en taller (${res.codigoDT}).`)
        return
      }
    }

    if (ordenActivaBloqueante) {
      toast.error("No se puede registrar este equipo mientras mantenga una orden activa en taller.")
      return
    }

    const rucRegex = /^[0-9]{11}$/
    if (!rucRegex.test(ruc.trim())) {
      toast.error("El RUC empresarial debe tener exactamente 11 dígitos numéricos.")
      return
    }

    if (!razonSocial.trim()) {
      toast.error("La razón social del cliente es obligatoria.")
      return
    }

    if (correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      toast.error("El formato del correo corporativo no es válido.")
      return
    }

    if (!marca.trim()) {
      toast.error("La marca del dispositivo es obligatoria.")
      return
    }

    if (!modelo.trim()) {
      toast.error("El modelo del equipo es obligatorio.")
      return
    }

    if (!fallaReportada.trim()) {
      toast.error("Describa la falla reportada por el cliente.")
      return
    }

    setGuardando(true)
    try {
      const nuevoIngreso = {
        cliente: {
          ruc: ruc.trim(),
          razonSocial: razonSocial.trim(),
          contacto: contacto.trim() || "Contacto General",
          telefono: telefono.trim() || "N/A",
          correo: correo.trim() || "cliente@empresa.com"
        },
        equipo: {
          tipoEquipo,
          marca: marca.trim(),
          modelo: modelo.trim(),
          numeroSerie: serie.trim().toUpperCase(),
          partNumber: partNumber.trim() || undefined
        },
        fallaReportada: fallaReportada.trim(),
        registradoPor: operadorRegistro
      }

      const codigoGenerado = await crearOrdenServicio(nuevoIngreso)

      toast.success(`Orden técnica ${codigoGenerado} registrada con éxito`)
      setOpen(false)

      if (onSuccess) {
        onSuccess(codigoGenerado)
      } else {
        router.push(`/tickets/${codigoGenerado}`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error al registrar la orden técnica.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        children ? (
          children as any
        ) : (
          <Button className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors">
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva Orden
          </Button>
        )
      } />

      <DialogContent className="sm:max-w-[760px] max-h-[92vh] flex flex-col bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
        
        {/* Cabecera Modal */}
        <div className="p-6 pb-4 border-b border-slate-200 bg-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-[#2369A1]" />
                Ingreso Técnico de Equipo
              </DialogTitle>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                Estado inicial: REGISTRADO
              </span>
            </div>
            <DialogDescription className="text-slate-500 text-xs mt-1">
              Registro y validación de número de serie en laboratorio • MUR Tecnología S.A.C.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECCIÓN 1: VALIDACIÓN DE N° DE SERIE */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="serie" className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2369A1]" />
                1. Validación de Número de Serie (S/N)
              </Label>
              {serieChecked && !ordenActivaBloqueante && (
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Serie Verificada
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="serie"
                  placeholder="Escanee o ingrese S/N físico (ej. 5CG3013D4X)"
                  value={serie}
                  onChange={(e) => {
                    setSerie(e.target.value.toUpperCase())
                    setSerieChecked(false)
                    setOrdenActivaBloqueante(null)
                  }}
                  className="font-mono uppercase bg-white border-slate-300 text-slate-900 text-xs tracking-wider"
                  required
                />
              </div>
              <Button
                type="button"
                onClick={() => handleVerificarSerie()}
                disabled={verificandoSerie || !serie.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4"
              >
                {verificandoSerie ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <Search className="w-3.5 h-3.5 mr-1" />
                )}
                Comprobar
              </Button>
            </div>

            {/* Alerta de bloqueo por orden activa */}
            {ordenActivaBloqueante && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Equipo con orden activa en taller ({ordenActivaBloqueante.codigoDT})
                </p>
                <p className="text-slate-600 text-[11px]">
                  Estado actual: <strong>{ordenActivaBloqueante.estadoGeneral}</strong>. No se permite crear una nueva orden hasta entregar el equipo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    router.push(`/tickets/${ordenActivaBloqueante.codigoDT}`)
                  }}
                  className="inline-flex items-center gap-1 text-[#2369A1] hover:underline font-semibold text-xs mt-1"
                >
                  Abrir orden {ordenActivaBloqueante.codigoDT} <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Confirmación de serie disponible */}
            {serieChecked && !ordenActivaBloqueante && serie.trim() && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Serie libre. Equipo habilitado para ingreso.</span>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: DATOS DEL CLIENTE CON AUTOLLENADO DESPLEGABLE */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#2369A1]" />
                2. Datos del Cliente
              </Label>
              
              <div className="flex items-center gap-2">
                {/* Desplegable de selección de Cliente */}
                <select
                  value={clienteSeleccionadoId}
                  onChange={(e) => handleSelectCliente(e.target.value)}
                  className="bg-white border border-[#2369A1]/40 hover:border-[#2369A1] text-[#2369A1] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#2369A1] max-w-[210px] truncate"
                >
                  <option value="">— Cargar Cliente Registrado —</option>
                  {clientes.map(c => (
                    <option key={c.id || c.ruc} value={c.id || c.ruc}>
                      {c.razonSocial}
                    </option>
                  ))}
                </select>

                {/* Botón para registrar cliente nuevo si no existe */}
                <button
                  type="button"
                  onClick={() => setMostrandoNuevoCliente(!mostrandoNuevoCliente)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2369A1]/10 hover:bg-[#2369A1]/20 text-[#2369A1] text-xs font-semibold rounded-lg transition-colors border border-[#2369A1]/25"
                  title="Agregar cliente nuevo al catálogo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {mostrandoNuevoCliente ? "Cerrar" : "Nuevo Cliente"}
                </button>
              </div>
            </div>

            {/* Panel Desplegable Inline: Crear Nuevo Cliente */}
            {mostrandoNuevoCliente && (
              <div className="p-3.5 bg-blue-50/70 border border-[#2369A1]/30 rounded-xl space-y-3 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#2369A1] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Registrar Nuevo Cliente en Catálogo
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMostrandoNuevoCliente(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <Label className="text-[11px] text-slate-700">Razón Social *</Label>
                    <Input
                      placeholder="Ej. Alicorp S.A.A."
                      value={nuevoClienteRazon}
                      onChange={(e) => setNuevoClienteRazon(e.target.value)}
                      className="mt-0.5 bg-white border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-700">RUC (11 dígitos) *</Label>
                    <Input
                      placeholder="20100055237"
                      maxLength={11}
                      value={nuevoClienteRuc}
                      onChange={(e) => setNuevoClienteRuc(e.target.value.replace(/\D/g, ""))}
                      className="mt-0.5 bg-white border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-700">Contacto Responsable</Label>
                    <Input
                      placeholder="Ej. Ing. Carlos Pérez"
                      value={nuevoClienteContacto}
                      onChange={(e) => setNuevoClienteContacto(e.target.value)}
                      className="mt-0.5 bg-white border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-700">Teléfono / Celular</Label>
                    <Input
                      placeholder="Ej. 987654321"
                      value={nuevoClienteTelefono}
                      onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                      className="mt-0.5 bg-white border-slate-300 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] text-slate-700">Correo Electrónico</Label>
                    <Input
                      type="email"
                      placeholder="Ej. cperez@empresa.com"
                      value={nuevoClienteCorreo}
                      onChange={(e) => setNuevoClienteCorreo(e.target.value)}
                      className="mt-0.5 bg-white border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setMostrandoNuevoCliente(false)}
                    className="text-xs border-slate-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGuardarNuevoCliente}
                    disabled={guardandoNuevoCliente}
                    className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
                  >
                    {guardandoNuevoCliente ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Guardar y Seleccionar
                  </Button>
                </div>
              </div>
            )}

            {/* Inputs de Cliente vinculados al formulario */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ruc" className="text-xs text-slate-600">RUC (11 dígitos) *</Label>
                <Input
                  id="ruc"
                  placeholder="Ej. 20602743960"
                  maxLength={11}
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 bg-white border-slate-300 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <Label htmlFor="razonSocial" className="text-xs text-slate-600">Razón Social *</Label>
                <Input
                  id="razonSocial"
                  placeholder="Ej. OXXO S.A.C."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="contacto" className="text-xs text-slate-600">Contacto Responsable *</Label>
                <Input
                  id="contacto"
                  placeholder="Ej. Leonidas Cisneros"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="telefono" className="text-xs text-slate-600">Teléfono / Celular</Label>
                <Input
                  id="telefono"
                  placeholder="Ej. 992011409"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="correo" className="text-xs text-slate-600">Correo Electrónico Corporativo</Label>
                <Input
                  id="correo"
                  type="email"
                  placeholder="Ej. contacto@cliente.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: DATOS DEL EQUIPO CON PLANTILLAS HOMOLOGADAS */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-[#2369A1]" />
                3. Datos Técnicos del Dispositivo
              </Label>

              <div className="flex items-center gap-2">
                {/* Desplegable de selección de Modelo Frecuente */}
                <select
                  value={modeloSeleccionadoId}
                  onChange={(e) => handleSelectModelo(e.target.value)}
                  className="bg-white border border-[#2369A1]/40 hover:border-[#2369A1] text-[#2369A1] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#2369A1] max-w-[210px] truncate"
                >
                  <option value="">— Cargar Plantilla de Modelo —</option>
                  {modelos.map(m => (
                    <option key={m.id || m.nombre} value={m.id || m.nombre}>
                      [{m.marca}] {m.nombre} ({m.tipo})
                    </option>
                  ))}
                </select>

                {/* Botón para registrar modelo nuevo si no existe */}
                <button
                  type="button"
                  onClick={() => setMostrandoNuevoModelo(!mostrandoNuevoModelo)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2369A1]/10 hover:bg-[#2369A1]/20 text-[#2369A1] text-xs font-semibold rounded-lg transition-colors border border-[#2369A1]/25"
                  title="Agregar nuevo modelo al catálogo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {mostrandoNuevoModelo ? "Cerrar" : "Nuevo Modelo"}
                </button>
              </div>
            </div>

            {/* Panel Desplegable Inline: Crear Nuevo Modelo */}
            {mostrandoNuevoModelo && (
              <div className="p-3.5 bg-blue-50/70 border border-[#2369A1]/30 rounded-xl space-y-3 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#2369A1] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Registrar Nuevo Modelo en Catálogo
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMostrandoNuevoModelo(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <Label className="text-[11px] text-slate-700">Tipo de Equipo</Label>
                    <select
                      value={nuevoModeloTipo}
                      onChange={(e) => setNuevoModeloTipo(e.target.value)}
                      className="mt-0.5 w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900"
                    >
                      <option value="Laptop">Laptop</option>
                      <option value="Desktop">Desktop</option>
                      <option value="All-in-One">All-in-One</option>
                      <option value="Servidor">Servidor</option>
                      <option value="Impresora">Impresora</option>
                      <option value="Otro">Otro Dispositivo</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-700">Marca *</Label>
                    <Input
                      placeholder="Ej. HP, Dell, Lenovo"
                      value={nuevoModeloMarca}
                      onChange={(e) => setNuevoModeloMarca(e.target.value)}
                      className="mt-0.5 bg-white border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-700">Nombre del Modelo *</Label>
                    <Input
                      placeholder="Ej. Latitude 7420"
                      value={nuevoModeloNombre}
                      onChange={(e) => setNuevoModeloNombre(e.target.value)}
                      className="mt-0.5 bg-white border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-700">Part Number Sugerido</Label>
                    <Input
                      placeholder="Ej. 09V2T#ABM (Opcional)"
                      value={nuevoModeloPartNumber}
                      onChange={(e) => setNuevoModeloPartNumber(e.target.value)}
                      className="mt-0.5 bg-white border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setMostrandoNuevoModelo(false)}
                    className="text-xs border-slate-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGuardarNuevoModelo}
                    disabled={guardandoNuevoModelo}
                    className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
                  >
                    {guardandoNuevoModelo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Guardar Modelo
                  </Button>
                </div>
              </div>
            )}

            {/* Inputs de Equipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tipoEquipo" className="text-xs text-slate-600">Tipo de Dispositivo *</Label>
                <select
                  id="tipoEquipo"
                  value={tipoEquipo}
                  onChange={(e) => setTipoEquipo(e.target.value)}
                  className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#2369A1]"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="All-in-One">All-in-One</option>
                  <option value="Servidor">Servidor</option>
                  <option value="Impresora">Impresora</option>
                  <option value="Otro">Otro Dispositivo</option>
                </select>
              </div>

              <div>
                <Label htmlFor="marca" className="text-xs text-slate-600">Marca *</Label>
                <Input
                  id="marca"
                  placeholder="Ej. HP, Dell, Lenovo"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="modelo" className="text-xs text-slate-600">Modelo *</Label>
                <Input
                  id="modelo"
                  placeholder="Ej. EliteBook 840 G8"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="partNumber" className="text-xs text-slate-600">Part Number (P/N)</Label>
                <Input
                  id="partNumber"
                  placeholder="Ej. 49Z77UC#ABM (opcional)"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: FALLA REPORTADA Y OPERADOR ASIGNADO */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="fallaReportada" className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileEdit className="w-4 h-4 text-[#2369A1]" />
                4. Falla Reportada por el Usuario *
              </Label>
              <span className="text-[10px] text-slate-400 font-mono">
                {fallaReportada.length}/500 caracteres
              </span>
            </div>

            <div>
              <textarea
                id="fallaReportada"
                rows={3}
                maxLength={500}
                placeholder="Describa la avería reportada por el cliente..."
                value={fallaReportada}
                onChange={(e) => setFallaReportada(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2369A1]"
                required
              />
            </div>

            {/* Operador de Recepción (Automático desde la Sesión Activa) */}
            <div>
              <Label className="text-xs text-slate-600 flex items-center justify-between mb-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#2369A1]" />
                  Operador / Recepción Técnica
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sesión activa
                </span>
              </Label>

              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#2369A1]/10 text-[#2369A1] flex items-center justify-center font-bold text-xs shrink-0 border border-[#2369A1]/20">
                  {nombreOperador
                    .split(" ")
                    .filter(Boolean)
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "OP"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {nombreOperador}
                    </p>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#2369A1]/10 text-[#2369A1] border border-[#2369A1]/20">
                      {perfil?.rol || "OPERADOR"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {correoOperador} {cargoOperador ? `• ${cargoOperador}` : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-slate-600 hover:text-slate-900 border-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando || !!ordenActivaBloqueante}
              className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-5 py-2 rounded-lg shadow-xs transition-colors"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Registrando...
                </>
              ) : (
                <>
                  Generar Orden Técnica
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </DialogFooter>

        </form>

      </DialogContent>
    </Dialog>
  )
}
