import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cliente } from '@/types';

export const getClienteById = async (clienteId: string): Promise<Cliente | null> => {
  const clientesRef = collection(db, 'clientes');
  const q = query(clientesRef, where('clienteId', '==', clienteId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Cliente;
};

export const createCliente = async (clienteData: Omit<Cliente, 'id'>) => {
  const clientesRef = collection(db, 'clientes');
  const docRef = await addDoc(clientesRef, clienteData);
  return docRef.id;
};

export const getAllClientes = async (): Promise<Cliente[]> => {
  const clientesRef = collection(db, 'clientes');
  const querySnapshot = await getDocs(clientesRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
};
