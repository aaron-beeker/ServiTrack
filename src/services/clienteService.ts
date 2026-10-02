import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cliente } from '@/types';

const CLIENTES_PREDETERMINADOS: Cliente[] = [
  {
    id: "cli-oxxo",
    clienteId: "CLI-001",
    razonSocial: "OXXO S.A.C.",
    ruc: "20602743960",
    contacto: "Leonidas Cisneros Simbron",
    telefono: "992011409",
    correo: "leonidasc.simbron@oxxo.com",
    direccion: "Av. Manuel Olguín 325, Surco, Lima",
    creadoEl: "2026-08-01T10:00:00Z"
  },
  {
    id: "cli-mur",
    clienteId: "CLI-002",
    razonSocial: "MUR Tecnología S.A.C.",
    ruc: "20546372819",
    contacto: "Mesa de Ayuda / Operaciones",
    telefono: "944590999",
    correo: "contacto@mur-tecno.com.pe",
    direccion: "Av. Alfredo Benavides 3082, Of. 503, Miraflores, Lima",
    creadoEl: "2026-08-05T11:00:00Z"
  },
  {
    id: "cli-bcp",
    clienteId: "CLI-003",
    razonSocial: "Banco de Crédito del Perú (BCP)",
    ruc: "20100047218",
    contacto: "Javier Mendoza (Soporte TI)",
    telefono: "013119000",
    correo: "soporte.ti@bcp.com.pe",
    direccion: "Calle Centenario 156, La Molina, Lima",
    creadoEl: "2026-08-10T12:00:00Z"
  },
  {
    id: "cli-alicorp",
    clienteId: "CLI-004",
    razonSocial: "Alicorp S.A.A.",
    ruc: "20100055237",
    contacto: "Mariana Huamán (Infraestructura)",
    telefono: "015950400",
    correo: "it-helpdesk@alicorp.com.pe",
    direccion: "Av. Argentina 4793, Carmen de la Legua, Callao",
    creadoEl: "2026-08-15T09:00:00Z"
  }
];

export const getAllClientes = async (): Promise<Cliente[]> => {
  try {
    const clientesRef = collection(db, 'clientes');
    const querySnapshot = await getDocs(clientesRef);

    if (!querySnapshot.empty) {
      const docs = querySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Cliente));
      return docs.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    }

    // Si la colección está vacía en Firestore, devolver clientes predeterminados
    return CLIENTES_PREDETERMINADOS;
  } catch (err) {
    console.warn('Advertencia al consultar clientes en Firestore, usando catálogo base:', err);
    return CLIENTES_PREDETERMINADOS;
  }
};

export const createCliente = async (clienteData: Omit<Cliente, 'id'>): Promise<Cliente> => {
  try {
    const clientesRef = collection(db, 'clientes');
    const payload = {
      ...clienteData,
      razonSocial: clienteData.razonSocial.trim(),
      ruc: clienteData.ruc.trim(),
      contacto: clienteData.contacto.trim(),
      telefono: clienteData.telefono?.trim() || '',
      correo: clienteData.correo?.trim() || '',
      direccion: clienteData.direccion?.trim() || '',
      creadoEl: new Date().toISOString()
    };
    
    const docRef = await addDoc(clientesRef, payload);
    return {
      id: docRef.id,
      ...payload
    } as Cliente;
  } catch (err) {
    console.error('Error al crear cliente en Firestore:', err);
    // Retorno fallback local para no romper el flujo
    return {
      id: `local-${Date.now()}`,
      ...clienteData,
      creadoEl: new Date().toISOString()
    } as Cliente;
  }
};

export const updateCliente = async (id: string, clienteData: Partial<Cliente>): Promise<void> => {
  try {
    const docRef = doc(db, 'clientes', id);
    await updateDoc(docRef, {
      ...clienteData,
      actualizadoEl: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    throw err;
  }
};

export const deleteCliente = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'clientes', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    throw err;
  }
};
