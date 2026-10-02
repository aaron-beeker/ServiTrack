"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { UsuarioSistema, RolUsuario } from "@/types"
import { 
  getUsuariosSistema, 
  createUsuarioSistema, 
  actualizarRolUsuario, 
  deleteUsuarioSistema 
} from "@/services/usuarioService"
import { MurLogo } from "@/components/brand/MurLogo"
import { UserMenu } from "@/components/auth/UserMenu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { 
  ShieldCheck, 
  Wrench, 
  Briefcase, 
  UserPlus, 
  Search, 
  RefreshCw, 
  Trash2, 
  ArrowLeft, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Users
} from "lucide-react"
import { toast } from "sonner"

export default function UsuariosPage() {
  const router = useRouter()
  const { rol, esAdmin, perfil, loading: authLoading } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroRol, setFiltroRol] = useState<string>("TODOS")

  // Modal Nuevo Usuario
  const [modalOpen, setModalOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoCorreo, setNuevoCorreo] = useState("")
  const [nuevoCargo, setNuevoCargo] = useState("Técnico de Taller")
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>("TECNICO")

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const data = await getUsuariosSistema()
      setUsuarios(data)
    } catch (err) {
      console.error("Error al cargar usuarios:", err)
      toast.error("Error al obtener la lista de usuarios.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  // Modificar rol en tiempo real (exclusivo Admin)
  const handleCambiarRol = async (usuario: UsuarioSistema, nuevoRolElegido: RolUsuario) => {
    if (usuario.correo.toLowerCase() === 'beeker147@gmail.com' && nuevoRolElegido !== 'ADMIN') {
      toast.warning("El super-administrador 'beeker147@gmail.com' no puede ser degradado de rol.")
      return
    }

    try {
      await actualizarRolUsuario(usuario.id, nuevoRolElegido)
      setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, rol: nuevoRolElegido } : u))
      toast.success(`Rol de "${usuario.nombreCompleto}" actualizado a ${nuevoRolElegido}`)
    } catch (err) {
      console.error(err)
      toast.error("No se pudo actualizar el rol en la base de datos.")
    }
  }

  // Guardar nuevo usuario
  const handleSubmitNuevoUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoNombre.trim() || !nuevoCorreo.trim()) {
      toast.error("Nombre y correo corporativo son obligatorios.")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoCorreo.trim())) {
      toast.error("Ingrese una dirección de correo válida.")
      return
    }

    setGuardando(true)
    try {
      await createUsuarioSistema({
        nombreCompleto: nuevoNombre.trim(),
        correo: nuevoCorreo.trim(),
        cargo: nuevoCargo.trim() || "Personal de Soporte",
        rol: nuevoRol,
        activo: true
      })

      toast.success(`Usuario "${nuevoNombre}" registrado con rol ${nuevoRol}.`)
      setModalOpen(false)
      setNuevoNombre("")
      setNuevoCorreo("")
      setNuevoCargo("Técnico de Taller")
      setNuevoRol("TECNICO")
      cargarUsuarios()
    } catch (err: any) {
      console.error(err)
      toast.error("Error al crear usuario.")
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar usuario
  const handleEliminarUsuario = async (u: UsuarioSistema) => {
    if (u.correo.toLowerCase() === 'beeker147@gmail.com') {
      toast.warning("No se puede eliminar la cuenta principal de administración.")
      return
    }

    if (!confirm(`¿Está seguro de eliminar al usuario "${u.nombreCompleto}" del sistema?`)) return

    try {
      await deleteUsuarioSistema(u.id)
      setUsuarios(prev => prev.filter(item => item.id !== u.id))
      toast.success("Usuario eliminado.")
    } catch (err) {
      toast.error("Error al eliminar usuario.")
    }
  }

  // Si no es admin, mostrar bloqueo con diseño institucional
  if (!authLoading && !esAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="p-1.5 text-slate-500 hover:text-slate-900 border rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <MurLogo size="sm" showSubtitle={false} />
          </div>
          <UserMenu />
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Acceso Exclusivo de Administrador</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              La gestión de usuarios y la asignación de roles operativos está restringida únicamente a la <strong>Jefatura de Operaciones (ADMIN)</strong>.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              Tu rol actual es: <strong className="text-[#2369A1]">{rol}</strong> ({perfil?.nombreCompleto || 'Invitado'}).
            </div>
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
            >
              Volver al Panel de Control
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Conteo de métricas
  const totalUsuarios = usuarios.length
  const totalTecnicos = usuarios.filter(u => u.rol === 'TECNICO').length
  const totalVentas = usuarios.filter(u => u.rol === 'VENTAS').length
  const totalAdmins = usuarios.filter(u => u.rol === 'ADMIN').length

  // Filtrado
  const usuariosFiltrados = usuarios.filter(u => {
    const q = busqueda.toLowerCase().trim()
    const coincideTexto = !q || 
      u.nombreCompleto.toLowerCase().includes(q) ||
      u.correo.toLowerCase().includes(q) ||
      u.cargo.toLowerCase().includes(q)

    if (!coincideTexto) return false
    if (filtroRol !== 'TODOS' && u.rol !== filtroRol) return false
    return true
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
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Panel de Control
              </button>
              <button 
                onClick={() => router.push('/tickets')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Órdenes de Servicio
              </button>
              <button 
                onClick={() => router.push('/clientes')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Clientes Corporativos
              </button>
              <button 
                onClick={() => router.push('/usuarios')}
                className="px-3 py-1.5 text-xs font-semibold text-[#2369A1] bg-[#2369A1]/8 rounded-md"
              >
                Gestión de Usuarios
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={cargarUsuarios}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
              title="Recargar usuarios"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2369A1]' : ''}`} />
            </button>

            <Button 
              onClick={() => setModalOpen(true)}
              className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors"
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Nuevo Usuario
            </Button>

            <div className="border-l border-slate-200 pl-3">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Título de Página y Tarjetas de Métricas de Roles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2369A1]" />
              Gestión de Usuarios y Asignación de Roles
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Panel exclusivo de administración para asignar perfiles de acceso (Técnico, Ventas, Admin) y auditar cuentas.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-xs text-center">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">Admins</span>
              <span className="text-base font-bold text-slate-900">{totalAdmins}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-xs text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Técnicos</span>
              <span className="text-base font-bold text-slate-900">{totalTecnicos}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-xs text-center">
              <span className="text-[10px] font-bold text-[#2369A1] uppercase block">Ventas</span>
              <span className="text-base font-bold text-slate-900">{totalVentas}</span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre, correo corporativo o cargo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {['TODOS', 'ADMIN', 'TECNICO', 'VENTAS'].map((r) => (
              <button
                key={r}
                onClick={() => setFiltroRol(r)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  filtroRol === r
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r === 'TODOS' ? 'Todos' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#2369A1]" />
              Cargando directorio de usuarios...
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No se encontraron usuarios con los criterios indicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Correo Electrónico</th>
                    <th className="py-3 px-4">Cargo / Función</th>
                    <th className="py-3 px-4">Rol en el Sistema (Editable)</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {usuariosFiltrados.map((u) => {
                    const esSuperAdmin = u.correo.toLowerCase() === 'beeker147@gmail.com'

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {u.fotoUrl ? (
                              <img src={u.fotoUrl} alt={u.nombreCompleto} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#2369A1]/10 text-[#2369A1] font-bold text-xs flex items-center justify-center border border-[#2369A1]/20">
                                {u.nombreCompleto.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                                {u.nombreCompleto}
                                {esSuperAdmin && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                    Principal
                                  </span>
                                )}
                              </p>
                              <span className="text-[11px] text-slate-400">ID: {u.id}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {u.correo}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {u.cargo}
                        </td>

                        {/* SELECTOR INTERACTIVO DE ROL DIRECTO EN TABLA */}
                        <td className="py-3.5 px-4">
                          <select
                            value={u.rol}
                            disabled={esSuperAdmin}
                            onChange={(e) => handleCambiarRol(u, e.target.value as RolUsuario)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none transition-all ${
                              u.rol === 'ADMIN'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : u.rol === 'TECNICO'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-blue-50 text-[#2369A1] border-blue-300'
                            }`}
                          >
                            <option value="ADMIN">ADMINISTRADOR</option>
                            <option value="TECNICO">TÉCNICO</option>
                            <option value="VENTAS">VENTAS</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Activo
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {!esSuperAdmin && (
                            <button
                              onClick={() => handleEliminarUsuario(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Modal Registrar Nuevo Usuario */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white border border-slate-200 text-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
          <div className="p-6 pb-4 border-b border-slate-200 bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#2369A1]" />
                Registrar Nuevo Usuario en el Sistema
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Como Administrador, define los datos y el rol de acceso operativo inicial del colaborador.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmitNuevoUsuario} className="p-6 space-y-4 text-xs">
            <div>
              <Label className="text-xs text-slate-700">Nombre Completo *</Label>
              <Input
                placeholder="Ej. Roberto Morales"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="mt-1 bg-white border-slate-300 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs text-slate-700">Correo Electrónico (Gmail o Corporativo) *</Label>
              <Input
                type="email"
                placeholder="roberto.morales@murtecnologia.com"
                value={nuevoCorreo}
                onChange={(e) => setNuevoCorreo(e.target.value)}
                className="mt-1 bg-white border-slate-300 text-xs font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-700">Cargo / Función</Label>
                <Input
                  placeholder="Ej. Técnico de Campo"
                  value={nuevoCargo}
                  onChange={(e) => setNuevoCargo(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-700">Rol Operativo Asignado *</Label>
                <select
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                  className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#2369A1]"
                >
                  <option value="TECNICO">Técnico (Laboratorio)</option>
                  <option value="VENTAS">Ventas (Comercial)</option>
                  <option value="ADMIN">Administrador (Operaciones)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-[#2369A1]">
              Cuando este usuario inicie sesión con su cuenta de Google, se le aplicarán automáticamente los permisos del rol seleccionado.
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="text-xs border-slate-300 text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardando}
                className="bg-[#2369A1] hover:bg-[#1E578A] text-white text-xs font-semibold"
              >
                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Guardar Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
