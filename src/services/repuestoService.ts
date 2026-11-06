import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RepuestoCatalogo } from '@/types';

// Datos por defecto normalizados alineados al catálogo maestro oficial de HP/MUR
const DEFAULT_REPUESTOS: RepuestoCatalogo[] = [
  {
    id: "M36312-001",
    descripcion: "SPS-TOP COVER W/ KBD CP+PS BL US (Cubierta superior con teclado)",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 12,
    activo: true
  },
  {
    id: "M42237-001",
    descripcion: "SPS-TOUCHPAD 14 (Módulo de touchpad y microswitch)",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 5,
    activo: true
  },
  {
    id: "M36403-601",
    descripcion: "SPS-MB UMA i5-1145 WIN (Placa madre Motherboard)",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 3,
    activo: true
  },
  {
    id: "M36338-001",
    descripcion: "SPS-ANTENNA CABLE KIT (Cable coaxial antena Wi-Fi/BT)",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 7,
    activo: true
  },
  {
    id: "M15626-001",
    descripcion: "SPS-DC IN CONNECTOR (Jack de carga y alimentación)",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 5,
    activo: true
  },
  {
    id: "49Z77UC-KB",
    descripcion: "TECLADO RETROILUMINADO SPANISH LATAM",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 8,
    activo: true
  },
  {
    id: "TP-HP840G8",
    descripcion: "TOUCHPAD SYNAPTICS CLICKPAD MULTITOUCH",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 4,
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
    // 1. Colección oficial según regla de negocio: 'repuestosCatalogo'
    // 2. Compatibilidad histórica con 'repuestos' y 'catalogo_repuestos'
    const colecciones = ['repuestosCatalogo', 'repuestos', 'catalogo_repuestos'];
    
    for (const colName of colecciones) {
      try {
        const ref = collection(db, colName);
        const snapshot = await getDocs(ref);

        if (!snapshot.empty) {
          const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              descripcion: data.descripcion || doc.id,
              marca: data.marca || 'HP',
              modeloCompatible: data.modeloCompatible || 'Universal / EliteBook',
              categoria: data.categoria || 'Hardware',
              stock: typeof data.stock === 'number' ? data.stock : 10,
              activo: data.activo !== false,
              ...data
            } as RepuestoCatalogo;
          });
          return docs.filter(r => r.activo !== false);
        }
      } catch {
        // Continuar con la siguiente colección
      }
    }

    // Si ninguna colección tiene documentos aún, retornar catálogo normalizado base
    return DEFAULT_REPUESTOS;
  } catch (err) {
    console.warn('Advertencia al consultar catálogo de repuestos en Firestore, usando catálogo local:', err);
    return DEFAULT_REPUESTOS;
  }
};

export const crearRepuesto = async (repuesto: RepuestoCatalogo): Promise<void> => {
  // Sincronizar en repuestosCatalogo (oficial) y en repuestos (fallback)
  const docRefOficial = doc(db, 'repuestosCatalogo', repuesto.id);
  await setDoc(docRefOficial, repuesto, { merge: true });
  const docRefFallback = doc(db, 'repuestos', repuesto.id);
  await setDoc(docRefFallback, repuesto, { merge: true });
};
