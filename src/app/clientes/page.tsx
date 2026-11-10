"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { 
  Building2, 
  Search, 
  Plus, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  ArrowLeft, 
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Loader2,
  FolderOpen
} from "lucide-react"
import { MurLogo } from "@/components/brand/MurLogo"
import { UserMenu } from "@/components/auth/UserMenu"
import { useAuth } from "@/context/AuthContext"
import { getAllClientes, createCliente, updateCliente, deleteCliente } from "@/services/clienteService"
import { Cliente, ContactoCliente, ServicioContrato } from "@/types"
import { getAllServiciosCliente, etiquetaReferenciaServicio } from "@/services/servicioService"
import { toast } from "sonner"

export default function ClientesPage() {
  const router = useRouter()
  const { esAdmin } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Form State
  const [razonSocial, setRazonSocial] = useState("")
  const [ruc, setRuc] = useState("")
  const [alias, setAlias] = useState("")
  const [contactos, setContactos] = useState<ContactoCliente[]>([{ nombre: "", cargo: "", telefono: "", correo: "", principal: true }])
  const [direccion, setDireccion] = useState("")
  const [servicios, setServicios] = useState<ServicioContrato[]>([])

  const cargarClientes = async () => {
    setLoading(true)
    try {
      const [data, srv] = await Promise.all([getAllClientes(), getAllServiciosCliente()])
      setClientes(data)
      setServicios(srv)
    } catch (err) {
      console.error("Error al cargar clientes:", err)
      toast.error("Error al consultar clientes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  const abrirModalNuevo = () => {
    setClienteEditando(null)
    setRazonSocial("")
    setRuc("")
    setAlias("")
    setContactos([{ nombre: "", cargo: "", telefono: "", correo: "", principal: true }])
    setDireccion("")
    setModalOpen(true)
  }

  const abrirModalEditar = (cli: Cliente) => {
    setClienteEditando(cli)
    setRazonSocial(cli.razonSocial)
    setRuc(cli.ruc)
    setAlias(cli.alias || "")
    setContactos(
      cli.contactos && cli.contactos.length > 0
        ? cli.contactos
        : [{ nombre: cli.contacto || "", cargo: "", telefono: cli.telefono || "", correo: cli.correo || "", principal: true }]
    )
    setDireccion(cli.direccion || "")
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rucLimpio = ruc.trim()
    if (rucLimpio && !/^[0-9]{11}$/.test(rucLimpio)) {
      toast.error("El RUC empresarial debe tener exactamente 11 dígitos numéricos (o déjelo vacío si aún no se tiene).")
      return
    }

    if (!razonSocial.trim()) {
      toast.error("La Razón Social es obligatoria.")
      return
    }

    const contactosLimpios = contactos
      .map((c, i) => ({
        nombre: c.nombre.trim(),
        cargo: c.cargo?.trim() || "",
        telefono: c.telefono?.trim() || "",
        correo: c.correo?.trim() || "",
        principal: i === 0
      }))
      .filter((c) => c.nombre)

    const correoInvalido = contactosLimpios.find((c) => c.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.correo))
    if (correoInvalido) {
      toast.error(`Correo inválido para ${correoInvalido.nombre}.`)
      return
    }

    const principal = contactosLimpios[0]
    const datosContacto = {
      alias: alias.trim(),
      contactos: contactosLimpios,
      contacto: principal?.nombre || "",
      telefono: principal?.telefono || "",
      correo: principal?.correo || ""
    }

    setGuardando(true)
    try {
      if (clienteEditando && clienteEditando.id) {
        await updateCliente(clienteEditando.id, {
          razonSocial: razonSocial.trim(),
          ruc: rucLimpio,
          ...datosContacto,
          direccion: direccion.trim()
        })
        toast.success("Cliente actualizado con éxito.")
      } else {
        await createCliente({
          razonSocial: razonSocial.trim(),
          ruc: rucLimpio,
          ...datosContacto,
          direccion: direccion.trim()
        })
        toast.success("Cliente registrado con éxito en el catálogo.")
      }

      setModalOpen(false)
      cargarClientes()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error al guardar el cliente.")
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (cli: Cliente) => {
    if (!cli.id) return
    if (!confirm(`¿Está seguro de eliminar a "${cli.razonSocial}" del catálogo?`)) return

    try {
      await deleteCliente(cli.id)
      toast.success("Cliente eliminado del catálogo.")
      cargarClientes()
    } catch (err) {
      console.error(err)
      toast.error("No se pudo eliminar el cliente.")
    }
  }

  // Filtrado
  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return true
    return (
      c.razonSocial.toLowerCase().includes(q) ||
      (c.alias && c.alias.toLowerCase().includes(q)) ||
      c.ruc.includes(q) ||
      (c.contacto || "").toLowerCase().includes(q) ||
      (c.contactos || []).some((k) => k.nombre.toLowerCase().includes(q) || (k.cargo || "").toLowerCase().includes(q)) ||
      (c.correo && c.correo.toLowerCase().includes(q)) ||
      servicios.some((s) => s.clienteId === c.id && (s.ordenServicioCliente === q || (s.numeroContrato || "").toLowerCase().includes(q)))
    )
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Barra de Navegación Superior */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.push('/')} 
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <MurLogo size="sm" showSubtitle={false} />
            <nav className="hidden md:flex items-center gap-1 border-l border-slate-200 pl-6">
              <button 
                onClick={() => router.push('/')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#2369A1]" />
                Expedientes Técnicos (Casos)
              </button>
              <button 
                onClick={() => router.push('/clientes')}
                className="px-3 py-1.5 text-xs font-semibold text-[#2369A1] bg-[#2369A1]/8 rounded-md"
              >
                Clientes Corporativos
              </button>
              {esAdmin && (
                <button 
                  onClick={() => router.push('/usuarios')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Gestión de Usuarios
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={cargarClientes}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
              title="Recargar catálogo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2369A1]' : ''}`} />
            </button>

            <Button 
              onClick={abrirModalNuevo}
              className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo Cliente
            </Button>

            <div className="border-l border-slate-200 pl-3">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Título de Sección y Métricas Rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#2369A1]" />
              Catálogo de Clientes Corporativos
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Directorio empresarial homologado para autollenado ágil en órdenes de servicio técnico.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Registrados</span>
                <span className="text-base font-bold text-slate-900">{clientes.length}</span>
              </div>
              <Building2 className="w-5 h-5 text-[#2369A1]" />
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por Razón Social, RUC (11 dígitos), contacto o correo corporativo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Tabla / Lista de Clientes */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#2369A1]" />
              Cargando catálogo de clientes...
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No se encontraron clientes que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Razón Social</th>
                    <th className="py-3 px-4">RUC</th>
                    <th className="py-3 px-4">Contactos y Cargos</th>
                    <th className="py-3 px-4">Servicios Contratados</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {clientesFiltrados.map((cli) => {
                    const srvCli = servicios.filter((s) => s.clienteId === cli.id)
                    const srvActivos = srvCli.filter((s) => s.estado === "ACTIVO")
                    const lista = cli.contactos && cli.contactos.length > 0
                      ? cli.contactos
                      : cli.contacto ? [{ nombre: cli.contacto, cargo: "", telefono: cli.telefono, correo: cli.correo }] : []
                    return (
                    <tr key={cli.id || cli.ruc} className="hover:bg-slate-50/70 transition-colors align-top">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {cli.razonSocial}
                        {cli.alias && <span className="ml-1.5 text-[10px] font-mono text-slate-400">({cli.alias})</span>}
                        {cli.direccion && (
                          <span className="block text-[11px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {cli.direccion}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#2369A1]">
                        {cli.ruc || <span className="text-amber-600 font-sans text-[11px] font-medium">Pendiente</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 space-y-1">
                        {lista.length === 0 && <span className="text-amber-600 text-[11px]">Sin contactos — completar</span>}
                        {lista.map((k, i) => (
                          <div key={i} className="leading-tight">
                            <span className="font-medium">{k.nombre}</span>
                            {k.cargo && <span className="text-slate-500"> · {k.cargo}</span>}
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {[k.telefono, k.correo].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-600 space-y-0.5">
                        {srvCli.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <>
                            <span className="font-semibold text-emerald-700">{srvActivos.length} activo(s)</span>
                            <span className="text-slate-400"> / {srvCli.length} total</span>
                            {srvActivos.map((s) => (
                              <span key={s.id} className="block font-mono text-[10px] text-slate-600">
                                {etiquetaReferenciaServicio(s)} · {s.objeto}
                              </span>
                            ))}
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirModalEditar(cli)}
                            className="p-1.5 text-slate-500 hover:text-[#2369A1] hover:bg-slate-100 rounded-md transition-colors"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminar(cli)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Modal Crear / Editar Cliente */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto bg-white border border-slate-200 text-slate-800 p-0 shadow-2xl rounded-2xl">
          <div className="p-6 pb-4 border-b border-slate-200 bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2369A1]" />
                {clienteEditando ? "Editar Cliente Corporativo" : "Registrar Nuevo Cliente Corporativo"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Los datos registrados estarán disponibles automáticamente en el formulario de ingreso de órdenes técnicas.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="cli-razon" className="text-xs text-slate-700">Razón Social *</Label>
                <Input
                  id="cli-razon"
                  placeholder="Ej. OXXO S.A.C."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cli-ruc" className="text-xs text-slate-700">RUC (11 dígitos)</Label>
                <Input
                  id="cli-ruc"
                  placeholder="Ej. 20602743960 (pendiente si no se tiene)"
                  maxLength={11}
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 bg-white border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <Label htmlFor="cli-alias" className="text-xs text-slate-700">Nombre corto (control de servicios)</Label>
                <Input
                  id="cli-alias"
                  placeholder="Ej. DIRIS LIMA CENTRO"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-700">Contactos y cargos (el primero es el principal)</Label>
                  <button
                    type="button"
                    onClick={() => setContactos([...contactos, { nombre: "", cargo: "", telefono: "", correo: "" }])}
                    className="text-[11px] font-semibold text-[#2369A1] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar contacto
                  </button>
                </div>
                {contactos.map((c, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 p-2 border border-slate-200 rounded-lg bg-slate-50/50 relative">
                    <Input
                      placeholder="Nombre y apellidos"
                      value={c.nombre}
                      onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
                      className="bg-white border-slate-300 text-xs"
                    />
                    <Input
                      placeholder="Cargo (Ej. Jefe de TI)"
                      value={c.cargo || ""}
                      onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, cargo: e.target.value } : x)))}
                      className="bg-white border-slate-300 text-xs"
                    />
                    <Input
                      placeholder="Teléfono / Celular"
                      value={c.telefono || ""}
                      onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, telefono: e.target.value } : x)))}
                      className="bg-white border-slate-300 text-xs"
                    />
                    <div className="flex gap-1">
                      <Input
                        type="email"
                        placeholder="Correo"
                        value={c.correo || ""}
                        onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, correo: e.target.value } : x)))}
                        className="bg-white border-slate-300 text-xs"
                      />
                      {contactos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setContactos(contactos.filter((_, j) => j !== i))}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                          title="Quitar contacto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="cli-dir" className="text-xs text-slate-700">Dirección Fiscal / Sede (Opcional)</Label>
                <Input
                  id="cli-dir"
                  placeholder="Ej. Av. Manuel Olguín 325, Surco"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="text-slate-600 hover:text-slate-900 border-slate-300 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardando}
                className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 py-2"
              >
                {guardando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Guardando...
                  </>
                ) : (
                  clienteEditando ? "Actualizar Cliente" : "Guardar Cliente"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
