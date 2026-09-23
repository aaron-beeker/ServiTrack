"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  PlusCircle, 
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
      toast.error("Ingrese el número de serie para verificar.")
      return
    }

    setVerificandoSerie(true)
    setOrdenActivaBloqueante(null)

    try {
      const activa = await verificarSerieActiva(valor)
      setSerieChecked(true)
      if (activa) {
        setOrdenActivaBloqueante(activa)
        toast.error(`Bloqueado: El equipo ya tiene la orden activa ${activa.codigoDT} (${activa.estadoGeneral}).`)
      } else {
        setOrdenActivaBloqueante(null)
        toast.success("Nº de Serie válido para apertura de orden en taller.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error al consultar Firestore.")
    } finally {
      setVerificandoSerie(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const serieClean = serie.trim().toUpperCase()
    const rucClean = ruc.trim()

    // 1. Validaciones básicas
    if (!serieClean) {
      toast.error("El número de serie es obligatorio.")
      return
    }

    if (!rucClean || rucClean.length !== 11) {
      toast.error("El RUC debe tener exactamente 11 dígitos numéricos.")
      return
    }

    if (!razonSocial.trim()) {
      toast.error("Ingrese la Razón Social del cliente.")
      return
    }

    if (!contacto.trim()) {
      toast.error("Ingrese la persona de contacto del cliente.")
      return
    }

    if (!modelo.trim()) {
      toast.error("Ingrese el modelo del equipo.")
      return
    }

    if (!fallaReportada.trim()) {
      toast.error("Detalle la falla reportada por el usuario.")
      return
    }

    // 2. Verificación de seguridad de serie activa en taller
    setGuardando(true)
    try {
      const activa = await verificarSerieActiva(serieClean)
      if (activa) {
        setOrdenActivaBloqueante(activa)
        setGuardando(false)
        toast.error(
          `Acción bloqueada: No se puede abrir ticket. La orden ${activa.codigoDT} aún está en estado ${activa.estadoGeneral}.`
        )
        return
      }

      // 3. Crear en Firestore (colección 'ordenes_servicio')
      const codigoGenerado = await crearOrdenServicio({
        cliente: {
          razonSocial,
          ruc: rucClean,
          contacto,
          telefono,
          correo
        },
        equipo: {
          tipoEquipo,
          marca,
          modelo,
          numeroSerie: serieClean,
          partNumber
        },
        fallaReportada,
        registradoPor: registradoPor || 'operador@murtecnologia.com'
      })

      toast.success(`Orden técnica ${codigoGenerado} registrada con éxito (Estado: REGISTRADO)`)
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
          <Button className="bg-[#2369A1] hover:bg-[#1E578A] text-white shadow-lg shadow-[#2369A1]/25 rounded-xl">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Orden DT
          </Button>
        )
      } />

      <DialogContent className="sm:max-w-[760px] max-h-[92vh] flex flex-col bg-[#0B1320] border border-[#2369A1]/30 text-slate-100 p-0 overflow-hidden shadow-2xl">
        
        {/* Cabecera Modal */}
        <div className="p-6 pb-4 border-b border-[#2369A1]/20 bg-[#0F1A2C]/80 backdrop-blur-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="p-2 rounded-lg bg-[#2369A1]/20 text-[#38BDF8] border border-[#2369A1]/40">
                  <Laptop className="w-5 h-5" />
                </span>
                ETAPA 1: Registro de Ingreso Técnico
              </DialogTitle>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#2369A1]/15 text-[#38BDF8] font-semibold border border-[#2369A1]/30">
                Estado Inicial: REGISTRADO
              </span>
            </div>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              MUR Tecnología • Laboratorio Central de Servicio Técnico. Validación de serie en taller.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECCIÓN 1: VALIDACIÓN DE N° DE SERIE */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="serie" className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                1. Validación de Número de Serie (S/N)
              </Label>
              <span className="text-[11px] text-slate-400">Paso obligatorio</span>
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
                className="bg-slate-950 border-slate-700 text-slate-100 font-mono tracking-wider focus-visible:ring-blue-500 uppercase"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleVerificarSerie()}
                disabled={verificandoSerie || !serie.trim()}
                className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
              >
                {verificandoSerie ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
                Comprobar Taller
              </Button>
            </div>

            {/* Alerta de bloqueo por orden activa */}
            {ordenActivaBloqueante && (
              <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 animate-in fade-in-50">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-rose-300">
                    BLOQUEO TÉCNICO: Este equipo ya tiene una orden activa en taller.
                  </p>
                  <p className="text-rose-200/80">
                    Orden: <strong className="text-white">{ordenActivaBloqueante.codigoDT}</strong> | Estado actual: <strong className="text-amber-300">{ordenActivaBloqueante.estadoGeneral}</strong>
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Por flujo operativo, no se permite crear un nuevo ticket hasta que la orden previa esté en estado <strong>ENTREGADO</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      router.push(`/tickets/${ordenActivaBloqueante.codigoDT}`)
                    }}
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline font-medium text-xs mt-1"
                  >
                    Abrir orden activa {ordenActivaBloqueante.codigoDT} <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Confirmación de serie disponible */}
            {serieChecked && !ordenActivaBloqueante && serie.trim() && (
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Nº de Serie libre. No existen órdenes pendientes en taller para este equipo.</span>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: DATOS DEL CLIENTE */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              2. Datos del Cliente
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ruc" className="text-xs text-slate-400">RUC (11 dígitos) *</Label>
                <Input
                  id="ruc"
                  placeholder="Ej. 20602743960"
                  maxLength={11}
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 bg-slate-950 border-slate-700 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="razonSocial" className="text-xs text-slate-400">Razón Social *</Label>
                <Input
                  id="razonSocial"
                  placeholder="Ej. OXXO S.A.C."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="contacto" className="text-xs text-slate-400">Contacto Responsable *</Label>
                <Input
                  id="contacto"
                  placeholder="Ej. Leonidas Cisneros Simbron"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="telefono" className="text-xs text-slate-400">Teléfono / Celular</Label>
                <Input
                  id="telefono"
                  placeholder="Ej. 992011409"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="correo" className="text-xs text-slate-400">Correo Electrónico</Label>
                <Input
                  id="correo"
                  type="email"
                  placeholder="Ej. leonidasc.simbron@oxxo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: DATOS DEL EQUIPO */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-blue-400" />
              3. Datos Técnicos del Dispositivo
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipoEquipo" className="text-xs text-slate-400">Tipo de Dispositivo *</Label>
                <select
                  id="tipoEquipo"
                  value={tipoEquipo}
                  onChange={(e) => setTipoEquipo(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
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
                <Label htmlFor="marca" className="text-xs text-slate-400">Marca *</Label>
                <Input
                  id="marca"
                  placeholder="Ej. HP, Dell, Lenovo"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="modelo" className="text-xs text-slate-400">Modelo *</Label>
                <Input
                  id="modelo"
                  placeholder="Ej. EliteBook 840 G8"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="partNumber" className="text-xs text-slate-400">Part Number (P/N)</Label>
                <Input
                  id="partNumber"
                  placeholder="Ej. 49Z77UC#ABM"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                  className="mt-1 bg-slate-950 border-slate-700 text-sm uppercase font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: FALLA REPORTADA Y AUDITORÍA */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <FileEdit className="w-4 h-4 text-blue-400" />
              4. Falla Reportada por el Usuario
            </Label>

            <div>
              <textarea
                id="fallaReportada"
                rows={3}
                placeholder="Describa con precisión la avería reportada por el cliente..."
                value={fallaReportada}
                onChange={(e) => setFallaReportada(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="registradoPor" className="text-xs text-slate-400">Técnico / Operador que recepciona *</Label>
              <select
                id="registradoPor"
                value={registradoPor}
                onChange={(e) => setRegistradoPor(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
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
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando || !!ordenActivaBloqueante}
              className="bg-[#2369A1] hover:bg-[#1E578A] text-white font-medium px-6 py-2 rounded-xl shadow-lg shadow-[#2369A1]/30 transition-colors"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creando Orden DT...
                </>
              ) : (
                <>
                  Generar Orden Técnica
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>

        </form>

      </DialogContent>
    </Dialog>
  )
}
