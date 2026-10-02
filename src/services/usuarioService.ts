import { collection, doc, getDocs, setDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UsuarioSistema } from '@/types';

const DEFAULT_USUARIOS: UsuarioSistema[] = [
  {
    id: "beeker.valdez",
    nombreCompleto: "Beeker Aarón Valdéz Mattos",
    correo: "aarón.valdez@murtecnologia.com",
    rol: "ADMIN",
    cargo: "Practicante Full-Stack / Operaciones",
    activo: true
  },
  {
    id: "kevin.tecnico",
    nombreCompleto: "Kevin Quispe",
    correo: "kevin.soporte@murtecnologia.com",
    rol: "TECNICO",
    cargo: "Técnico de Campo y Taller",
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

export const createUsuarioSistema = async (usuario: Omit<UsuarioSistema, 'id'>): Promise<UsuarioSistema> => {
  try {
    const cleanId = usuario.correo.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || `user-${Date.now()}`;
    const docRef = doc(db, 'usuarios', cleanId);
    const nuevoUsuario: UsuarioSistema = {
      id: cleanId,
      nombreCompleto: usuario.nombreCompleto.trim(),
      correo: usuario.correo.trim(),
      rol: usuario.rol || 'TECNICO',
      cargo: usuario.cargo.trim(),
      activo: usuario.activo ?? true
    };
    await setDoc(docRef, nuevoUsuario);
    return nuevoUsuario;
  } catch (err) {
    console.error('Error al guardar usuario en Firestore:', err);
    return {
      id: `local-${Date.now()}`,
      ...usuario
    };
  }
};
