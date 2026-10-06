import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UsuarioSistema, RolUsuario } from '@/types';

export const DEFAULT_USUARIOS: UsuarioSistema[] = [
  {
    id: "beeker147",
    nombreCompleto: "Beeker Aarón Valdéz Mattos",
    correo: "beeker147@gmail.com",
    rol: "ADMIN",
    cargo: "Administrador de Operaciones y TI",
    activo: true
  },
  {
    id: "beeker.valdez",
    nombreCompleto: "Beeker Aarón Valdéz Mattos",
    correo: "aarón.valdez@murtecnologia.com",
    rol: "ADMIN",
    cargo: "Jefatura de Operaciones",
    activo: true
  },
  {
    id: "kevin.tecnico",
    nombreCompleto: "Kevin Quispe",
    correo: "kevin.soporte@murtecnologia.com",
    rol: "TECNICO",
    cargo: "Técnico de Laboratorio y Taller",
    activo: true
  },
  {
    id: "maria.ventas",
    nombreCompleto: "María Elena Torres",
    correo: "ventas@murtecnologia.com",
    rol: "VENTAS",
    cargo: "Asesora Comercial y Ventas",
    activo: true
  }
];

export const getUsuariosSistema = async (): Promise<UsuarioSistema[]> => {
  try {
    const ref = collection(db, 'usuarios');
    const snapshot = await getDocs(ref);

    if (!snapshot.empty) {
      const docs = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as UsuarioSistema));
      
      // Asegurar que beeker147@gmail.com siempre esté presente si no se ha sincronizado aún
      const existeBeeker = docs.some(u => u.correo.toLowerCase() === 'beeker147@gmail.com');
      if (!existeBeeker) {
        docs.unshift(DEFAULT_USUARIOS[0]);
      }

      return docs;
    }

    return DEFAULT_USUARIOS;
  } catch (err) {
    console.warn('Advertencia al consultar usuarios en Firestore, usando usuarios base:', err);
    return DEFAULT_USUARIOS;
  }
};

export const getUsuarioPorCorreo = async (correo: string): Promise<UsuarioSistema | null> => {
  if (!correo) return null;
  const correoNorm = correo.trim().toLowerCase();

  try {
    const ref = collection(db, 'usuarios');
    const snapshot = await getDocs(ref);

    for (const d of snapshot.docs) {
      const data = d.data() as UsuarioSistema;
      if (data.correo?.trim().toLowerCase() === correoNorm) {
        return { ...data, id: d.id };
      }
    }
  } catch (err) {
    console.warn('Error al buscar usuario por correo en Firestore:', err);
  }

  // Fallback en memoria
  const fallback = DEFAULT_USUARIOS.find(u => u.correo.toLowerCase() === correoNorm);
  return fallback || null;
};

export const createUsuarioSistema = async (usuario: Omit<UsuarioSistema, 'id'>): Promise<UsuarioSistema> => {
  try {
    const cleanId = usuario.correo.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || `user-${Date.now()}`;
    const docRef = doc(db, 'usuarios', cleanId);
    const nuevoUsuario: UsuarioSistema = {
      id: cleanId,
      nombreCompleto: usuario.nombreCompleto.trim(),
      correo: usuario.correo.trim().toLowerCase(),
      rol: usuario.rol || 'TECNICO',
      cargo: usuario.cargo.trim(),
      activo: usuario.activo ?? true,
      fotoUrl: usuario.fotoUrl || '',
      creadoEl: new Date().toISOString()
    };
    await setDoc(docRef, nuevoUsuario);
    return nuevoUsuario;
  } catch (err) {
    console.error('Error al guardar usuario en Firestore:', err);
    return {
      id: `local-${Date.now()}`,
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.correo.toLowerCase(),
      rol: usuario.rol,
      cargo: usuario.cargo,
      activo: usuario.activo ?? true,
      fotoUrl: usuario.fotoUrl || '',
      creadoEl: new Date().toISOString()
    };
  }
};

/**
 * Sincroniza y valida un usuario autenticado vía Google contra el catálogo de Firestore.
 * 
 * POLÍTICA ESTRICTA DE ACCESO:
 * 1. Solo 'beeker147@gmail.com' es el Administrador Principal del sistema.
 * 2. Cualquier otro correo DEBE estar registrado previamente por el Administrador en la gestión de usuarios.
 * 3. Si el correo NO está registrado:
 *    - SE RECHAZA EL ACCESO.
 *    - NO se crea ningún usuario en Firestore.
 *    - NO se le asigna rol ni se le permite ingresar.
 * 4. Si el usuario está registrado pero inactivo (activo === false):
 *    - SE RECHAZA EL ACCESO.
 * 5. Si está registrado y activo:
 *    - Mantiene el rol asignado por el Administrador en Firestore (sin modificaciones arbitrarias).
 */
export const syncUsuarioGoogle = async (
  googleUser: {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
  }
): Promise<UsuarioSistema> => {
  const correo = googleUser.email.trim().toLowerCase();
  const esBeekerAdmin = correo === 'beeker147@gmail.com';
  
  // 1. Buscar si el correo fue previamente registrado por el Administrador
  let usuarioRegistrado = await getUsuarioPorCorreo(correo);

  // 2. Si es el correo oficial del super-admin (beeker147@gmail.com) y aún no existía en Firestore
  if (!usuarioRegistrado && esBeekerAdmin) {
    usuarioRegistrado = await createUsuarioSistema({
      nombreCompleto: googleUser.displayName || 'Beeker Aarón Valdéz Mattos',
      correo: 'beeker147@gmail.com',
      rol: 'ADMIN',
      cargo: 'Administrador de Operaciones y TI',
      activo: true,
      fotoUrl: googleUser.photoURL || ''
    });
  }

  // 3. Si NO está registrado por el administrador: BLOQUEO ESTRICTO
  if (!usuarioRegistrado) {
    throw new Error(
      `Acceso denegado: El correo "${correo}" no está registrado en el sistema. Solicite al Administrador (beeker147@gmail.com) que registre su cuenta y le asigne un rol operativo.`
    );
  }

  // 4. Si el usuario existe pero ha sido desactivado: BLOQUEO
  if (usuarioRegistrado.activo === false) {
    throw new Error(
      `Acceso suspendido: La cuenta vinculada a "${correo}" ha sido desactivada por el Administrador.`
    );
  }

  // 5. Usuario autorizado: mantener el rol oficial asignado por el admin y actualizar foto/nombre
  const rolFinal: RolUsuario = esBeekerAdmin ? 'ADMIN' : usuarioRegistrado.rol;
  const cargoFinal = usuarioRegistrado.cargo || (rolFinal === 'ADMIN' ? 'Administrador' : rolFinal === 'TECNICO' ? 'Técnico de Taller' : 'Asesor Comercial');

  try {
    const docRef = doc(db, 'usuarios', usuarioRegistrado.id);
    await updateDoc(docRef, { 
      fotoUrl: googleUser.photoURL || usuarioRegistrado.fotoUrl || '',
      rol: rolFinal,
      cargo: cargoFinal
    });
  } catch (e) {
    // Si falla actualización secundaria de foto en Firestore, no interrumpir el inicio
  }

  return {
    ...usuarioRegistrado,
    rol: rolFinal,
    cargo: cargoFinal,
    fotoUrl: googleUser.photoURL || usuarioRegistrado.fotoUrl
  };
};

export const actualizarRolUsuario = async (id: string, nuevoRol: RolUsuario): Promise<void> => {
  try {
    const docRef = doc(db, 'usuarios', id);
    await updateDoc(docRef, { rol: nuevoRol });
  } catch (err) {
    console.error('Error al actualizar rol de usuario:', err);
    throw err;
  }
};

export const actualizarUsuarioSistema = async (
  id: string,
  datos: Partial<Omit<UsuarioSistema, 'id'>>
): Promise<void> => {
  try {
    const docRef = doc(db, 'usuarios', id);
    await updateDoc(docRef, datos);
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    throw err;
  }
};

export const deleteUsuarioSistema = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'usuarios', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    throw err;
  }
};

