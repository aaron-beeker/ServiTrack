import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Equipo, OrdenServicio } from '@/types';

export const getEquipoBySerie = async (numeroSerie: string): Promise<Equipo | null> => {
  const equiposRef = collection(db, 'equipos');
  const q = query(equiposRef, where('numeroSerie', '==', numeroSerie));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Equipo;
};

// Obtiene las órdenes de un equipo ordenadas por fecha
export const getHistorialTicketsEquipo = async (numeroSerie: string): Promise<OrdenServicio[]> => {
  const ref = collection(db, 'ordenes_servicio');
  const snapshot = await getDocs(ref);
  
  const ordenes = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as OrdenServicio))
    .filter(ord => ord.ingreso?.equipo?.numeroSerie?.trim().toUpperCase() === numeroSerie.trim().toUpperCase());
  
  return ordenes.sort((a, b) => {
    const dateA = new Date(a.creadoEl || 0).getTime();
    const dateB = new Date(b.creadoEl || 0).getTime();
    return dateB - dateA;
  });
};
