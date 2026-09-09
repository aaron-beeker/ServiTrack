import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/types';

export const createTicket = async (ticketData: Omit<Ticket, 'id'>) => {
  const ticketsRef = collection(db, 'tickets');
  const docRef = await addDoc(ticketsRef, ticketData);
  return docRef.id;
};
