import { collection, doc, getDocs, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UsuarioSistema, RolUsuario } from '@/types';

export const DEFAULT_USUARIOS: UsuarioSistema[] = [
  {
    id: "beeker.valdez",
    nombreCompleto: "Beeker Aarón Valdéz Mattos",
    correo: "aarón.valdez@murtecnologia.com",
    rol: "ADMIN",
    cargo: "Administrador / Operaciones",
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
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as UsuarioSistema));
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
 * Si ya existe, retorna su perfil. Si no, lo registra con el rol inicial asignado.
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
  
  // 1. Verificar si ya existe por correo
  const existente = await getUsuarioPorCorreo(correo);
  if (existente) {
    // Si no tiene foto y Google la provee, actualizarla en background
    if (!existente.fotoUrl && googleUser.photoURL) {
      try {
        const docRef = doc(db, 'usuarios', existente.id);
        await updateDoc(docRef, { fotoUrl: googleUser.photoURL });
      } catch (e) {
        // Silencioso
      }
    }
    return {
      ...existente,
      fotoUrl: googleUser.photoURL || existente.fotoUrl
    };
  }

  // 2. Si no existe, determinar rol por defecto o el sugerido
  let rol: RolUsuario = rolSugerido;
  let cargo = 'Asesor Comercial / Ventas';

  if (correo.includes('admin') || correo.includes('valdez') || correo.includes('aaron')) {
    rol = 'ADMIN';
    cargo = 'Administrador de Operaciones';
  } else if (correo.includes('soporte') || correo.includes('tecnico') || rolSugerido === 'TECNICO') {
    rol = 'TECNICO';
    cargo = 'Técnico de Laboratorio';
  } else if (rolSugerido === 'VENTAS') {
    rol = 'VENTAS';
    cargo = 'Asesor Comercial y Mesa de Ayuda';
  }

  return await createUsuarioSistema({
    nombreCompleto: googleUser.displayName || correo.split('@')[0],
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
