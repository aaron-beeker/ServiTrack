import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Equipo, Ticket } from '@/types';

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

// Obtiene los tickets de un equipo ordenados por fecha (simulando, o requiriendo índice si usamos orderBy)
export const getHistorialTicketsEquipo = async (numeroSerie: string): Promise<Ticket[]> => {
  const ticketsRef = collection(db, 'tickets');
  const q = query(ticketsRef, where('numeroSerie', '==', numeroSerie));
  const querySnapshot = await getDocs(q);
  
  const tickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
  
  // Ordenar en cliente para no requerir índice compuesto en Firestore inmediatamente
  return tickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};
