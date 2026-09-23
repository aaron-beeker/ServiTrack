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
  ExternalLink
} from "lucide-react"
import { verificarSerieActiva, crearOrdenServicio } from "@/services/ordenServicioService"
import { getUsuariosSistema } from "@/services/usuarioService"
import { OrdenServicio, UsuarioSistema } from "@/types"
import { toast } from "sonner"

interface TicketModalProps {
  children?: React.ReactNode
  onSuccess?: (nuevoCodigoDT: string) => void
}

export function TicketModal({ children, onSuccess }: TicketModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [verificandoSerie, setVerificandoSerie] = useState(false)

  // Usuarios del sistema para el operador
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])

  // Estado del formulario - Serie y Validación
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

  // Estado - Falla y Auditoría
  const [fallaReportada, setFallaReportada] = useState("")
  const [registradoPor, setRegistradoPor] = useState("")

  useEffect(() => {
    if (open) {
      getUsuariosSistema().then(users => {
        setUsuarios(users)
        if (users.length > 0 && !registradoPor) {
          setRegistradoPor(users[0].correo)
        }
      }).catch(err => console.error(err))
    }
  }, [open, registradoPor])

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
    setGuardando(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setTimeout(resetForm, 200)
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

    if (!ruc.trim() || ruc.length < 8) {
      toast.error("Ingrese un número de RUC válido.")
      return
    }

    if (!razonSocial.trim()) {
      toast.error("La razón social del cliente es obligatoria.")
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
        registradoPor: registradoPor || "operador@mur-tecno.com.pe"
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

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
        
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
              Registro y validación de número de serie en laboratorio • MUR Tecnología
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* SECCIÓN 1: VALIDACIÓN DE N° DE SERIE */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="serie" className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2369A1]" />
                1. Validación de Número de Serie (S/N)
              </Label>
              <span className="text-[11px] text-slate-500 font-medium">Obligatorio</span>
            </div>

            <div className="flex gap-2">
              <Input
                id="serie"
                placeholder="Ej. 5CG3013CXN"
                value={serie}
                onChange={(e) => {
                  setSerie(e.target.value.toUpperCase())
                  setSerieChecked(false)
                  setOrdenActivaBloqueante(null)
                }}
                onBlur={() => {
                  if (serie.trim().length >= 4 && !serieChecked) {
                    handleVerificarSerie()
                  }
                }}
                className="bg-white border-slate-300 text-slate-900 font-mono text-xs tracking-wider uppercase focus:border-[#2369A1]"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleVerificarSerie()}
                disabled={verificandoSerie || !serie.trim()}
                className="border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs shrink-0"
              >
                {verificandoSerie ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5 mr-1.5" />}
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

          {/* SECCIÓN 2: DATOS DEL CLIENTE */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#2369A1]" />
              2. Datos del Cliente
            </Label>

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
                <Label htmlFor="correo" className="text-xs text-slate-600">Correo Electrónico</Label>
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

          {/* SECCIÓN 3: DATOS DEL EQUIPO */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-[#2369A1]" />
              3. Datos Técnicos del Dispositivo
            </Label>

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
                  placeholder="Ej. 348N2LT#ABM (opcional)"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: FALLA REPORTADA Y AUDITORÍA */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileEdit className="w-4 h-4 text-[#2369A1]" />
              4. Falla Reportada por el Usuario
            </Label>

            <div>
              <textarea
                id="fallaReportada"
                rows={3}
                placeholder="Describa la avería reportada por el cliente..."
                value={fallaReportada}
                onChange={(e) => setFallaReportada(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2369A1]"
                required
              />
            </div>

            <div>
              <Label htmlFor="registradoPor" className="text-xs text-slate-600">Operador / Recepción *</Label>
              <select
                id="registradoPor"
                value={registradoPor}
                onChange={(e) => setRegistradoPor(e.target.value)}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#2369A1]"
              >
                {usuarios.map(u => (
                  <option key={u.id} value={u.correo}>
                    {u.nombreCompleto} ({u.cargo || u.rol})
                  </option>
                ))}
                {usuarios.length === 0 && (
                  <option value="kevin.soporte@murtecnologia.com">Kevin Quispe (Técnico de Taller)</option>
                )}
              </select>
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
