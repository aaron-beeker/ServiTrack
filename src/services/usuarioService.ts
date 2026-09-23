import { collection, getDocs } from 'firebase/firestore';
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
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UsuarioSistema));
    }

    return DEFAULT_USUARIOS;
  } catch (err) {
    console.warn('Advertencia al consultar usuarios en Firestore, usando usuarios base:', err);
    return DEFAULT_USUARIOS;
  }
};
