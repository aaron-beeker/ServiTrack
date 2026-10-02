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
 * Sincroniza un usuario autenticado vía Google con el catálogo de Firestore.
 * Si es beeker147@gmail.com, se le asigna de forma forzada e inequívoca el rol ADMIN.
 */
export const syncUsuarioGoogle = async (
  googleUser: {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
  },
  rolSugerido: RolUsuario = 'VENTAS'
): Promise<UsuarioSistema> => {
  const correo = googleUser.email.trim().toLowerCase();
  const esBeekerAdmin = correo === 'beeker147@gmail.com';
  
  // 1. Verificar si ya existe por correo
  const existente = await getUsuarioPorCorreo(correo);
  if (existente) {
    let rolFinal = esBeekerAdmin ? 'ADMIN' : existente.rol;
    let cargoFinal = esBeekerAdmin ? 'Administrador de Operaciones y TI' : existente.cargo;

    try {
      const docRef = doc(db, 'usuarios', existente.id);
      await updateDoc(docRef, { 
        fotoUrl: googleUser.photoURL || existente.fotoUrl || '',
        rol: rolFinal,
        cargo: cargoFinal
      });
    } catch (e) {
      // Silencioso
    }

    return {
      ...existente,
      rol: rolFinal,
      cargo: cargoFinal,
      fotoUrl: googleUser.photoURL || existente.fotoUrl
    };
  }

  // 2. Si no existe, determinar rol
  let rol: RolUsuario = rolSugerido;
  let cargo = 'Asesor Comercial / Ventas';

  if (esBeekerAdmin || correo.includes('admin') || correo.includes('valdez') || correo.includes('aaron')) {
    rol = 'ADMIN';
    cargo = 'Administrador de Operaciones y TI';
  } else if (correo.includes('soporte') || correo.includes('tecnico') || rolSugerido === 'TECNICO') {
    rol = 'TECNICO';
    cargo = 'Técnico de Laboratorio';
  } else if (rolSugerido === 'VENTAS') {
    rol = 'VENTAS';
    cargo = 'Asesor Comercial y Mesa de Ayuda';
  }

  return await createUsuarioSistema({
    nombreCompleto: googleUser.displayName || (esBeekerAdmin ? 'Beeker Aarón Valdéz Mattos' : correo.split('@')[0]),
    correo,
    rol,
    cargo,
    activo: true,
    fotoUrl: googleUser.photoURL || ''
  });
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

