"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { UsuarioSistema, RolUsuario } from "@/types"
import { syncUsuarioGoogle, DEFAULT_USUARIOS } from "@/services/usuarioService"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  perfil: UsuarioSistema | null
  rol: RolUsuario
  loading: boolean
  isAuthenticated: boolean
  loginConGoogle: (rolInicial?: RolUsuario) => Promise<void>
  loginDemo: (rol: RolUsuario) => void
  logout: () => Promise<void>
  cambiarRol: (nuevoRol: RolUsuario) => void
  esAdmin: boolean
  esTecnico: boolean
  esVentas: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY_DEMO = "servitrack_demo_user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<UsuarioSistema | null>(null)
  const [loading, setLoading] = useState(true)

  // Cargar usuario inicial (Firebase Auth o Sesión activa)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        setUser(firebaseUser)
        try {
          const perfilSync = await syncUsuarioGoogle({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          })
          setPerfil(perfilSync)
          localStorage.removeItem(STORAGE_KEY_DEMO)
        } catch (err) {
          console.error("Error sincronizando perfil de Google:", err)
        }
      } else {
        setUser(null)
        // Revisar si había una sesión demo/manual activa
        try {
          const stored = localStorage.getItem(STORAGE_KEY_DEMO)
          if (stored) {
            const demoUser = JSON.parse(stored) as UsuarioSistema
            setPerfil(demoUser)
          } else {
            setPerfil(null)
          }
        } catch (e) {
          setPerfil(null)
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Protección de rutas: Si no está autenticado y no está en /login, redirigir a /login
  useEffect(() => {
    if (!loading) {
      if (!perfil && pathname !== '/login') {
        router.push('/login')
      }
    }
  }, [loading, perfil, pathname, router])

  // Inicio de sesión con Google (Gmail)
  const loginConGoogle = async (rolInicial: RolUsuario = 'VENTAS') => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })

      const result = await signInWithPopup(auth, provider)
      const firebaseUser = result.user

      if (firebaseUser.email) {
        const perfilSync = await syncUsuarioGoogle({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        }, rolInicial)

        setUser(firebaseUser)
        setPerfil(perfilSync)
        localStorage.removeItem(STORAGE_KEY_DEMO)
        toast.success(`Bienvenido, ${perfilSync.nombreCompleto} (${perfilSync.rol})`)
        router.push("/")
      }
    } catch (err: any) {
      console.error("Error al iniciar sesión con Google:", err)
      if (err.code === 'auth/popup-closed-by-user') {
        toast.info("Inicio de sesión cancelado.")
      } else {
        toast.error(err.message || "Error al autenticar con Google. Verifique su conexión.")
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Inicio de sesión demo (para pruebas rápidas de roles)
  const loginDemo = (rolDeseado: RolUsuario) => {
    let demo: UsuarioSistema
    if (rolDeseado === 'ADMIN') {
      demo = DEFAULT_USUARIOS[0] // beeker147@gmail.com
    } else {
      demo = DEFAULT_USUARIOS.find(u => u.rol === rolDeseado) || {
        id: `demo-${rolDeseado.toLowerCase()}`,
        nombreCompleto: rolDeseado === 'TECNICO' ? 'Kevin Quispe' : 'María Elena Torres',
        correo: rolDeseado === 'TECNICO' ? 'kevin.soporte@murtecnologia.com' : 'ventas@murtecnologia.com',
        rol: rolDeseado,
        cargo: rolDeseado === 'TECNICO' ? 'Técnico de Laboratorio' : 'Asesora Comercial / Ventas',
        activo: true
      }
    }

    setPerfil(demo)
    localStorage.setItem(STORAGE_KEY_DEMO, JSON.stringify(demo))
    toast.success(`Sesión iniciada como: ${demo.nombreCompleto} (${demo.rol})`)
    router.push("/")
  }

  // Cerrar sesión completamente
  const logout = async () => {
    setLoading(true)
    try {
      await firebaseSignOut(auth)
    } catch (e) {
      // Ignorar si no había sesión en Firebase
    }
    setUser(null)
    setPerfil(null)
    localStorage.removeItem(STORAGE_KEY_DEMO)
    setLoading(false)
    toast.info("Sesión cerrada correctamente.")
    router.push('/login')
  }

  // Alternar rol activo (simulación / pruebas de interfaz)
  const cambiarRol = (nuevoRol: RolUsuario) => {
    if (!perfil) return
    const actualizado: UsuarioSistema = {
      ...perfil,
      rol: nuevoRol,
      cargo: nuevoRol === 'ADMIN' ? 'Administrador de Operaciones y TI' : nuevoRol === 'TECNICO' ? 'Técnico de Laboratorio' : 'Asesor Comercial / Ventas'
    }
    setPerfil(actualizado)
    localStorage.setItem(STORAGE_KEY_DEMO, JSON.stringify(actualizado))
    toast.info(`Rol activo cambiado a: ${nuevoRol}`)
  }

  const rolActual = perfil?.rol || 'VENTAS'
  const isAuthenticated = !!perfil

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        rol: rolActual,
        loading,
        isAuthenticated,
        loginConGoogle,
        loginDemo,
        logout,
        cambiarRol,
        esAdmin: rolActual === 'ADMIN',
        esTecnico: rolActual === 'TECNICO',
        esVentas: rolActual === 'VENTAS'
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
