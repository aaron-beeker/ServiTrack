import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  runTransaction, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Caso,
  EstadoCaso,
  IncidenciaCaso,
  DiagnosticoTecnicoCaso,
  OrdenServicioTrabajo,
  ConstanciaAtencionSimple,
  GarantiaCaso,
  ActividadHistorial,
  ClienteOrden,
  EquipoOrden,
  OrigenIncidencia,
  PrioridadIncidencia,
  TipoOrdenServicio,
  RepuestoItem,
  OrdenServicio,
  DatosIngresoCaso
} from '@/types';

const COLECCION_CASOS = 'casos';
const COLECCION_ORDENES = 'ordenes_servicio';

// Estados terminales donde el caso ya no está activo
const ESTADOS_CERRADOS: EstadoCaso[] = ['CERRADO', 'CERRADO_SIN_REPARACION'];

/**
 * Sanitiza recursivamente cualquier objeto o array eliminando campos `undefined`
 * para cumplir con la restricción estricta de Firestore (no soporta undefined).
 */
export const limpiarUndefined = <T>(obj: T): T => {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => limpiarUndefined(item)) as any;
  }
  const limpio: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      limpio[key] = limpiarUndefined(value);
    }
  }
  return limpio as T;
};

/**
 * Genera el siguiente código correlativo para CASO (CASO-XXXXXX)
 * utilizando una transacción atómica en Firestore.
 */
export const generarSiguienteCodigoCaso = async (): Promise<string> => {
  const contadorRef = doc(db, 'contadores', 'casos');

  try {
    const nuevoCodigo = await runTransaction(db, async (transaction) => {
      const contadorDoc = await transaction.get(contadorRef);
      let siguienteNumero = 1;

      if (contadorDoc.exists()) {
        siguienteNumero = (contadorDoc.data()?.ultimoNumero || 0) + 1;
      } else {
        const snapshot = await getDocs(collection(db, COLECCION_CASOS));
        let maxNum = 0;
        snapshot.docs.forEach((docSnap) => {
          const match = docSnap.id.match(/CASO-(\d+)/i) || (docSnap.data().codigoCaso || '').match(/CASO-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        siguienteNumero = Math.max(maxNum + 1, 1);
      }

      transaction.set(contadorRef, {
        ultimoNumero: siguienteNumero,
        actualizadoEl: new Date().toISOString()
      }, { merge: true });

      return `CASO-${siguienteNumero.toString().padStart(6, '0')}`;
    });

    return nuevoCodigo;
  } catch (err) {
    console.error('Error al generar código correlativo de Caso:', err);
    const snapshot = await getDocs(collection(db, COLECCION_CASOS));
    let maxNum = 0;
    snapshot.docs.forEach((docSnap) => {
      const match = docSnap.id.match(/CASO-(\d+)/i) || (docSnap.data().codigoCaso || '').match(/CASO-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const siguienteNum = maxNum + 1;
    return `CASO-${siguienteNum.toString().padStart(6, '0')}`;
  }
};

/**
 * PASO 1 (Diagrama): Identificar activo por N° de Serie y Cliente.
 * Verifica si existe un Caso Abierto o con Garantía Activa para este equipo.
 * Retorna el Caso existente para mantener el expediente único.
 */
export const verificarExpedienteActivoEquipo = async (numeroSerie: string): Promise<Caso | null> => {
  if (!numeroSerie) return null;
  const serieNorm = numeroSerie.trim().toUpperCase();

  const ref = collection(db, COLECCION_CASOS);
  const snapshot = await getDocs(ref);

  for (const d of snapshot.docs) {
    const caso = d.data() as Caso;
    const casoSerie = caso.equipo?.numeroSerie?.trim().toUpperCase();

    if (casoSerie === serieNorm) {
      // 1. Caso actualmente abierto en proceso
      if (!ESTADOS_CERRADOS.includes(caso.estado)) {
        return { ...caso, id: d.id, codigoCaso: caso.codigoCaso || d.id };
      }
      // 2. O caso con garantía activa vigente
      if (caso.garantia?.activa) {
        if (caso.garantia.fechaVencimientoGarantia) {
          const vence = new Date(caso.garantia.fechaVencimientoGarantia).getTime();
          if (Date.now() <= vence) {
            return { ...caso, id: d.id, codigoCaso: caso.codigoCaso || d.id };
          }
        } else {
          return { ...caso, id: d.id, codigoCaso: caso.codigoCaso || d.id };
        }
      }
    }
  }

  return null;
};

/**
 * PASO 1 y 2: Aperturar NUEVO CASO (CASO-XXXXXX)
 * Inicializa el expediente con su primera incidencia (INC-001) y trazabilidad completa.
 */
export const crearNuevoCaso = async (params: {
  cliente: ClienteOrden;
  equipo: EquipoOrden;
  origen: OrigenIncidencia;
  contratoAlquiler?: string;
  responsableApertura: string;
  incidenciaInicial: {
    descripcion: string;
    prioridad: PrioridadIncidencia;
    reportadoPor: string;
    requiereAnalisisTecnico: boolean; // true: va a 2B (DT formal), false: va a 2A (Atención Simple)
  };
}): Promise<Caso> => {
  const codigoCaso = await generarSiguienteCodigoCaso();
  const ahora = new Date().toISOString();

  const incId = 'INC-001';
  const incidencia: IncidenciaCaso = {
    id: incId,
    codigoINC: incId,
    fecha: ahora,
    reportadoPor: params.incidenciaInicial.reportadoPor || params.cliente.contacto,
    descripcion: params.incidenciaInicial.descripcion.trim(),
    prioridad: params.incidenciaInicial.prioridad || 'MEDIA',
    origen: params.origen,
    esReingresoGarantia: params.origen === 'RECLAMO_GARANTIA',
    aplicaGarantia: params.origen === 'RECLAMO_GARANTIA',
    requiereAnalisisTecnico: params.incidenciaInicial.requiereAnalisisTecnico,
    estado: 'REGISTRADA',
    creadoEl: ahora
  };

  const estadoInicial: EstadoCaso = params.incidenciaInicial.requiereAnalisisTecnico 
    ? 'EN_DIAGNOSTICO' 
    : 'ABIERTO';

  const historialInicial: ActividadHistorial[] = [
    {
      id: `ACT-${Date.now()}-1`,
      fecha: ahora,
      autor: params.responsableApertura,
      tipo: 'APERTURA',
      titulo: 'Apertura de Expediente',
      detalle: `Apertura de caso para ${params.equipo.marca} ${params.equipo.modelo} (S/N: ${params.equipo.numeroSerie}) - Cliente: ${params.cliente.razonSocial}${params.contratoAlquiler ? ` [Contrato: ${params.contratoAlquiler}]` : ''}`
    },
    {
      id: `ACT-${Date.now()}-2`,
      fecha: ahora,
      autor: params.responsableApertura,
      tipo: 'INCIDENCIA',
      titulo: `Registro de Incidencia ${incId}`,
      detalle: `${incidencia.descripcion} (Prioridad: ${incidencia.prioridad}, Origen: ${incidencia.origen})${incidencia.requiereAnalisisTecnico ? ' -> Requiere evaluación técnica formal' : ' -> Atención simple sin diagnóstico'}`,
      referenciaId: incId
    }
  ];

  const nuevoCaso: Caso = {
    id: codigoCaso,
    codigoCaso,
    estado: estadoInicial,
    origen: params.origen,
    cliente: {
      razonSocial: params.cliente.razonSocial.trim(),
      ruc: params.cliente.ruc.trim(),
      contacto: params.cliente.contacto.trim(),
      telefono: params.cliente.telefono?.trim() || '',
      correo: params.cliente.correo?.trim() || ''
    },
    contratoAlquiler: params.contratoAlquiler?.trim() || '',
    equipo: {
      tipoEquipo: params.equipo.tipoEquipo.trim(),
      marca: params.equipo.marca.trim(),
      modelo: params.equipo.modelo.trim(),
      numeroSerie: params.equipo.numeroSerie.trim().toUpperCase(),
      partNumber: params.equipo.partNumber?.trim() || ''
    },
    responsableApertura: params.responsableApertura,
    fechaApertura: ahora,
    fechaCierre: null,
    incidencias: [incidencia],
    diagnosticos: [],
    ordenesServicio: [],
    constancias: [],
    garantia: {
      aplicaGarantia: false,
      diasGarantia: 0,
      activa: false,
      reingresosContador: params.origen === 'RECLAMO_GARANTIA' ? 1 : 0
    },
    historial: historialInicial,
    liquidacionFinal: null,
    creadoEl: ahora,
    actualizadoEl: ahora
  };

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await setDoc(docRef, limpiarUndefined(nuevoCaso));

  // Subcolección estricta: casos/{codigoCaso}/incidencias/{incId}
  try {
    const incSubRef = doc(db, `${COLECCION_CASOS}/${codigoCaso}/incidencias`, incId);
    await setDoc(incSubRef, limpiarUndefined(incidencia));
  } catch (err) {
    console.warn('Error al guardar subcolección incidencia:', err);
  }

  return nuevoCaso;
};

/**
 * ETAPA 0 Y 1 (Diagrama de Flujo Oficial):
 * Verifica si el N° de Serie tiene un expediente abierto o con garantía activa:
 * - Si existe: Recupera el CASO existente y registra una nueva INC (marcando garantía si aplica).
 * - Si no existe: Crea un NUEVO CASO (CASO-XXXXXX) y su primera incidencia (INC-001).
 */
export const procesarIngresoEquipo = async (datos: DatosIngresoCaso) => {
  const casoExistente = await verificarExpedienteActivoEquipo(datos.activo.numeroSerie);

  if (casoExistente) {
    const enPlazoGarantia = Boolean(casoExistente.garantia?.activa) || 
      datos.incidenciaInicial.origen === 'RECLAMO_GARANTIA' || 
      datos.incidenciaInicial.origen === 'Reclamo de Garantía';

    const nuevaInc = await registrarNuevaIncidencia(casoExistente.codigoCaso, {
      descripcion: datos.incidenciaInicial.averiaReportada,
      prioridad: datos.incidenciaInicial.prioridad,
      reportadoPor: datos.cliente.contacto || datos.cliente.razonSocial,
      origen: enPlazoGarantia ? 'RECLAMO_GARANTIA' : datos.incidenciaInicial.origen,
      requiereAnalisisTecnico: datos.incidenciaInicial.requiereAnalisisTecnico,
      esReingresoGarantia: enPlazoGarantia,
      autor: datos.responsableApertura || 'Mesa de Recepción'
    });

    return {
      modo: 'CASO_RECUPERADO' as const,
      idCaso: casoExistente.codigoCaso,
      codigoIncidencia: nuevaInc.codigoINC,
      enPlazoGarantia
    };
  }

  const nuevoCaso = await crearNuevoCaso({
    cliente: {
      razonSocial: datos.cliente.razonSocial,
      ruc: datos.cliente.ruc,
      contacto: datos.cliente.contacto,
      telefono: datos.cliente.telefono || '',
      correo: datos.cliente.correo || ''
    },
    equipo: {
      tipoEquipo: datos.activo.tipoEquipo || datos.activo.equipo || 'Laptop',
      marca: datos.activo.marca,
      modelo: datos.activo.modelo,
      numeroSerie: datos.activo.numeroSerie.trim().toUpperCase(),
      partNumber: datos.activo.partNumber || ''
    },
    origen: datos.incidenciaInicial.origen,
    contratoAlquiler: datos.contratoAlquiler.aplicaContrato ? (datos.contratoAlquiler.idContrato || undefined) : undefined,
    responsableApertura: datos.responsableApertura || 'Mesa de Recepción',
    incidenciaInicial: {
      descripcion: datos.incidenciaInicial.averiaReportada,
      prioridad: datos.incidenciaInicial.prioridad,
      reportadoPor: datos.cliente.contacto || datos.cliente.razonSocial,
      requiereAnalisisTecnico: datos.incidenciaInicial.requiereAnalisisTecnico
    }
  });

  return {
    modo: 'NUEVO_CASO' as const,
    idCaso: nuevoCaso.codigoCaso,
    codigoIncidencia: 'INC-001',
    enPlazoGarantia: false
  };
};

/**
 * Obtener un Caso por su código (CASO-XXXXXX)
 */
export const getCasoByCodigo = async (codigoCaso: string): Promise<Caso | null> => {
  if (!codigoCaso) return null;

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    return { ...snap.data(), id: snap.id } as Caso;
  }

  // Búsqueda por colección completa
  const ref = collection(db, COLECCION_CASOS);
  const allSnaps = await getDocs(ref);
  for (const d of allSnaps.docs) {
    const data = d.data() as Caso;
    if (d.id === codigoCaso || data.codigoCaso === codigoCaso) {
      return { ...data, id: d.id, codigoCaso: data.codigoCaso || d.id };
    }
    // Búsqueda por código de Diagnóstico DT asociado
    if (data.diagnosticos?.some(dt => dt.codigoDT === codigoCaso)) {
      return { ...data, id: d.id, codigoCaso: data.codigoCaso || d.id };
    }
    // Búsqueda por código de Orden de Servicio OS asociada
    if (data.ordenesServicio?.some(os => os.codigoOS === codigoCaso)) {
      return { ...data, id: d.id, codigoCaso: data.codigoCaso || d.id };
    }
  }

  return null;
};

/**
 * Listar todos los Casos
 */
export const getCasos = async (): Promise<Caso[]> => {
  const ref = collection(db, COLECCION_CASOS);
  const snapshot = await getDocs(ref);

  const casos = snapshot.docs.map((d) => {
    const data = d.data() as Caso;
    return {
      ...data,
      id: d.id,
      codigoCaso: data.codigoCaso || d.id
    };
  });

  return casos.sort((a, b) => {
    const fechaA = new Date(a.actualizadoEl || a.creadoEl || 0).getTime();
    const fechaB = new Date(b.actualizadoEl || b.creadoEl || 0).getTime();
    return fechaB - fechaA;
  });
};

/**
 * Suscripción reactiva en tiempo real a la colección de Casos
 */
export const suscribirCasos = (callback: (casos: Caso[]) => void): (() => void) => {
  try {
    const ref = collection(db, COLECCION_CASOS);
    return onSnapshot(ref, (snapshot) => {
      const casos = snapshot.docs.map((d) => {
        const data = d.data() as Caso;
        return {
          ...data,
          id: d.id,
          codigoCaso: data.codigoCaso || d.id
        };
      });

      casos.sort((a, b) => {
        const fechaA = new Date(a.actualizadoEl || a.creadoEl || 0).getTime();
        const fechaB = new Date(b.actualizadoEl || b.creadoEl || 0).getTime();
        return fechaB - fechaA;
      });

      callback(casos);
    }, (err) => {
      console.error('Error en suscripción en tiempo real de Casos:', err);
    });
  } catch (err) {
    console.error('Error al iniciar onSnapshot de Casos:', err);
    return () => {};
  }
};

/**
 * Suscripción reactiva en tiempo real a un Caso individual
 */
export const suscribirCaso = (codigoCaso: string, callback: (caso: Caso | null) => void): (() => void) => {
  try {
    const docRef = doc(db, COLECCION_CASOS, codigoCaso);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ ...docSnap.data(), id: docSnap.id } as Caso);
      } else {
        callback(null);
      }
    }, (err) => {
      console.error('Error en suscripción de Caso individual:', err);
    });
  } catch (err) {
    console.error('Error al iniciar suscripción de Caso:', err);
    return () => {};
  }
};

/**
 * PASO 1 (Diagrama): Registrar Incidencia Adicional (INC-XXX) dentro del mismo Caso.
 * Permite registrar nuevas incidencias durante el alquiler, o por reingreso en garantía.
 */
export const registrarNuevaIncidencia = async (
  codigoCaso: string,
  params: {
    descripcion: string;
    prioridad: PrioridadIncidencia;
    reportadoPor: string;
    origen: OrigenIncidencia;
    requiereAnalisisTecnico: boolean;
    esReingresoGarantia?: boolean;
    autor: string;
  }
): Promise<IncidenciaCaso> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();
  const siguienteIndice = (caso.incidencias?.length || 0) + 1;
  const incId = `INC-${siguienteIndice.toString().padStart(3, '0')}`;

  const esGarantia = params.esReingresoGarantia || caso.garantia?.activa || params.origen === 'RECLAMO_GARANTIA';

  const nuevaInc: IncidenciaCaso = {
    id: incId,
    codigoINC: incId,
    fecha: ahora,
    reportadoPor: params.reportadoPor,
    descripcion: params.descripcion.trim(),
    prioridad: params.prioridad,
    origen: params.origen,
    esReingresoGarantia: esGarantia,
    aplicaGarantia: esGarantia,
    requiereAnalisisTecnico: params.requiereAnalisisTecnico,
    estado: 'REGISTRADA',
    creadoEl: ahora
  };

  const nuevoEstado: EstadoCaso = params.requiereAnalisisTecnico 
    ? 'EN_DIAGNOSTICO' 
    : 'ABIERTO';

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.autor,
    tipo: esGarantia ? 'REINGRESO_GARANTIA' : 'INCIDENCIA',
    titulo: `Nueva Incidencia ${incId}${esGarantia ? ' [REINGRESO EN GARANTÍA]' : ''}`,
    detalle: `${nuevaInc.descripcion} (Prioridad: ${nuevaInc.prioridad}, Origen: ${nuevaInc.origen})`,
    referenciaId: incId
  };

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await updateDoc(docRef, limpiarUndefined({
    incidencias: [...(caso.incidencias || []), nuevaInc],
    historial: [nuevaActividad, ...(caso.historial || [])],
    estado: nuevoEstado,
    'garantia.reingresosContador': esGarantia ? (caso.garantia.reingresosContador || 0) + 1 : (caso.garantia?.reingresosContador || 0),
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso}/incidencias
  try {
    const incSubRef = doc(db, `${COLECCION_CASOS}/${codigoCaso}/incidencias`, nuevaInc.id);
    await setDoc(incSubRef, limpiarUndefined(nuevaInc));
  } catch (err) {
    console.warn('Subcolección incidencias:', err);
  }

  return nuevaInc;
};

/**
 * PASO 2A (Diagrama): ATENCIÓN SIMPLE (SIN DIAGNÓSTICO FORMAL)
 * Técnico ejecuta soporte menor (limpieza, config, reinicio, sustitución temporal).
 * Genera Constancia de Atención sin generar Informe Técnico ni repuestos.
 */
export const registrarAtencionSimple = async (
  codigoCaso: string,
  params: {
    incidenciaId?: string;
    motivoSoporte?: string;
    actividadesRealizadas: string;
    resultado: string;
    ticketItop?: string;
    tecnicoResponsable: string;
    firmaReceptor?: string;
  }
): Promise<ConstanciaAtencionSimple> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();
  const siguienteIndice = (caso.constancias?.length || 0) + 1;
  const constId = `CONST-${siguienteIndice.toString().padStart(3, '0')}`;

  const idIncidenciaAsociada = params.incidenciaId || caso.incidencias?.find(i => i.estado !== 'RESUELTA')?.id || null;

  const motivoFinal = params.motivoSoporte?.trim()
    || caso.incidencias?.find(i => i.id === idIncidenciaAsociada)?.descripcion
    || caso.incidencias?.[caso.incidencias.length - 1]?.descripcion
    || caso.incidencias?.[0]?.descripcion
    || 'Soporte menor / mantenimiento preventivo';

  const nuevaConstancia: ConstanciaAtencionSimple = {
    id: constId,
    codigoConstancia: constId,
    fecha: ahora,
    tecnicoResponsable: params.tecnicoResponsable,
    motivoSoporte: motivoFinal,
    actividadesRealizadas: params.actividadesRealizadas.trim(),
    resultado: params.resultado.trim(),
    ticketItop: params.ticketItop?.trim() || null,
    firmaReceptor: params.firmaReceptor || null,
    creadoEl: ahora,
    ...(idIncidenciaAsociada ? { incidenciaId: idIncidenciaAsociada } : {})
  };

  // Marcar incidencia como resuelta si aplica
  const incidenciasActualizadas = (caso.incidencias || []).map((inc) => {
    if (!idIncidenciaAsociada || inc.id === idIncidenciaAsociada) {
      return { ...inc, estado: 'RESUELTA' as const };
    }
    return inc;
  });

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.tecnicoResponsable,
    tipo: 'ATENCION_SIMPLE',
    titulo: `Constancia de Atención ${constId}`,
    detalle: `Soporte menor: ${motivoFinal}. Resultado: ${params.resultado}${params.ticketItop ? ` • Ticket iTop: ${params.ticketItop}` : ''}. No requiere informe técnico.`,
    referenciaId: constId
  };

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await updateDoc(docRef, limpiarUndefined({
    constancias: [...(caso.constancias || []), nuevaConstancia],
    incidencias: incidenciasActualizadas,
    historial: [nuevaActividad, ...(caso.historial || [])],
    estado: 'REPARADO',
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso}/constancias
  try {
    const constSubRef = doc(db, `${COLECCION_CASOS}/${codigoCaso}/constancias`, nuevaConstancia.id);
    await setDoc(constSubRef, limpiarUndefined(nuevaConstancia));
  } catch (err) {
    console.warn('Subcolección constancias:', err);
  }

  return nuevaConstancia;
};

/**
 * PASO 2B (Diagrama): EVALUACIÓN Y DIAGNÓSTICO TÉCNICO (DT)
 * Actualiza estado del Caso a 'EN DIAGNÓSTICO', genera DT-XXX formal.
 */
export const registrarDiagnosticoTecnico = async (
  codigoCaso: string,
  params: {
    incidenciaId?: string;
    tecnicoResponsable: string;
    tipoFalla: 'HARDWARE' | 'SOFTWARE' | 'OPERATIVO';
    hallazgos: string; // Causa raíz
    diagnosticoDetallado: string;
    danosFisicos?: string;
    requiereRepuestos: boolean;
    repuestosRequeridos: RepuestoItem[];
    recomendaciones?: string;
    solucionPropuesta?: string;
  }
): Promise<DiagnosticoTecnicoCaso> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();
  const siguienteIndice = (caso.diagnosticos?.length || 0) + 1;
  const dtId = `DT-${siguienteIndice.toString().padStart(3, '0')}`;

  const idIncidenciaAsociada = params.incidenciaId || caso.incidencias?.find(i => i.estado !== 'RESUELTA')?.id || null;

  const nuevoDT: DiagnosticoTecnicoCaso = {
    id: dtId,
    codigoDT: dtId,
    fecha: ahora,
    tecnicoResponsable: params.tecnicoResponsable,
    tipoFalla: params.tipoFalla,
    hallazgos: params.hallazgos.trim(),
    diagnosticoDetallado: params.diagnosticoDetallado.trim(),
    danosFisicos: params.danosFisicos?.trim() || '',
    requiereRepuestos: params.requiereRepuestos,
    repuestosRequeridos: params.repuestosRequeridos || [],
    recomendaciones: params.recomendaciones?.trim() || '',
    solucionPropuesta: params.solucionPropuesta?.trim() || '',
    estado: 'CONCLUIDO',
    aprobacionCliente: null,
    informePdfUrl: null,
    creadoEl: ahora,
    ...(idIncidenciaAsociada ? { incidenciaId: idIncidenciaAsociada } : {})
  };

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.tecnicoResponsable,
    tipo: 'DIAGNOSTICO',
    titulo: `Diagnóstico Técnico ${dtId} Concluido`,
    detalle: `Causa raíz: ${params.hallazgos}. Dictamen: ${params.diagnosticoDetallado}. Repuestos: ${params.requiereRepuestos ? params.repuestosRequeridos.length : 'Ninguno'}.`,
    referenciaId: dtId
  };

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await updateDoc(docRef, limpiarUndefined({
    diagnosticos: [...(caso.diagnosticos || []), nuevoDT],
    estado: 'EN_DIAGNOSTICO',
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso}/diagnosticos
  try {
    const dtSubRef = doc(db, `${COLECCION_CASOS}/${codigoCaso}/diagnosticos`, nuevoDT.id);
    await setDoc(dtSubRef, limpiarUndefined(nuevoDT));
  } catch (err) {
    console.warn('Subcolección diagnosticos:', err);
  }

  return nuevoDT;
};

/**
 * PASO 2B (Decisión) & Transición a FASE 3:
 * Cliente o jefatura aprueba o rechaza la propuesta técnica del Diagnóstico (DT).
 * - Si Rechaza: Estado pasa a 'CERRADO_SIN_REPARACION' -> Fin.
 * - Si Aprueba: Puede generar inmediatamente la Orden de Servicio (OS)
 *   (autogenerada o digitada manualmente con el código oficial proveniente de otra área/ERP).
 *   Si se genera la OS, el estado pasa directamente a 'EN_REPARACION'.
 */
export const registrarDecisionPropuestaTecnica = async (
  codigoCaso: string,
  diagnosticoId: string,
  aprobado: boolean,
  motivoRechazo?: string,
  registradoPor?: string,
  generarOSInmediata?: {
    codigoOSManual?: string;
    tipo: TipoOrdenServicio;
    tecnicoAsignado: string;
    actividades: string;
    horasHombreEstimadas?: number;
  }
): Promise<OrdenServicioTrabajo | null> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();

  const diagnosticosActualizados = (caso.diagnosticos || []).map((dt) => {
    if (dt.id === diagnosticoId || dt.codigoDT === diagnosticoId) {
      return {
        ...dt,
        estado: (aprobado ? 'APROBADO' : 'RECHAZADO') as any,
        aprobacionCliente: {
          fechaDecision: ahora,
          aprobado,
          motivoRechazo: aprobado ? null : (motivoRechazo || 'Presupuesto o propuesta no aprobada'),
          registradoPor: registradoPor || 'operaciones@murtecnologia.com'
        }
      };
    }
    return dt;
  });

  let nuevaOS: OrdenServicioTrabajo | null = null;
  let ordenesActualizadas = caso.ordenesServicio || [];

  if (aprobado && generarOSInmediata) {
    const siguienteIndice = ordenesActualizadas.length + 1;
    const osId = generarOSInmediata.codigoOSManual?.trim() 
      ? generarOSInmediata.codigoOSManual.trim().toUpperCase() 
      : `OS-${siguienteIndice.toString().padStart(3, '0')}`;

    if (ordenesActualizadas.some(o => o.codigoOS === osId)) {
      throw new Error(`Ya existe una Orden de Servicio con el código ${osId} en este expediente.`);
    }

    nuevaOS = {
      id: osId,
      codigoOS: osId,
      diagnosticoId,
      tipo: generarOSInmediata.tipo || 'CORRECTIVA',
      tecnicoAsignado: generarOSInmediata.tecnicoAsignado,
      actividades: generarOSInmediata.actividades.trim(),
      horasHombre: generarOSInmediata.horasHombreEstimadas || 1,
      estado: 'EN_EJECUCION',
      fechaInicio: ahora,
      pruebasQA: null,
      creadoEl: ahora
    };
    ordenesActualizadas = [...ordenesActualizadas, nuevaOS];
  }

  const nuevoEstadoCaso: EstadoCaso = !aprobado 
    ? 'CERRADO_SIN_REPARACION' 
    : nuevaOS 
      ? 'EN_REPARACION' 
      : 'PENDIENTE_DE_APROBACION';

  const actividadesHistorial: ActividadHistorial[] = [
    {
      id: `ACT-${Date.now()}-1`,
      fecha: ahora,
      autor: registradoPor || 'Cliente',
      tipo: aprobado ? 'APROBACION' : 'RECHAZO',
      titulo: aprobado ? `Propuesta Técnica ${diagnosticoId} Aprobada` : `Propuesta Técnica ${diagnosticoId} Rechazada`,
      detalle: aprobado 
        ? `Cliente/jefatura autoriza intervención técnica. ${nuevaOS ? `Se apertura automáticamente la Orden de Servicio ${nuevaOS.codigoOS}.` : 'Habilitada para generar OS.'}` 
        : `Rechazo registrado: ${motivoRechazo || 'Sin detalle'}. Emitir devolución con Informe Técnico.`,
      referenciaId: diagnosticoId
    }
  ];

  if (nuevaOS) {
    actividadesHistorial.push({
      id: `ACT-${Date.now()}-2`,
      fecha: ahora,
      autor: registradoPor || 'Cliente',
      tipo: 'ORDEN_SERVICIO',
      titulo: `Apertura de Orden de Servicio ${nuevaOS.codigoOS} (${nuevaOS.tipo})`,
      detalle: `Trabajo asignado a: ${nuevaOS.tecnicoAsignado}. Actividades: ${nuevaOS.actividades}. Estado pasa a En Reparación.`,
      referenciaId: nuevaOS.codigoOS
    });
  }

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await updateDoc(docRef, limpiarUndefined({
    diagnosticos: diagnosticosActualizados,
    ordenesServicio: ordenesActualizadas,
    estado: nuevoEstadoCaso,
    fechaCierre: aprobado ? null : ahora,
    historial: [...actividadesHistorial, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección de OS si se generó inmediatamente
  if (nuevaOS) {
    try {
      const osSubRef = doc(db, `${COLECCION_CASOS}/${codigoCaso}/ordenes_servicio`, (nuevaOS as any).id);
      await setDoc(osSubRef, limpiarUndefined(nuevaOS));
    } catch (err) {
      console.warn('Subcolección ordenes_servicio:', err);
    }
  }

  return nuevaOS;
};

/**
 * PASO 3 (Diagrama): EJECUCIÓN DE TRABAJO (ORDEN DE SERVICIO - OS)
 * Generar Orden de Servicio (OS-XXX): Correctiva, Preventiva, Garantía, etc.
 * Admite:
 * - Autogeneración de código OS (ej. OS-001)
 * - Digitación manual de código OS externo (ej. OS-2026-8910 de SAP, ERP u otra área).
 * Actualiza estado del Caso a 'EN_REPARACION'.
 */
export const generarOrdenServicioTrabajo = async (
  codigoCaso: string,
  params: {
    codigoOSManual?: string; // Si viene digitado desde otra área / ERP
    diagnosticoId?: string;
    incidenciaId?: string;
    tipo: TipoOrdenServicio;
    tecnicoAsignado: string;
    actividades: string;
    horasHombreEstimadas?: number;
    autor: string;
  }
): Promise<OrdenServicioTrabajo> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();
  const siguienteIndice = (caso.ordenesServicio?.length || 0) + 1;
  const osId = params.codigoOSManual?.trim() 
    ? params.codigoOSManual.trim().toUpperCase() 
    : `OS-${siguienteIndice.toString().padStart(3, '0')}`;

  if (caso.ordenesServicio?.some(o => o.codigoOS === osId)) {
    throw new Error(`Ya existe una Orden de Servicio con el código ${osId} en este expediente.`);
  }

  const nuevaOS: OrdenServicioTrabajo = {
    id: osId,
    codigoOS: osId,
    tipo: params.tipo,
    tecnicoAsignado: params.tecnicoAsignado,
    actividades: params.actividades.trim(),
    horasHombre: params.horasHombreEstimadas || 1,
    estado: 'EN_EJECUCION',
    fechaInicio: ahora,
    pruebasQA: null,
    creadoEl: ahora,
    ...(params.incidenciaId ? { incidenciaId: params.incidenciaId } : {}),
    ...(params.diagnosticoId ? { diagnosticoId: params.diagnosticoId } : {})
  };

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.autor,
    tipo: 'ORDEN_SERVICIO',
    titulo: `Apertura de Orden de Servicio ${osId} (${params.tipo})`,
    detalle: `Asignado a: ${params.tecnicoAsignado}. Actividades: ${params.actividades}. Estado pasa a En Reparación.`,
    referenciaId: osId
  };

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await updateDoc(docRef, limpiarUndefined({
    ordenesServicio: [...(caso.ordenesServicio || []), nuevaOS],
    estado: 'EN_REPARACION',
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso}/ordenes_servicio
  try {
    const osSubRef = doc(db, `${COLECCION_CASOS}/${codigoCaso}/ordenes_servicio`, nuevaOS.id);
    await setDoc(osSubRef, limpiarUndefined(nuevaOS));
  } catch (err) {
    console.warn('Subcolección ordenes_servicio:', err);
  }

  return nuevaOS;
};

/**
 * PASO 3 (QA): Registrar pruebas de calidad y operatividad (QA) y finalizar OS.
 * Actualiza estado a 'EN_PRUEBAS' o finaliza la OS.
 */
export const registrarPruebasQAyFinalizarOS = async (
  codigoCaso: string,
  osId: string,
  params: {
    superoQA: boolean;
    observacionesQA: string;
    horasHombreReales?: number;
    firmaDigitalTecnico?: string;
    tecnico: string;
  }
): Promise<void> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();

  const ordenesActualizadas = (caso.ordenesServicio || []).map((os) => {
    if (os.id === osId || os.codigoOS === osId) {
      return {
        ...os,
        horasHombre: params.horasHombreReales !== undefined ? params.horasHombreReales : os.horasHombre,
        estado: (params.superoQA ? 'FINALIZADA' : 'EN_PRUEBAS') as any,
        fechaFin: ahora,
        pruebasQA: {
          superoQA: params.superoQA,
          observacionesQA: params.observacionesQA || 'Pruebas operativas concluidas satisfactoriamente.',
          fechaPruebas: ahora,
          tecnicoQA: params.tecnico
        },
        firmaDigitalTecnico: params.firmaDigitalTecnico || null
      };
    }
    return os;
  });

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.tecnico,
    tipo: 'ORDEN_SERVICIO',
    titulo: `Control de Calidad (QA) para ${osId}`,
    detalle: params.superoQA 
      ? `Pruebas QA superadas con éxito. ${params.observacionesQA}. OS Finalizada.` 
      : `Observaciones en QA: ${params.observacionesQA}. Requiere ajustes.`,
    referenciaId: osId
  };

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await updateDoc(docRef, limpiarUndefined({
    ordenesServicio: ordenesActualizadas,
    estado: params.superoQA ? 'REPARADO' : 'EN_PRUEBAS',
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso}/ordenes_servicio
  try {
    const osSubRef = doc(db, `${COLECCION_CASOS}/${codigoCaso}/ordenes_servicio`, osId);
    await updateDoc(osSubRef, limpiarUndefined({
      horasHombre: params.horasHombreReales !== undefined ? params.horasHombreReales : 1,
      estado: (params.superoQA ? 'FINALIZADA' : 'EN_PRUEBAS') as any,
      fechaFin: ahora,
      pruebasQA: {
        superoQA: params.superoQA,
        observacionesQA: params.observacionesQA || 'Pruebas operativas concluidas satisfactoriamente.',
        fechaPruebas: ahora,
        tecnicoQA: params.tecnico
      },
      firmaDigitalTecnico: params.firmaDigitalTecnico || null
    }));
  } catch (err) {
    console.warn('Subcolección ordenes_servicio QA:', err);
  }
};

/**
 * PASO 4 (Diagrama): ENTREGA, GARANTÍA Y CIERRE
 * Coordinar entrega, activar garantía si aplica, o pasar a cierre.
 */
export const registrarEntregaYActivarGarantia = async (
  codigoCaso: string,
  params: {
    fechaEntrega?: string;
    receptorNombre: string;
    receptorDniRuc: string;
    aplicaGarantia: boolean;
    diasGarantia?: number; // e.g. 30, 60, 90 días
    observaciones: string;
    responsableEntrega: string;
  }
): Promise<void> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = params.fechaEntrega || new Date().toISOString();
  const dias = params.diasGarantia || 30;

  // Cálculo de vencimiento de garantía
  let fechaVence: string | null = null;
  if (params.aplicaGarantia) {
    const vDate = new Date(ahora);
    vDate.setDate(vDate.getDate() + dias);
    fechaVence = vDate.toISOString();
  }

  const nuevaGarantia: GarantiaCaso = {
    aplicaGarantia: params.aplicaGarantia,
    diasGarantia: dias,
    activa: params.aplicaGarantia,
    reingresosContador: caso.garantia?.reingresosContador || 0,
    ...(params.aplicaGarantia ? { fechaInicioGarantia: ahora } : {}),
    ...(fechaVence ? { fechaVencimientoGarantia: fechaVence } : {})
  };

  const nuevoEstado: EstadoCaso = params.aplicaGarantia ? 'EN_GARANTIA' : 'ENTREGADO';

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.responsableEntrega,
    tipo: params.aplicaGarantia ? 'GARANTIA_ACTIVADA' : 'ENTREGA',
    titulo: params.aplicaGarantia 
      ? `Equipo Entregado - Plazo de Garantía Activado (${dias} días)` 
      : 'Equipo Entregado al Cliente',
    detalle: `Receptor: ${params.receptorNombre} (DNI/RUC: ${params.receptorDniRuc}). ${params.observaciones}${fechaVence ? `. Garantía vigente hasta ${new Date(fechaVence).toLocaleDateString('es-PE')}` : ''}`
  };

  const nuevaEntrega = {
    fechaEntrega: ahora,
    receptorNombre: params.receptorNombre.trim(),
    receptorDniRuc: params.receptorDniRuc?.trim() || '',
    observaciones: params.observaciones?.trim() || '',
    responsableEntrega: params.responsableEntrega
  };

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await updateDoc(docRef, limpiarUndefined({
    estado: nuevoEstado,
    entrega: nuevaEntrega,
    garantia: nuevaGarantia,
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));
};

/**
 * PASO 4 (Liquidación y Cierre definitivo):
 * Firma liquidación técnica final y actualiza estado final a CERRADO.
 */
export const firmarLiquidacionYCerrarCaso = async (
  codigoCaso: string,
  params: {
    firmadoPor: string;
    observaciones: string;
  }
): Promise<void> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.firmadoPor,
    tipo: 'CIERRE',
    titulo: 'Cierre Definitivo de Expediente',
    detalle: `Liquidación técnica final aprobada. Expediente cerrado por ${params.firmadoPor}. ${params.observaciones}`
  };

  const docRef = doc(db, COLECCION_CASOS, codigoCaso);
  await updateDoc(docRef, limpiarUndefined({
    estado: 'CERRADO',
    fechaCierre: ahora,
    'garantia.activa': false,
    liquidacionFinal: {
      fechaLiquidacion: ahora,
      observaciones: params.observaciones.trim(),
      firmadoPor: params.firmadoPor
    },
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));
};

/**
 * MIGRACIÓN / SEEDER TRANSPARENTE:
 * Sincroniza órdenes existentes en 'ordenes_servicio' hacia 'casos' si aún no tienen expediente,
 * garantizando que el usuario conserve el 100% de su información histórica sin vacíos.
 */
export const sincronizarOrdenesExistentesACasos = async (): Promise<number> => {
  try {
    const ordenesSnap = await getDocs(collection(db, COLECCION_ORDENES));
    const casosSnap = await getDocs(collection(db, COLECCION_CASOS));

    const seriesConCaso = new Set(
      casosSnap.docs.map(d => (d.data().equipo?.numeroSerie || '').trim().toUpperCase())
    );

    let migrados = 0;

    for (const d of ordenesSnap.docs) {
      const ord = d.data() as OrdenServicio;
      const serie = (ord.ingreso?.equipo?.numeroSerie || '').trim().toUpperCase();

      if (!serie || seriesConCaso.has(serie)) continue;

      const codigoCaso = `CASO-${(casosSnap.docs.length + migrados + 1).toString().padStart(6, '0')}`;
      const ahora = ord.actualizadoEl || ord.creadoEl || new Date().toISOString();

      const estadoCaso: EstadoCaso = 
        ord.estadoGeneral === 'ENTREGADO' ? 'ENTREGADO' :
        ord.estadoGeneral === 'REPARADO' ? 'ENTREGADO' :
        ord.estadoGeneral === 'EN_REPARACION' ? 'EN_REPARACION' :
        ord.estadoGeneral === 'APROBADO_PARA_REPARACION' ? 'PENDIENTE_DE_APROBACION' :
        ord.estadoGeneral === 'DIAGNOSTICADO' ? 'PENDIENTE_DE_APROBACION' :
        ord.estadoGeneral === 'EN_DIAGNOSTICO' ? 'EN_DIAGNOSTICO' :
        ord.estadoGeneral === 'CERRADO_SIN_REPARACION' ? 'CERRADO_SIN_REPARACION' :
        'ABIERTO';

      const nuevoCaso: Caso = {
        id: codigoCaso,
        codigoCaso,
        estado: estadoCaso,
        origen: 'TALLER',
        cliente: ord.ingreso?.cliente || { razonSocial: 'Cliente General', ruc: '00000000000', contacto: '' },
        equipo: ord.ingreso?.equipo || { tipoEquipo: 'Equipo', marca: '', modelo: '', numeroSerie: serie },
        responsableApertura: ord.ingreso?.registradoPor || 'Sistema',
        fechaApertura: ord.ingreso?.fechaIngreso || ahora,
        fechaCierre: ord.cierre?.fechaEntrega || null,
        incidencias: [
          {
            id: 'INC-001',
            codigoINC: 'INC-001',
            fecha: ord.ingreso?.fechaIngreso || ahora,
            reportadoPor: ord.ingreso?.cliente?.contacto || 'Recepción',
            descripcion: ord.ingreso?.fallaReportada || 'Falla no especificada',
            prioridad: 'MEDIA',
            origen: 'TALLER',
            esReingresoGarantia: false,
            aplicaGarantia: false,
            requiereAnalisisTecnico: true,
            estado: 'RESUELTA',
            creadoEl: ahora
          }
        ],
        diagnosticos: ord.diagnostico?.diagnosticoDetallado ? [
          {
            id: 'DT-001',
            codigoDT: ord.codigoDT || 'DT-001',
            fecha: ord.diagnostico.fechaDiagnostico || ahora,
            tecnicoResponsable: ord.diagnostico.tecnicoDiagnostico || 'Área Técnica',
            tipoFalla: ord.diagnostico.tipoFalla || 'HARDWARE',
            hallazgos: ord.diagnostico.danosFisicos || 'Evaluación de taller',
            diagnosticoDetallado: ord.diagnostico.diagnosticoDetallado,
            requiereRepuestos: ord.diagnostico.requiereRepuestos,
            repuestosRequeridos: ord.diagnostico.repuestosRequeridos || [],
            estado: 'APROBADO',
            creadoEl: ahora
          }
        ] : [],
        ordenesServicio: ord.intervencion?.actividadesRealizadas ? [
          {
            id: 'OS-001',
            codigoOS: 'OS-001',
            tipo: 'CORRECTIVA',
            tecnicoAsignado: ord.intervencion.tecnicoAsignado || 'Técnico',
            actividades: ord.intervencion.actividadesRealizadas,
            horasHombre: ord.intervencion.horasHombre || 1,
            estado: 'FINALIZADA',
            creadoEl: ahora
          }
        ] : [],
        constancias: [],
        garantia: {
          aplicaGarantia: false,
          diasGarantia: 0,
          activa: false,
          reingresosContador: 0
        },
        historial: [
          {
            id: `ACT-${Date.now()}`,
            fecha: ahora,
            autor: 'Migración ServiTrack',
            tipo: 'APERTURA',
            titulo: `Expediente creado a partir de ${ord.codigoDT}`,
            detalle: `Trazabilidad migrada con estado ${ord.estadoGeneral}`
          }
        ],
        creadoEl: ord.creadoEl || ahora,
        actualizadoEl: ord.actualizadoEl || ahora
      };

      await setDoc(doc(db, COLECCION_CASOS, codigoCaso), limpiarUndefined(nuevoCaso));
      seriesConCaso.add(serie);
      migrados++;
    }

    return migrados;
  } catch (err) {
    console.error('Error al sincronizar órdenes históricas a Casos:', err);
    return 0;
  }
};

// ============================================================================
// ALIASES CANÓNICOS (Conforme a la especificación del flujo de negocio)
// ============================================================================
export const emitirDiagnosticoTecnico = registrarDiagnosticoTecnico;
export const procesarDecisionPropuesta = registrarDecisionPropuestaTecnica;
export const generarOrdenServicio = generarOrdenServicioTrabajo;
export const registrarEntregaEquipo = registrarEntregaYActivarGarantia;

