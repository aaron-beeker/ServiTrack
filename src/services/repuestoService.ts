import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RepuestoCatalogo } from '@/types';

// Datos por defecto alineados a seed_firestore.js por si Firestore aún no ha sido poblado
const DEFAULT_REPUESTOS: RepuestoCatalogo[] = [
  {
    id: "M15626-001",
    descripcion: "SPS-DC IN CONNECTOR",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 5,
    activo: true
  },
  {
    id: "49Z77UC-KB",
    descripcion: "TECLADO RETROILUMINADO SPANISH",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 8,
    activo: true
  },
  {
    id: "TP-HP840G8",
    descripcion: "TOUCHPAD SYNAPTICS CLICKPAD",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 3,
    activo: true
  },
  {
    id: "FAN-HP840G8",
    descripcion: "VENTILADOR DE REFRIGERACIÓN CPU DISIPADOR",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 6,
    activo: true
  }
];

export const getRepuestosCatalogo = async (): Promise<RepuestoCatalogo[]> => {
  try {
    // Intento 1: Colección 'repuestos' (como en seed_firestore.js)
    const ref = collection(db, 'repuestos');
    const snapshot = await getDocs(ref);

    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RepuestoCatalogo));
    }

    // Intento 2: Colección 'catalogo_repuestos' (por compatibilidad de reglas)
    const refSecundaria = collection(db, 'catalogo_repuestos');
    const snapSecundaria = await getDocs(refSecundaria);

    if (!snapSecundaria.empty) {
      return snapSecundaria.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RepuestoCatalogo));
    }

    // Si ambas están vacías, retornamos los repuestos predeterminados
    return DEFAULT_REPUESTOS;
  } catch (err) {
    console.warn('Advertencia al consultar catálogo de repuestos en Firestore, usando catálogo local:', err);
    return DEFAULT_REPUESTOS;
  }
};

export const crearRepuesto = async (repuesto: RepuestoCatalogo): Promise<void> => {
  const docRef = doc(db, 'repuestos', repuesto.id);
  await setDoc(docRef, repuesto, { merge: true });
};
