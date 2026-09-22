import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ModeloEquipo } from '@/types';

export const getAllModelos = async (): Promise<ModeloEquipo[]> => {
  const modelosRef = collection(db, 'modelos_equipos');
  const querySnapshot = await getDocs(modelosRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModeloEquipo));
};

export const createModelo = async (modeloData: Omit<ModeloEquipo, 'id'>) => {
  const modelosRef = collection(db, 'modelos_equipos');
  const docRef = await addDoc(modelosRef, modeloData);
  return docRef.id;
};
