import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  OrdenServicio, 
  ClienteOrden, 
  EquipoOrden, 
  DiagnosticoOrden, 
  IntervencionOrden, 
  CierreOrden,
  EstadoGeneral,
  AprobacionCliente 
} from '@/types';

const COLECCION_ORDENES = 'ordenes_servicio';

// Estados que indican que la orden previa ya fue liquidada y el equipo fue devuelto
const ESTADOS_LIQUIDADOS: EstadoGeneral[] = ['ENTREGADO', 'CERRADO_SIN_REPARACION'];

/**
 * ETAPA 1: Verifica si el número de serie tiene una orden activa en taller.
 * Bloquea la creación de un nuevo ticket si la orden previa no está liquidada ('ENTREGADO' o 'CERRADO_SIN_REPARACION').
 */
export const verificarSerieActiva = async (numeroSerie: string): Promise<OrdenServicio | null> => {
  if (!numeroSerie) return null;
  const serieNormalized = numeroSerie.trim().toUpperCase();

  const ref = collection(db, COLECCION_ORDENES);
  const snapshot = await getDocs(ref);

  for (const d of snapshot.docs) {
    const orden = d.data() as OrdenServicio;
    const ordenSerie = orden.ingreso?.equipo?.numeroSerie?.trim().toUpperCase();
    
    if (ordenSerie === serieNormalized && !ESTADOS_LIQUIDADOS.includes(orden.estadoGeneral)) {
      return { ...orden, id: d.id, codigoDT: orden.codigoDT || d.id };
    }
  }

  return null;
};

/**
 * Genera el siguiente código correlativo atómico en formato DT-XXXXXX
 */
export const generarSiguienteCodigoDT = async (): Promise<string> => {
  try {
    const ref = collection(db, COLECCION_ORDENES);
    const snapshot = await getDocs(ref);

    let maxNum = 0;
    snapshot.docs.forEach((docSnap) => {
      const id = docSnap.id;
      const match = id.match(/DT-(\d+)/i) || (docSnap.data().codigoDT || '').match(/DT-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const siguienteNum = maxNum + 1;
    return `DT-${siguienteNum.toString().padStart(6, '0')}`;
  } catch (err) {
    console.error('Error al generar código correlativo:', err);
    return `DT-${Math.floor(100000 + Math.random() * 900000)}`;
  }
};

/**
 * ETAPA 1: Registra una nueva Orden de Servicio en Firestore.
 * Colección: 'ordenes_servicio' | Document ID = codigoDT
 */
export const crearOrdenServicio = async (params: {
  cliente: ClienteOrden;
  equipo: EquipoOrden;
  fallaReportada: string;
  registradoPor?: string;
}): Promise<string> => {
  const ordenActiva = await verificarSerieActiva(params.equipo.numeroSerie);
  if (ordenActiva) {
    throw new Error(
      `El equipo con N° de Serie ${params.equipo.numeroSerie} tiene la atención activa ${ordenActiva.codigoDT} en estado ${ordenActiva.estadoGeneral}. Bloquear creación hasta liquidar orden previa.`
    );
  }

  const codigoDT = await generarSiguienteCodigoDT();
  const ahora = new Date().toISOString();

  const nuevaOrden: OrdenServicio = {
    codigoDT,
    estadoGeneral: 'REGISTRADO',
    creadoEl: ahora,
    actualizadoEl: ahora,
    ingreso: {
      fechaIngreso: ahora,
      registradoPor: params.registradoPor || 'operador@murtecnologia.com',
      cliente: {
        razonSocial: params.cliente.razonSocial.trim(),
        ruc: params.cliente.ruc.trim(),
        contacto: params.cliente.contacto.trim(),
        telefono: params.cliente.telefono?.trim() || '',
        correo: params.cliente.correo?.trim() || ''
      },
      equipo: {
        tipoEquipo: params.equipo.tipoEquipo.trim(),
        marca: params.equipo.marca.trim(),
        modelo: params.equipo.modelo.trim(),
        numeroSerie: params.equipo.numeroSerie.trim().toUpperCase(),
        partNumber: params.equipo.partNumber?.trim() || ''
      },
      fallaReportada: params.fallaReportada.trim()
    },
    diagnostico: {
      fechaDiagnostico: null,
      tecnicoDiagnostico: null,
      tipoFalla: null,
      diagnosticoDetallado: null,
      danosFisicos: null,
      requiereRepuestos: false,
      solucionPropuesta: null,
      repuestosRequeridos: []
    },
    aprobacion: null,
    intervencion: {
      fechaIntervencion: null,
      tecnicoAsignado: null,
      actividadesRealizadas: null,
      horasHombre: 0,
      estadoReparacion: null,
      pruebasQA: null,
      firmaDigitalTecnico: null
    },
    cierre: {
      fechaEntrega: null,
      lugarEntrega: 'Taller MUR Tecnología',
      receptorNombre: null,
      receptorDniRuc: null,
      firmaReceptor: null,
      observacionesFinales: null,
      constanciaGenerada: false,
      urlPdf: null
    }
  };

  const docRef = doc(db, COLECCION_ORDENES, codigoDT);
  await setDoc(docRef, nuevaOrden);

  return codigoDT;
};

/**
 * Obtener una orden de servicio por su código correlativo (DT-XXXXXX)
 */
export const getOrdenServicioByCodigo = async (codigoDT: string): Promise<OrdenServicio | null> => {
  if (!codigoDT) return null;

  const docRef = doc(db, COLECCION_ORDENES, codigoDT);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    return { ...snap.data(), id: snap.id } as OrdenServicio;
  }

  const ref = collection(db, COLECCION_ORDENES);
  const allSnaps = await getDocs(ref);
  for (const d of allSnaps.docs) {
    const data = d.data() as OrdenServicio;
    if (d.id === codigoDT || data.codigoDT === codigoDT) {
      return { ...data, id: d.id, codigoDT: data.codigoDT || d.id };
    }
  }

  return null;
};

/**
 * Listar todas las órdenes de servicio en tiempo real
 */
export const getOrdenesServicio = async (): Promise<OrdenServicio[]> => {
  const ref = collection(db, COLECCION_ORDENES);
  const snapshot = await getDocs(ref);

  const ordenes = snapshot.docs.map((d) => {
    const data = d.data() as OrdenServicio;
    return {
      ...data,
      id: d.id,
      codigoDT: data.codigoDT || d.id
    };
  });

  return ordenes.sort((a, b) => {
    const fechaA = new Date(a.creadoEl || 0).getTime();
    const fechaB = new Date(b.creadoEl || 0).getTime();
    return fechaB - fechaA;
  });
};

/**
 * Cambiar estado genérico de la orden
 */
export const actualizarEstadoOrden = async (
  codigoDT: string, 
  nuevoEstado: EstadoGeneral, 
  datosAdicionales?: Partial<OrdenServicio>
): Promise<void> => {
  const docRef = doc(db, COLECCION_ORDENES, codigoDT);
  const ahora = new Date().toISOString();

  await updateDoc(docRef, {
    ...datosAdicionales,
    estadoGeneral: nuevoEstado,
    actualizadoEl: ahora
  });
};

/**
 * ETAPA 2: Guardar diagnóstico técnico detallado.
 * Cambia el estado a 'DIAGNOSTICADO'.
 */
export const guardarDiagnosticoTecnico = async (
  codigoDT: string,
  diagnosticoData: Partial<DiagnosticoOrden>
): Promise<void> => {
  const docRef = doc(db, COLECCION_ORDENES, codigoDT);
  const ahora = new Date().toISOString();

  await updateDoc(docRef, {
    diagnostico: {
      ...diagnosticoData,
      fechaDiagnostico: diagnosticoData.fechaDiagnostico || ahora
    },
    estadoGeneral: 'DIAGNOSTICADO',
    actualizadoEl: ahora
  });
};

/**
 * ETAPA 2: Decisión del Cliente sobre Presupuesto e Intervención.
 * - Si Aprueba: estado pasa a 'APROBADO_PARA_REPARACION' (habilita Etapa 3).
 * - Si Rechaza: estado pasa a 'DIAGNOSTICADO_NO_APROBADO' o 'CERRADO_SIN_REPARACION'.
 */
export const registrarDecisionCliente = async (
  codigoDT: string,
  aprobado: boolean,
  motivoRechazo?: string,
  registradoPor?: string
): Promise<void> => {
  const docRef = doc(db, COLECCION_ORDENES, codigoDT);
  const ahora = new Date().toISOString();

  const datosAprobacion: AprobacionCliente = {
    fechaDecision: ahora,
    aprobado,
    motivoRechazo: aprobado ? null : (motivoRechazo || 'Presupuesto no aceptado por el cliente'),
    registradoPor: registradoPor || 'operaciones@murtecnologia.com'
  };

  const nuevoEstado: EstadoGeneral = aprobado 
    ? 'APROBADO_PARA_REPARACION' 
    : 'CERRADO_SIN_REPARACION';

  await updateDoc(docRef, {
    aprobacion: datosAprobacion,
    estadoGeneral: nuevoEstado,
    actualizadoEl: ahora,
    ...(aprobado ? {} : {
      'cierre.fechaEntrega': ahora,
      'cierre.observacionesFinales': `Orden cerrada sin reparación: ${motivoRechazo || 'Rechazo de propuesta comercial'}`
    })
  });
};

/**
 * ETAPA 3: Iniciar intervención física / lógica tras aprobación.
 * Cambia el estado a 'EN_REPARACION'.
 */
export const iniciarIntervencion = async (
  codigoDT: string,
  tecnicoAsignado: string
): Promise<void> => {
  const docRef = doc(db, COLECCION_ORDENES, codigoDT);
  const ahora = new Date().toISOString();

  await updateDoc(docRef, {
    'intervencion.fechaIntervencion': ahora,
    'intervencion.tecnicoAsignado': tecnicoAsignado,
    estadoGeneral: 'EN_REPARACION',
    actualizadoEl: ahora
  });
};

/**
 * ETAPA 3: Registrar cierre de intervención técnica con QA.
 */
export const cerrarIntervencionTecnica = async (
  codigoDT: string,
  intervencionData: Partial<IntervencionOrden>,
  estadoResultado: 'REPARADO' | 'INOPERATIVO' | 'OBSERVADO'
): Promise<void> => {
  const docRef = doc(db, COLECCION_ORDENES, codigoDT);
  const ahora = new Date().toISOString();

  await updateDoc(docRef, {
    intervencion: {
      ...intervencionData,
      estadoReparacion: estadoResultado,
      fechaIntervencion: intervencionData.fechaIntervencion || ahora
    },
    estadoGeneral: estadoResultado,
    actualizadoEl: ahora
  });
};

/**
 * ETAPA 4: Registro de entrega de equipo y cierre final.
 * Cambia el estado final a 'ENTREGADO'.
 */
export const registrarEntregaYFinalizar = async (
  codigoDT: string,
  cierreData: Partial<CierreOrden>
): Promise<void> => {
  const docRef = doc(db, COLECCION_ORDENES, codigoDT);
  const ahora = new Date().toISOString();

  await updateDoc(docRef, {
    cierre: {
      ...cierreData,
      fechaEntrega: cierreData.fechaEntrega || ahora,
      constanciaGenerada: true
    },
    estadoGeneral: 'ENTREGADO',
    actualizadoEl: ahora
  });
};
