import { collection, doc, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ModeloEquipo } from '@/types';

const MODELOS_PREDETERMINADOS: ModeloEquipo[] = [
  {
    id: "mod-hp-840g8",
    nombre: "EliteBook 840 G8",
    marca: "HP",
    tipo: "Laptop",
    partNumberSugerido: "49Z77UC#ABM"
  },
  {
    id: "mod-hp-840g7",
    nombre: "EliteBook 840 G7",
    marca: "HP",
    tipo: "Laptop",
    partNumberSugerido: "10S34UT#ABA"
  },
  {
    id: "mod-dell-lat5420",
    nombre: "Latitude 5420",
    marca: "Dell",
    tipo: "Laptop",
    partNumberSugerido: "09V2T"
  },
  {
    id: "mod-lenovo-t14",
    nombre: "ThinkPad T14 Gen 2",
    marca: "Lenovo",
    tipo: "Laptop",
    partNumberSugerido: "20W00049US"
  },
  {
    id: "mod-hp-prodesk400",
    nombre: "ProDesk 400 G7 SFF",
    marca: "HP",
    tipo: "Desktop",
    partNumberSugerido: "24N38EA#ABM"
  },
  {
    id: "mod-dell-r440",
    nombre: "PowerEdge R440",
    marca: "Dell",
    tipo: "Servidor",
    partNumberSugerido: "PE-R440-SVR"
  },
  {
    id: "mod-hp-m428fdw",
    nombre: "LaserJet Pro MFP M428fdw",
    marca: "HP",
    tipo: "Impresora",
    partNumberSugerido: "W1A30A"
  }
];

export const getAllModelos = async (): Promise<ModeloEquipo[]> => {
  try {
    const modelosRef = collection(db, 'modelos_equipos');
    const querySnapshot = await getDocs(modelosRef);

    if (!querySnapshot.empty) {
      const docs = querySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ModeloEquipo));
      return docs.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return MODELOS_PREDETERMINADOS;
  } catch (err) {
    console.warn('Advertencia al consultar modelos en Firestore, usando catálogo base:', err);
    return MODELOS_PREDETERMINADOS;
  }
};

export const createModelo = async (modeloData: Omit<ModeloEquipo, 'id'>): Promise<ModeloEquipo> => {
  try {
    const modelosRef = collection(db, 'modelos_equipos');
    const payload = {
      nombre: modeloData.nombre.trim(),
      marca: modeloData.marca.trim(),
      tipo: modeloData.tipo.trim(),
      partNumberSugerido: modeloData.partNumberSugerido?.trim() || ''
    };
    const docRef = await addDoc(modelosRef, payload);
    return {
      id: docRef.id,
      ...payload
    };
  } catch (err) {
    console.error('Error al registrar modelo en Firestore:', err);
    return {
      id: `local-mod-${Date.now()}`,
      ...modeloData
    };
  }
};

export const deleteModelo = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'modelos_equipos', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error al eliminar modelo:', err);
    throw err;
  }
};
