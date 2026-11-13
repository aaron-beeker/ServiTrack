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
  InformeTecnicoCaso,
  PruebasQAChecklist,
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
  DatosIngresoCaso,
  TipoContratacion
} from '@/types';
import { getUsuariosSistema, resolverUsuarioTecnico } from '@/services/usuarioService';

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
 * Normaliza un documento de Caso leído desde Firestore garantizando que:
 * - `codigoCaso` NUNCA sea `undefined` (resuelve desde `data.codigoCaso`, `docId` o formato canónico)
 * - Todos los subdocumentos (`incidencias`, `diagnosticos`, `ordenesServicio`, `informesTecnicos`, `constancias`)
 *   estén inicializados y vinculados explícitamente al expediente y a su cadena de trazabilidad.
 */
export const normalizarCasoLeido = (rawData: Record<string, any>, docId: string): Caso => {
  const rawCodigo =
    typeof rawData.codigoCaso === 'string' &&
    rawData.codigoCaso.trim().toLowerCase() !== 'undefined' &&
    rawData.codigoCaso.trim().toLowerCase() !== 'null'
      ? rawData.codigoCaso.trim()
      : '';
  let codigoCaso = rawCodigo;
  if (!codigoCaso) {
    const matchId = docId.match(/^CASO-(\d+)$/i);
    if (matchId) {
      codigoCaso = `CASO-${matchId[1].padStart(6, '0')}`;
    } else if (/^CASO-/i.test(docId)) {
      codigoCaso = docId.toUpperCase();
    } else {
      codigoCaso = docId;
    }
  } else {
    const m = codigoCaso.match(/^CASO-(\d+)$/i);
    if (m) {
      codigoCaso = `CASO-${m[1].padStart(6, '0')}`;
    }
  }

  const incidenciasRaw: IncidenciaCaso[] = Array.isArray(rawData.incidencias) ? rawData.incidencias : [];
  const incidencias: IncidenciaCaso[] = incidenciasRaw.map((inc, idx) => {
    const fallbackInc = `INC-${(idx + 1).toString().padStart(3, '0')}`;
    const codigoINC = inc.codigoINC || inc.id || fallbackInc;
    return {
      ...inc,
      id: inc.id || codigoINC,
      codigoINC,
      codigoCaso
    };
  });

  const primeraIncId = incidencias[0]?.id;

  const diagnosticosRaw: DiagnosticoTecnicoCaso[] = Array.isArray(rawData.diagnosticos) ? rawData.diagnosticos : [];
  const diagnosticos: DiagnosticoTecnicoCaso[] = diagnosticosRaw.map((dt, idx) => {
    const codigoDT = dt.codigoDT || dt.id || `DT-${(idx + 1).toString().padStart(6, '0')}`;
    const incAsociada = dt.incidenciaId || incidencias[Math.min(idx, Math.max(0, incidencias.length - 1))]?.id || primeraIncId;
    const tecInfo = resolverUsuarioTecnico(dt.tecnicoResponsable, undefined, dt.tecnicoId);
    return {
      ...dt,
      id: dt.id || codigoDT,
      codigoDT,
      codigoCaso,
      ...(tecInfo.tecnicoId ? { tecnicoId: tecInfo.tecnicoId } : {}),
      tecnicoResponsable: tecInfo.nombreCompleto,
      ...(incAsociada ? { incidenciaId: incAsociada } : {})
    };
  });

  const informesRaw: InformeTecnicoCaso[] = Array.isArray(rawData.informesTecnicos) ? rawData.informesTecnicos : [];

  const ordenesRaw: OrdenServicioTrabajo[] = Array.isArray(rawData.ordenesServicio) ? rawData.ordenesServicio : [];
  const ordenesServicio: OrdenServicioTrabajo[] = ordenesRaw.map((os, idx) => {
    const codigoOS = os.codigoOS || os.id || `OS-${(idx + 1).toString().padStart(6, '0')}`;
    const dtAsociado =
      diagnosticos.find(d => d.id === os.diagnosticoId || d.codigoDT === os.diagnosticoId) ||
      diagnosticos[Math.min(idx, Math.max(0, diagnosticos.length - 1))];
    const incAsociada =
      os.incidenciaId ||
      dtAsociado?.incidenciaId ||
      incidencias[Math.min(idx, Math.max(0, incidencias.length - 1))]?.id ||
      primeraIncId;
    const infAsociado =
      os.informeTecnicoId ||
      informesRaw.find(it => it.ordenServicioId === codigoOS || it.ordenServicioId === os.id)?.codigoInforme;
    const tecInfo = resolverUsuarioTecnico(os.tecnicoAsignado, undefined, os.tecnicoId);

    return {
      ...os,
      id: os.id || codigoOS,
      codigoOS,
      codigoCaso,
      ...(tecInfo.tecnicoId ? { tecnicoId: tecInfo.tecnicoId } : {}),
      tecnicoAsignado: tecInfo.nombreCompleto,
      ...(incAsociada ? { incidenciaId: incAsociada } : {}),
      ...(dtAsociado ? { diagnosticoId: dtAsociado.codigoDT } : os.diagnosticoId ? { diagnosticoId: os.diagnosticoId } : {}),
      ...(infAsociado ? { informeTecnicoId: infAsociado } : {})
    };
  });

  const informesTecnicos: InformeTecnicoCaso[] = informesRaw.map((it, idx) => {
    const codigoInforme = it.codigoInforme || it.id || `IT-${(idx + 1).toString().padStart(6, '0')}`;
    const osAsociada =
      ordenesServicio.find(o => o.codigoOS === it.ordenServicioId || o.id === it.ordenServicioId) ||
      ordenesServicio[Math.min(idx, Math.max(0, ordenesServicio.length - 1))];
    const tecInfo = resolverUsuarioTecnico(it.tecnicoResponsable, undefined, it.tecnicoId || osAsociada?.tecnicoId);
    return {
      ...it,
      id: it.id || codigoInforme,
      codigoInforme,
      codigoCaso,
      ...(tecInfo.tecnicoId ? { tecnicoId: tecInfo.tecnicoId } : {}),
      tecnicoResponsable: tecInfo.nombreCompleto,
      incidenciaId: it.incidenciaId || osAsociada?.incidenciaId || primeraIncId,
      diagnosticoId: it.diagnosticoId || osAsociada?.diagnosticoId || diagnosticos[0]?.codigoDT,
      ordenServicioId: it.ordenServicioId || osAsociada?.codigoOS
    };
  });

  const constanciasRaw: ConstanciaAtencionSimple[] = Array.isArray(rawData.constancias) ? rawData.constancias : [];
  const constancias: ConstanciaAtencionSimple[] = constanciasRaw.map((cst, idx) => {
    const codigoConstancia = cst.codigoConstancia || cst.id || `CA-${(idx + 1).toString().padStart(6, '0')}`;
    const incAsociada = cst.incidenciaId || incidencias[Math.min(idx, Math.max(0, incidencias.length - 1))]?.id || primeraIncId;
    const tecInfo = resolverUsuarioTecnico(cst.tecnicoResponsable, undefined, cst.tecnicoId);
    return {
      ...cst,
      id: cst.id || codigoConstancia,
      codigoConstancia,
      codigoCaso,
      ...(tecInfo.tecnicoId ? { tecnicoId: tecInfo.tecnicoId } : {}),
      tecnicoResponsable: tecInfo.nombreCompleto,
      ...(incAsociada ? { incidenciaId: incAsociada } : {})
    };
  });

  return {
    ...(rawData as Caso),
    id: docId,
    codigoCaso,
    incidencias,
    diagnosticos,
    ordenesServicio,
    informesTecnicos,
    constancias,
    historial: Array.isArray(rawData.historial) ? rawData.historial : []
  };
};

/**
 * Motor atómico generalizado de correlativos globales únicos en Firestore (`contadores/{clave}`).
 */
const generarSiguienteCorrelativoGlobal = async (
  claveContador: 'casos' | 'diagnosticos' | 'ordenes_trabajo' | 'informes_tecnicos' | 'constancias',
  prefijo: 'CASO' | 'DT' | 'OS' | 'IT' | 'CA',
  calcularMaximoExistente: () => Promise<number>
): Promise<string> => {
  const contadorRef = doc(db, 'contadores', claveContador);

  try {
    const maxActual = await calcularMaximoExistente();
    const nuevoCodigo = await runTransaction(db, async (transaction) => {
      const contadorDoc = await transaction.get(contadorRef);
      const ultimoGuardado = contadorDoc.exists() ? (contadorDoc.data()?.ultimoNumero || 0) : 0;
      const siguienteNumero = Math.max(ultimoGuardado, maxActual) + 1;

      transaction.set(contadorRef, {
        ultimoNumero: siguienteNumero,
        prefijo,
        actualizadoEl: new Date().toISOString()
      }, { merge: true });

      return `${prefijo}-${siguienteNumero.toString().padStart(6, '0')}`;
    });

    return nuevoCodigo;
  } catch (err) {
    console.error(`Error al generar correlativo ${prefijo}:`, err);
    const maxActual = await calcularMaximoExistente();
    return `${prefijo}-${(maxActual + 1).toString().padStart(6, '0')}`;
  }
};

const extraerNumeroPrefijo = (valor: string | undefined | null, prefijosRegex: RegExp): number => {
  if (!valor) return 0;
  const match = String(valor).match(prefijosRegex);
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  return isNaN(n) ? 0 : n;
};

/**
 * Genera el siguiente código correlativo para CASO (CASO-XXXXXX)
 */
export const generarSiguienteCodigoCaso = async (): Promise<string> => {
  return generarSiguienteCorrelativoGlobal('casos', 'CASO', async () => {
    const snapshot = await getDocs(collection(db, COLECCION_CASOS));
    let maxNum = 0;
    snapshot.docs.forEach((docSnap) => {
      const n1 = extraerNumeroPrefijo(docSnap.id, /^CASO-(\d+)$/i);
      const n2 = extraerNumeroPrefijo(docSnap.data().codigoCaso, /^CASO-(\d+)$/i);
      maxNum = Math.max(maxNum, n1, n2);
    });
    return maxNum;
  });
};

export const generarSiguienteCodigoDTGlobal = async (): Promise<string> => {
  return generarSiguienteCorrelativoGlobal('diagnosticos', 'DT', async () => {
    const [casosSnap, ordSnap] = await Promise.all([
      getDocs(collection(db, COLECCION_CASOS)),
      getDocs(collection(db, COLECCION_ORDENES))
    ]);
    let maxNum = 0;
    casosSnap.docs.forEach((d) => {
      const dts: any[] = d.data().diagnosticos || [];
      dts.forEach((dt) => {
        maxNum = Math.max(maxNum, extraerNumeroPrefijo(dt.codigoDT || dt.id, /^DT-(\d+)$/i));
      });
    });
    ordSnap.docs.forEach((d) => {
      maxNum = Math.max(
        maxNum,
        extraerNumeroPrefijo(d.id, /^DT-(\d+)$/i),
        extraerNumeroPrefijo(d.data().codigoDT, /^DT-(\d+)$/i)
      );
    });
    return maxNum;
  });
};

export const generarSiguienteCodigoOSGlobal = async (): Promise<string> => {
  return generarSiguienteCorrelativoGlobal('ordenes_trabajo', 'OS', async () => {
    const casosSnap = await getDocs(collection(db, COLECCION_CASOS));
    let maxNum = 0;
    casosSnap.docs.forEach((d) => {
      const oss: any[] = d.data().ordenesServicio || [];
      oss.forEach((os) => {
        maxNum = Math.max(maxNum, extraerNumeroPrefijo(os.codigoOS || os.id, /^OS-(\d+)$/i));
      });
    });
    return maxNum;
  });
};

export const generarSiguienteCodigoInformeTecnico = async (): Promise<string> => {
  return generarSiguienteCorrelativoGlobal('informes_tecnicos', 'IT', async () => {
    const casosSnap = await getDocs(collection(db, COLECCION_CASOS));
    let maxNum = 0;
    casosSnap.docs.forEach((d) => {
      const its: any[] = d.data().informesTecnicos || [];
      its.forEach((it) => {
        maxNum = Math.max(maxNum, extraerNumeroPrefijo(it.codigoInforme || it.id, /^(?:IT|INF|I)-(\d+)$/i));
      });
    });
    return maxNum;
  });
};

export const generarSiguienteCodigoConstancia = async (): Promise<string> => {
  return generarSiguienteCorrelativoGlobal('constancias', 'CA', async () => {
    const casosSnap = await getDocs(collection(db, COLECCION_CASOS));
    let maxNum = 0;
    casosSnap.docs.forEach((d) => {
      const csts: any[] = d.data().constancias || [];
      csts.forEach((cst) => {
        maxNum = Math.max(maxNum, extraerNumeroPrefijo(cst.codigoConstancia || cst.id, /^(?:CA|CONST)-(\d+)$/i));
      });
    });
    return maxNum;
  });
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

  const casosCoincidentes: Caso[] = [];

  for (const d of snapshot.docs) {
    const raw = d.data();
    const casoSerie = raw.equipo?.numeroSerie?.trim().toUpperCase();

    if (casoSerie === serieNorm) {
      casosCoincidentes.push(normalizarCasoLeido(raw, d.id));
    }
  }

  if (casosCoincidentes.length === 0) return null;

  // 1. Si existe un caso en proceso activo (no cerrado), priorizarlo
  const casoAbierto = casosCoincidentes.find(c => !ESTADOS_CERRADOS.includes(c.estado));
  if (casoAbierto) return casoAbierto;

  // 2. Si todos están cerrados, ordenar por fecha más reciente para recuperar el expediente único oficial
  casosCoincidentes.sort((a, b) => {
    const fechaA = new Date(a.actualizadoEl || a.fechaApertura || 0).getTime();
    const fechaB = new Date(b.actualizadoEl || b.fechaApertura || 0).getTime();
    return fechaB - fechaA;
  });

  return casosCoincidentes[0];
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
  servicioId?: string;
  tipoContratacion?: TipoContratacion;
  ordenServicioCliente?: string;
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
    codigoCaso,
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
      titulo: `Apertura de Expediente ${codigoCaso}`,
      detalle: `Apertura de caso para ${params.equipo.marca} ${params.equipo.modelo} (S/N: ${params.equipo.numeroSerie}) - Cliente: ${params.cliente.razonSocial}${params.contratoAlquiler ? ` [Contrato: ${params.contratoAlquiler}]` : ''}`,
      referenciaId: codigoCaso
    },
    {
      id: `ACT-${Date.now()}-2`,
      fecha: ahora,
      autor: params.responsableApertura,
      tipo: 'INCIDENCIA',
      titulo: `Registro de Incidencia ${incId} (${codigoCaso})`,
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
    ...(params.servicioId ? { servicioId: params.servicioId } : {}),
    ...(params.tipoContratacion ? { tipoContratacion: params.tipoContratacion } : {}),
    ...(params.ordenServicioCliente?.trim() ? { ordenServicioCliente: params.ordenServicioCliente.trim() } : {}),
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
    informesTecnicos: [],
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

    const nuevaInc = await registrarNuevaIncidencia(casoExistente.id, {
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
 * Obtener un Caso por su código o ID de documento (CASO-XXXXXX, DT-XXXXXX, OS-XXXXXX, IT-XXXXXX, CA-XXXXXX)
 */
export const getCasoByCodigo = async (codigoBusqueda: string): Promise<Caso | null> => {
  if (!codigoBusqueda) return null;
  const q = codigoBusqueda.trim();

  const docRef = doc(db, COLECCION_CASOS, q);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    return normalizarCasoLeido(snap.data(), snap.id);
  }

  // Búsqueda por colección completa (soporta codigoCaso, DT, OS, IT y Constancia)
  const qUpper = q.toUpperCase();
  const ref = collection(db, COLECCION_CASOS);
  const allSnaps = await getDocs(ref);
  for (const d of allSnaps.docs) {
    const casoNorm = normalizarCasoLeido(d.data(), d.id);
    if (d.id.toUpperCase() === qUpper || casoNorm.codigoCaso.toUpperCase() === qUpper) {
      return casoNorm;
    }
    if (casoNorm.diagnosticos?.some(dt => dt.codigoDT.toUpperCase() === qUpper)) {
      return casoNorm;
    }
    if (casoNorm.ordenesServicio?.some(os => os.codigoOS.toUpperCase() === qUpper)) {
      return casoNorm;
    }
    if (casoNorm.informesTecnicos?.some(it => it.codigoInforme.toUpperCase() === qUpper)) {
      return casoNorm;
    }
    if (casoNorm.constancias?.some(cst => cst.codigoConstancia.toUpperCase() === qUpper)) {
      return casoNorm;
    }
  }

  return null;
};

/**
 * Listar todos los Casos normalizados
 */
export const getCasos = async (): Promise<Caso[]> => {
  const ref = collection(db, COLECCION_CASOS);
  const snapshot = await getDocs(ref);

  const casos = snapshot.docs.map((d) => normalizarCasoLeido(d.data(), d.id));

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
      const casos = snapshot.docs.map((d) => normalizarCasoLeido(d.data(), d.id));

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
 * Suscripción reactiva en tiempo real a un Caso individual (resuelve tanto por ID físico como por codigoCaso)
 */
export const suscribirCaso = (codigoCaso: string, callback: (caso: Caso | null) => void): (() => void) => {
  if (!codigoCaso) return () => {};
  let unsubFallback: (() => void) | null = null;

  try {
    const docRef = doc(db, COLECCION_CASOS, codigoCaso);
    const unsubDirect = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        if (unsubFallback) {
          unsubFallback();
          unsubFallback = null;
        }
        callback(normalizarCasoLeido(docSnap.data(), docSnap.id));
      } else if (!unsubFallback) {
        // Fallback reactivo si la ruta contiene `codigoCaso` pero el ID físico heredado difiere
        const qUpper = codigoCaso.trim().toUpperCase();
        unsubFallback = onSnapshot(collection(db, COLECCION_CASOS), (colSnap) => {
          const matchDoc = colSnap.docs.find((d) => {
            const norm = normalizarCasoLeido(d.data(), d.id);
            return d.id.toUpperCase() === qUpper || norm.codigoCaso.toUpperCase() === qUpper;
          });
          callback(matchDoc ? normalizarCasoLeido(matchDoc.data(), matchDoc.id) : null);
        });
      }
    }, (err) => {
      console.error('Error en suscripción de Caso individual:', err);
    });

    return () => {
      unsubDirect();
      if (unsubFallback) unsubFallback();
    };
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

  const esGarantia = Boolean(
    params.esReingresoGarantia || caso.garantia?.activa || params.origen === 'RECLAMO_GARANTIA'
  );

  const ultimoIT = caso.informesTecnicos?.[caso.informesTecnicos.length - 1];
  const ultimaOS = caso.ordenesServicio?.[caso.ordenesServicio.length - 1];
  const ultimoDT = caso.diagnosticos?.[caso.diagnosticos.length - 1];
  const vinculoPrevio = esGarantia
    ? (ultimoIT?.codigoInforme || ultimaOS?.codigoOS || ultimoDT?.codigoDT || undefined)
    : undefined;

  const nuevaInc: IncidenciaCaso = {
    id: incId,
    codigoINC: incId,
    codigoCaso: caso.codigoCaso,
    fecha: ahora,
    reportadoPor: params.reportadoPor,
    descripcion: params.descripcion.trim(),
    prioridad: params.prioridad,
    origen: params.origen,
    esReingresoGarantia: esGarantia,
    ...(vinculoPrevio ? { vinculoIntervencionPrevia: vinculoPrevio } : {}),
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
    titulo: `Nueva Incidencia ${incId} (${caso.codigoCaso})${esGarantia ? ' [REINGRESO EN GARANTÍA]' : ''}`,
    detalle: `${nuevaInc.descripcion} (Prioridad: ${nuevaInc.prioridad}, Origen: ${nuevaInc.origen})${vinculoPrevio ? ` · Vinculado a intervención previa ${vinculoPrevio}` : ''}`,
    referenciaId: incId
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
    incidencias: [...(caso.incidencias || []), nuevaInc],
    historial: [nuevaActividad, ...(caso.historial || [])],
    estado: nuevoEstado,
    fechaCierre: null, // Reactiva el expediente limpiando cualquier fecha de cierre previa
    entrega: null, // Limpia entrega previa para dar paso al nuevo ciclo del reingreso
    'garantia.reingresosContador': esGarantia ? (caso.garantia?.reingresosContador || 0) + 1 : (caso.garantia?.reingresosContador || 0),
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso.id}/incidencias
  try {
    const incSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/incidencias`, nuevaInc.id);
    await setDoc(incSubRef, limpiarUndefined(nuevaInc));
  } catch (err) {
    console.warn('Subcolección incidencias:', err);
  }

  return nuevaInc;
};

/**
 * PASO 2A (Diagrama): ATENCIÓN SIMPLE (SIN DIAGNÓSTICO FORMAL)
 * Técnico ejecuta soporte menor (limpieza, config, reinicio, sustitución temporal).
 * Genera Constancia de Atención correlativa global (CA-XXXXXX) vinculada al expediente.
 */
export const registrarAtencionSimple = async (
  codigoCaso: string,
  params: {
    incidenciaId?: string;
    motivoSoporte?: string;
    fallaReal?: string;
    actividadesRealizadas: string;
    resultado: string;
    ticketItop?: string;
    observaciones?: string;
    tecnicoResponsable: string;
    tecnicoId?: string;
    fechaIngreso?: string;
    horaIngreso?: string;
    fechaSalida?: string;
    horaSalida?: string;
    firmaReceptor?: string;
  }
): Promise<ConstanciaAtencionSimple> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const usuarios = await getUsuariosSistema().catch(() => []);
  const tecInfo = resolverUsuarioTecnico(params.tecnicoResponsable, usuarios, params.tecnicoId);

  const ahora = new Date().toISOString();
  const constId = await generarSiguienteCodigoConstancia();

  const idIncidenciaAsociada =
    params.incidenciaId ||
    caso.incidencias?.find(i => i.estado !== 'RESUELTA')?.id ||
    caso.incidencias?.[caso.incidencias.length - 1]?.id ||
    null;

  const incRef =
    caso.incidencias?.find(i => i.id === idIncidenciaAsociada) ||
    caso.incidencias?.[caso.incidencias.length - 1] ||
    caso.incidencias?.[0];

  const motivoFinal = params.motivoSoporte?.trim()
    || incRef?.descripcion
    || 'Soporte menor / mantenimiento preventivo';

  const fechaRefISO = incRef?.fecha || caso.fechaApertura || ahora;
  const fechaRefYMD = fechaRefISO.slice(0, 10);

  const nuevaConstancia: ConstanciaAtencionSimple = {
    id: constId,
    codigoConstancia: constId,
    codigoCaso: caso.codigoCaso,
    fecha: ahora,
    fechaIngreso: params.fechaIngreso?.trim() || fechaRefYMD,
    horaIngreso: params.horaIngreso?.trim() || '',
    fechaSalida: params.fechaSalida?.trim() || fechaRefYMD,
    horaSalida: params.horaSalida?.trim() || '',
    ...(tecInfo.tecnicoId ? { tecnicoId: tecInfo.tecnicoId } : {}),
    tecnicoResponsable: tecInfo.nombreCompleto,
    motivoSoporte: motivoFinal,
    fallaReal: params.fallaReal?.trim() || undefined,
    actividadesRealizadas: params.actividadesRealizadas.trim(),
    resultado: params.resultado.trim(),
    ticketItop: params.ticketItop?.trim() || null,
    observaciones: params.observaciones?.trim() || undefined,
    firmaReceptor: params.firmaReceptor || null,
    creadoEl: ahora,
    ...(idIncidenciaAsociada ? { incidenciaId: idIncidenciaAsociada } : {})
  };

  // Marcar incidencia como resuelta si aplica
  const incidenciasActualizadas = (caso.incidencias || []).map((inc) => {
    if (!idIncidenciaAsociada || inc.id === idIncidenciaAsociada) {
      return { ...inc, codigoCaso: caso.codigoCaso, estado: 'RESUELTA' as const };
    }
    return { ...inc, codigoCaso: caso.codigoCaso };
  });

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: tecInfo.nombreCompleto,
    tipo: 'ATENCION_SIMPLE',
    titulo: `Constancia de Atención ${constId} (${caso.codigoCaso})`,
    detalle: `Soporte menor [${idIncidenciaAsociada || 'INC-001'}]: ${motivoFinal}. Resultado: ${params.resultado}${params.ticketItop ? ` • Ticket iTop: ${params.ticketItop}` : ''}.`,
    referenciaId: constId
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
    constancias: [...(caso.constancias || []), nuevaConstancia],
    incidencias: incidenciasActualizadas,
    historial: [nuevaActividad, ...(caso.historial || [])],
    estado: 'REPARADO',
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso.id}/constancias
  try {
    const constSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/constancias`, nuevaConstancia.id);
    await setDoc(constSubRef, limpiarUndefined(nuevaConstancia));
  } catch (err) {
    console.warn('Subcolección constancias:', err);
  }

  return nuevaConstancia;
};

/**
 * Permite actualizar manualmente la fecha/hora de ingreso y salida, técnico o detalles
 * de una Constancia de Atención ya emitida en el expediente.
 */
export const actualizarConstanciaAtencion = async (
  codigoCaso: string,
  constanciaId: string,
  params: {
    fechaIngreso?: string;
    horaIngreso?: string;
    fechaSalida?: string;
    horaSalida?: string;
    ticketItop?: string;
    fallaReal?: string;
    actividadesRealizadas?: string;
    resultado?: string;
    observaciones?: string;
    tecnicoResponsable?: string;
    tecnicoId?: string;
  }
): Promise<ConstanciaAtencionSimple> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const usuarios = await getUsuariosSistema().catch(() => []);
  const ahora = new Date().toISOString();
  let constanciaActualizada: ConstanciaAtencionSimple | null = null;

  const constanciasNuevas = (caso.constancias || []).map((cst) => {
    if (cst.id === constanciaId || cst.codigoConstancia === constanciaId) {
      const tecInfo = resolverUsuarioTecnico(
        params.tecnicoResponsable ?? cst.tecnicoResponsable,
        usuarios,
        params.tecnicoId ?? cst.tecnicoId
      );
      const updated: ConstanciaAtencionSimple = {
        ...cst,
        codigoCaso: caso.codigoCaso,
        fechaIngreso: params.fechaIngreso !== undefined ? params.fechaIngreso.trim() : cst.fechaIngreso,
        horaIngreso: params.horaIngreso !== undefined ? params.horaIngreso.trim() : cst.horaIngreso,
        fechaSalida: params.fechaSalida !== undefined ? params.fechaSalida.trim() : cst.fechaSalida,
        horaSalida: params.horaSalida !== undefined ? params.horaSalida.trim() : cst.horaSalida,
        ticketItop: params.ticketItop !== undefined ? params.ticketItop.trim() : cst.ticketItop,
        fallaReal: params.fallaReal !== undefined ? (params.fallaReal.trim() || undefined) : cst.fallaReal,
        actividadesRealizadas:
          params.actividadesRealizadas !== undefined
            ? params.actividadesRealizadas.trim()
            : cst.actividadesRealizadas,
        resultado: params.resultado !== undefined ? params.resultado.trim() : cst.resultado,
        observaciones:
          params.observaciones !== undefined
            ? (params.observaciones.trim() || undefined)
            : cst.observaciones,
        ...(tecInfo.tecnicoId ? { tecnicoId: tecInfo.tecnicoId } : {}),
        tecnicoResponsable: tecInfo.nombreCompleto
      };
      constanciaActualizada = updated;
      return updated;
    }
    return cst;
  });

  if (!constanciaActualizada) {
    throw new Error(`Constancia ${constanciaId} no encontrada en el expediente ${caso.codigoCaso}.`);
  }

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    constancias: constanciasNuevas,
    actualizadoEl: ahora
  }));

  try {
    const constSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/constancias`, (constanciaActualizada as ConstanciaAtencionSimple).id);
    await setDoc(constSubRef, limpiarUndefined(constanciaActualizada), { merge: true });
  } catch (err) {
    console.warn('Subcolección constancias actualización:', err);
  }

  return constanciaActualizada;
};

/**
 * PASO 2B (Diagrama): EVALUACIÓN Y DIAGNÓSTICO TÉCNICO (DT)
 * Emite DT-XXXXXX correlativo global único vinculado a la incidencia y al expediente.
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
  const dtId = await generarSiguienteCodigoDTGlobal();

  const idIncidenciaAsociada =
    params.incidenciaId ||
    caso.incidencias?.find(i => i.estado !== 'RESUELTA')?.id ||
    caso.incidencias?.[caso.incidencias.length - 1]?.id ||
    null;

  const nuevoDT: DiagnosticoTecnicoCaso = {
    id: dtId,
    codigoDT: dtId,
    codigoCaso: caso.codigoCaso,
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
    titulo: `Diagnóstico Técnico ${dtId} Concluido (${caso.codigoCaso})`,
    detalle: `Causa raíz [${idIncidenciaAsociada || 'INC-001'}]: ${params.hallazgos}. Dictamen: ${params.diagnosticoDetallado}. Repuestos: ${params.requiereRepuestos ? params.repuestosRequeridos.length : 'Ninguno'}.`,
    referenciaId: dtId
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
    diagnosticos: [...(caso.diagnosticos || []), nuevoDT],
    estado: 'DIAGNOSTICADO',
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso.id}/diagnosticos
  try {
    const dtSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/diagnosticos`, nuevoDT.id);
    await setDoc(dtSubRef, limpiarUndefined(nuevoDT));
  } catch (err) {
    console.warn('Subcolección diagnosticos:', err);
  }

  return nuevoDT;
};

/**
 * Actualiza o edita un Diagnóstico Técnico (DT) existente por errores de digitación o ajustes técnicos.
 */
export const actualizarDiagnosticoTecnico = async (
  codigoCaso: string,
  diagnosticoId: string,
  params: {
    tecnicoResponsable?: string;
    tipoFalla?: 'HARDWARE' | 'SOFTWARE' | 'OPERATIVO';
    hallazgos?: string; // Falla real / Causa raíz
    diagnosticoDetallado?: string;
    danosFisicos?: string;
    requiereRepuestos?: boolean;
    repuestosRequeridos?: RepuestoItem[];
    recomendaciones?: string;
    solucionPropuesta?: string;
    autorModificacion?: string;
  }
): Promise<DiagnosticoTecnicoCaso> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();
  const diagnosticos = [...(caso.diagnosticos || [])];
  const dtIndex = diagnosticos.findIndex(
    d => d.id === diagnosticoId || d.codigoDT === diagnosticoId
  );
  if (dtIndex === -1) {
    throw new Error(`Diagnóstico ${diagnosticoId} no encontrado en el caso.`);
  }

  const dtAnterior = diagnosticos[dtIndex];
  const dtActualizado: DiagnosticoTecnicoCaso = {
    ...dtAnterior,
    tecnicoResponsable: params.tecnicoResponsable ?? dtAnterior.tecnicoResponsable,
    tipoFalla: params.tipoFalla ?? dtAnterior.tipoFalla,
    hallazgos: params.hallazgos !== undefined ? params.hallazgos.trim() : dtAnterior.hallazgos,
    diagnosticoDetallado: params.diagnosticoDetallado !== undefined ? params.diagnosticoDetallado.trim() : dtAnterior.diagnosticoDetallado,
    danosFisicos: params.danosFisicos !== undefined ? params.danosFisicos.trim() : dtAnterior.danosFisicos,
    requiereRepuestos: params.requiereRepuestos !== undefined ? params.requiereRepuestos : dtAnterior.requiereRepuestos,
    repuestosRequeridos: params.repuestosRequeridos !== undefined ? params.repuestosRequeridos : dtAnterior.repuestosRequeridos,
    recomendaciones: params.recomendaciones !== undefined ? params.recomendaciones.trim() : dtAnterior.recomendaciones,
    solucionPropuesta: params.solucionPropuesta !== undefined ? params.solucionPropuesta.trim() : dtAnterior.solucionPropuesta,
    actualizadoEl: ahora
  };

  diagnosticos[dtIndex] = dtActualizado;

  const autor = params.autorModificacion || params.tecnicoResponsable || dtActualizado.tecnicoResponsable || 'Técnico Evaluador';

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor,
    tipo: 'DIAGNOSTICO',
    titulo: `Diagnóstico Técnico ${dtActualizado.codigoDT || dtActualizado.id} Modificado/Actualizado`,
    detalle: `Ajuste en informe DT. Falla real: ${dtActualizado.hallazgos}. Dictamen: ${dtActualizado.diagnosticoDetallado}`,
    referenciaId: dtActualizado.codigoDT || dtActualizado.id
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    diagnosticos,
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  try {
    const dtSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/diagnosticos`, dtActualizado.id);
    await setDoc(dtSubRef, limpiarUndefined(dtActualizado), { merge: true });
  } catch (err) {
    console.warn('Subcolección diagnosticos merge:', err);
  }

  return dtActualizado;
};

/**
 * PASO 2B (Decisión) & Transición a FASE 3:
 * Cliente o jefatura aprueba o rechaza la propuesta técnica del Diagnóstico (DT).
 * - Si Rechaza: Estado pasa a 'CERRADO_SIN_REPARACION' (emitiendo Acta de Devolución con Informe).
 * - Si Aprueba: Pasa a 'APROBADO_PARA_REPARACION' (o 'EN_REPARACION' si se genera la OS de inmediato).
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
        codigoCaso: caso.codigoCaso,
        estado: (aprobado ? 'APROBADO' : 'RECHAZADO') as any,
        aprobacionCliente: {
          fechaDecision: ahora,
          aprobado,
          motivoRechazo: aprobado ? null : (motivoRechazo || 'Presupuesto o propuesta no aprobada'),
          registradoPor: registradoPor || 'operaciones@murtecnologia.com'
        }
      };
    }
    return { ...dt, codigoCaso: caso.codigoCaso };
  });

  let nuevaOS: OrdenServicioTrabajo | null = null;
  let ordenesActualizadas = caso.ordenesServicio || [];

  if (aprobado && generarOSInmediata) {
    const osId = generarOSInmediata.codigoOSManual?.trim()
      ? generarOSInmediata.codigoOSManual.trim().toUpperCase()
      : await generarSiguienteCodigoOSGlobal();

    if (ordenesActualizadas.some(o => o.codigoOS === osId)) {
      throw new Error(`Ya existe una Orden de Servicio con el código ${osId} en este expediente.`);
    }

    const dtMatch = diagnosticosActualizados.find(d => d.id === diagnosticoId || d.codigoDT === diagnosticoId);
    const incAsociada = dtMatch?.incidenciaId || caso.incidencias?.[caso.incidencias.length - 1]?.id;
    nuevaOS = {
      id: osId,
      codigoOS: osId,
      codigoCaso: caso.codigoCaso,
      diagnosticoId: dtMatch?.codigoDT || diagnosticoId,
      ...(incAsociada ? { incidenciaId: incAsociada } : {}),
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
      : 'APROBADO_PARA_REPARACION';

  const actividadesHistorial: ActividadHistorial[] = [
    {
      id: `ACT-${Date.now()}-1`,
      fecha: ahora,
      autor: registradoPor || 'Cliente',
      tipo: aprobado ? 'APROBACION' : 'RECHAZO',
      titulo: aprobado ? `Propuesta Técnica ${diagnosticoId} Aprobada` : `Propuesta Técnica ${diagnosticoId} Rechazada`,
      detalle: aprobado 
        ? `Cliente/jefatura autoriza intervención técnica en ${caso.codigoCaso}. ${nuevaOS ? `Se apertura automáticamente la Orden de Servicio ${nuevaOS.codigoOS}.` : 'Habilitada para generar OS.'}` 
        : `Rechazo registrado: ${motivoRechazo || 'Sin detalle'}. Emitir Acta de Devolución Técnica (${diagnosticoId}).`,
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
      detalle: `Expediente ${caso.codigoCaso} · Diagnóstico ${nuevaOS.diagnosticoId || diagnosticoId}. Trabajo asignado a: ${nuevaOS.tecnicoAsignado}.`,
      referenciaId: nuevaOS.codigoOS
    });
  }

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
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
      const osSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/ordenes_servicio`, nuevaOS.id);
      await setDoc(osSubRef, limpiarUndefined(nuevaOS));
    } catch (err) {
      console.warn('Subcolección ordenes_servicio:', err);
    }
  }

  return nuevaOS;
};

/**
 * PASO 3 (Diagrama): EJECUCIÓN DE TRABAJO (ORDEN DE SERVICIO - OS)
 * Genera Orden de Servicio correlativa global (OS-XXXXXX) o admite código externo manual.
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
  const osId = params.codigoOSManual?.trim()
    ? params.codigoOSManual.trim().toUpperCase()
    : await generarSiguienteCodigoOSGlobal();

  if (caso.ordenesServicio?.some(o => o.codigoOS === osId)) {
    throw new Error(`Ya existe una Orden de Servicio con el código ${osId} en este expediente.`);
  }

  const dtAsociado = params.diagnosticoId
    ? caso.diagnosticos?.find(d => d.id === params.diagnosticoId || d.codigoDT === params.diagnosticoId)
    : caso.diagnosticos?.[caso.diagnosticos.length - 1];
  const incAsociada =
    params.incidenciaId ||
    dtAsociado?.incidenciaId ||
    caso.incidencias?.find(i => i.estado !== 'RESUELTA')?.id ||
    caso.incidencias?.[caso.incidencias.length - 1]?.id;

  const nuevaOS: OrdenServicioTrabajo = {
    id: osId,
    codigoOS: osId,
    codigoCaso: caso.codigoCaso,
    tipo: params.tipo,
    tecnicoAsignado: params.tecnicoAsignado,
    actividades: params.actividades.trim(),
    horasHombre: params.horasHombreEstimadas || 1,
    estado: 'EN_EJECUCION',
    fechaInicio: ahora,
    pruebasQA: null,
    creadoEl: ahora,
    ...(incAsociada ? { incidenciaId: incAsociada } : {}),
    ...(dtAsociado ? { diagnosticoId: dtAsociado.codigoDT } : params.diagnosticoId ? { diagnosticoId: params.diagnosticoId } : {})
  };

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.autor,
    tipo: 'ORDEN_SERVICIO',
    titulo: `Apertura de Orden de Servicio ${osId} (${params.tipo})`,
    detalle: `Expediente ${caso.codigoCaso} ·Asignado a: ${params.tecnicoAsignado}. Actividades: ${params.actividades}. Estado pasa a En Reparación.`,
    referenciaId: osId
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
    ordenesServicio: [...(caso.ordenesServicio || []), nuevaOS],
    estado: 'EN_REPARACION',
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  // Sincronización en subcolección casos/{caso.id}/ordenes_servicio
  try {
    const osSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/ordenes_servicio`, nuevaOS.id);
    await setDoc(osSubRef, limpiarUndefined(nuevaOS));
  } catch (err) {
    console.warn('Subcolección ordenes_servicio:', err);
  }

  return nuevaOS;
};

/**
 * PASO 3.1 (Flujo Interno de Etapa 3): TRAZABILIDAD DE ESFUERZO TÉCNICO
 * Registra Técnico Ejecutor, Actividades Ejecutadas, Horas-Hombre y fechas de inicio y término.
 * Si aún no existía OS para el ciclo activo, emite un correlativo único OS-XXXXXX vinculado al DT e INC.
 */
export const guardarIntervencionTecnicaOS = async (
  codigoCaso: string,
  params: {
    osId?: string;
    codigoOSManual?: string;
    tipo?: TipoOrdenServicio;
    incidenciaId?: string;
    diagnosticoId?: string;
    tecnicoAsignado: string;
    actividadesRealizadas: string;
    piezasReemplazadas?: string;
    horasHombreReales: number;
    fechaInicio?: string;
    fechaFin?: string;
    autor: string;
  }
): Promise<OrdenServicioTrabajo> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();
  const ordenesExistentes = caso.ordenesServicio || [];
  const osExistente = params.osId
    ? ordenesExistentes.find(o => o.id === params.osId || o.codigoOS === params.osId)
    : undefined;

  const dtAsociado = params.diagnosticoId
    ? caso.diagnosticos?.find(d => d.id === params.diagnosticoId || d.codigoDT === params.diagnosticoId)
    : caso.diagnosticos?.[caso.diagnosticos.length - 1];
  const incAsociada =
    params.incidenciaId ||
    osExistente?.incidenciaId ||
    dtAsociado?.incidenciaId ||
    caso.incidencias?.find(i => i.estado !== 'RESUELTA')?.id ||
    caso.incidencias?.[caso.incidencias.length - 1]?.id;
  const diagCodigo =
    osExistente?.diagnosticoId ||
    dtAsociado?.codigoDT ||
    params.diagnosticoId;

  let osGuardada: OrdenServicioTrabajo;
  let ordenesActualizadas: OrdenServicioTrabajo[];

  if (osExistente) {
    osGuardada = {
      ...osExistente,
      codigoCaso: caso.codigoCaso,
      ...(incAsociada ? { incidenciaId: incAsociada } : {}),
      ...(diagCodigo ? { diagnosticoId: diagCodigo } : {}),
      tecnicoAsignado: params.tecnicoAsignado.trim(),
      actividadesRealizadas: params.actividadesRealizadas.trim(),
      piezasReemplazadas: params.piezasReemplazadas?.trim() || undefined,
      horasHombre: params.horasHombreReales,
      horasHombreReales: params.horasHombreReales,
      fechaInicio: params.fechaInicio || osExistente.fechaInicio || ahora,
      fechaFin: params.fechaFin || osExistente.fechaFin || ahora,
      estado: 'EN_PRUEBAS'
    };
    ordenesActualizadas = ordenesExistentes.map(o =>
      (o.id === osExistente.id || o.codigoOS === osExistente.codigoOS) ? osGuardada : o
    );
  } else {
    const nuevoOsId = params.codigoOSManual?.trim()
      ? params.codigoOSManual.trim().toUpperCase()
      : await generarSiguienteCodigoOSGlobal();

    if (ordenesExistentes.some(o => o.codigoOS === nuevoOsId)) {
      throw new Error(`Ya existe una Orden de Servicio con el código ${nuevoOsId} en este expediente.`);
    }

    osGuardada = {
      id: nuevoOsId,
      codigoOS: nuevoOsId,
      codigoCaso: caso.codigoCaso,
      tipo: params.tipo || 'CORRECTIVA',
      tecnicoAsignado: params.tecnicoAsignado.trim(),
      actividades: params.actividadesRealizadas.trim(),
      actividadesRealizadas: params.actividadesRealizadas.trim(),
      piezasReemplazadas: params.piezasReemplazadas?.trim() || undefined,
      horasHombre: params.horasHombreReales,
      horasHombreReales: params.horasHombreReales,
      estado: 'EN_PRUEBAS',
      fechaInicio: params.fechaInicio || ahora,
      fechaFin: params.fechaFin || ahora,
      pruebasQA: null,
      creadoEl: ahora,
      ...(incAsociada ? { incidenciaId: incAsociada } : {}),
      ...(diagCodigo ? { diagnosticoId: diagCodigo } : {})
    };
    ordenesActualizadas = [...ordenesExistentes, osGuardada];
  }

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.autor,
    tipo: 'ORDEN_SERVICIO',
    titulo: `Intervención Técnica Registrada (${osGuardada.codigoOS}) — Pase a QA`,
    detalle: `Expediente ${caso.codigoCaso} · Técnico ejecutor: ${osGuardada.tecnicoAsignado}. Esfuerzo: ${osGuardada.horasHombreReales} h-h. Actividades: ${osGuardada.actividadesRealizadas}`,
    referenciaId: osGuardada.codigoOS
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
    ordenesServicio: ordenesActualizadas,
    estado: 'EN_PRUEBAS',
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  try {
    const osSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/ordenes_servicio`, osGuardada.id);
    await setDoc(osSubRef, limpiarUndefined(osGuardada), { merge: true });
  } catch (err) {
    console.warn('Subcolección ordenes_servicio intervención:', err);
  }

  return osGuardada;
};

/**
 * PASO 3.2 (Flujo Interno de Etapa 3): PROTOCOLO DE PRUEBAS DE CALIDAD (QA), DICTAMEN FINAL
 * Y EMISIÓN AUTOMÁTICA DEL INFORME TÉCNICO DE SERVICIO (IT-XXXXXX) VINCULADO AL EXPEDIENTE.
 */
export const registrarPruebasQAyFinalizarOS = async (
  codigoCaso: string,
  osId: string,
  params: {
    actividadesRealizadas?: string;
    piezasReemplazadas?: string;
    superoQA?: boolean;
    resultadoOperatividad?: 'REPARADO' | 'OBSERVADO' | 'INOPERATIVO';
    esIrreparable?: boolean;
    checklist?: PruebasQAChecklist;
    observacionesQA: string;
    horasHombreReales?: number;
    firmaDigitalTecnico?: string;
    tecnico: string;
  }
): Promise<InformeTecnicoCaso | null> => {
  const caso = await getCasoByCodigo(codigoCaso);
  if (!caso) throw new Error(`Caso ${codigoCaso} no encontrado.`);

  const ahora = new Date().toISOString();

  const resultado: 'REPARADO' | 'OBSERVADO' | 'INOPERATIVO' = 
    params.resultadoOperatividad 
      ? params.resultadoOperatividad 
      : (params.superoQA ? 'REPARADO' : 'OBSERVADO');

  const superoQA = resultado === 'REPARADO';
  const esIrreparable = resultado === 'INOPERATIVO';
  const estadoFinalOS = (resultado === 'REPARADO' || resultado === 'INOPERATIVO') 
    ? 'FINALIZADA' 
    : 'EN_EJECUCION';
  const nuevoEstadoCaso: EstadoCaso = resultado;

  const osTarget = (caso.ordenesServicio || []).find(o => o.id === osId || o.codigoOS === osId);
  const informesExistentes = [...(caso.informesTecnicos || [])];
  let informeEmitido: InformeTecnicoCaso | null = null;
  let esNuevoInforme = false;

  if (estadoFinalOS === 'FINALIZADA' && osTarget) {
    const dtVinculado =
      caso.diagnosticos?.find(d => d.codigoDT === osTarget.diagnosticoId || d.id === osTarget.diagnosticoId) ||
      caso.diagnosticos?.[caso.diagnosticos.length - 1];
    const incVinculada =
      osTarget.incidenciaId ||
      dtVinculado?.incidenciaId ||
      caso.incidencias?.[caso.incidencias.length - 1]?.id;

    const existenteIdx = informesExistentes.findIndex(
      it =>
        (osTarget.informeTecnicoId && it.codigoInforme === osTarget.informeTecnicoId) ||
        it.ordenServicioId === osTarget.codigoOS ||
        it.ordenServicioId === osTarget.id
    );

    const codigoInforme =
      existenteIdx >= 0
        ? informesExistentes[existenteIdx].codigoInforme
        : await generarSiguienteCodigoInformeTecnico();

    esNuevoInforme = existenteIdx < 0;

    informeEmitido = {
      id: codigoInforme,
      codigoInforme,
      codigoCaso: caso.codigoCaso,
      ...(incVinculada ? { incidenciaId: incVinculada } : {}),
      ...(dtVinculado ? { diagnosticoId: dtVinculado.codigoDT } : osTarget.diagnosticoId ? { diagnosticoId: osTarget.diagnosticoId } : {}),
      ordenServicioId: osTarget.codigoOS,
      fechaEmision: ahora,
      tecnicoResponsable: osTarget.tecnicoAsignado || params.tecnico,
      dictamenFinal: resultado,
      resumenDiagnostico: dtVinculado?.diagnosticoDetallado || dtVinculado?.hallazgos || '',
      resumenActividades:
        params.actividadesRealizadas?.trim() ||
        osTarget.actividadesRealizadas ||
        osTarget.actividades ||
        'Intervención técnica ejecutada en laboratorio.',
      horasHombre:
        params.horasHombreReales !== undefined
          ? params.horasHombreReales
          : (osTarget.horasHombreReales ?? osTarget.horasHombre ?? 1),
      creadoEl: existenteIdx >= 0 ? informesExistentes[existenteIdx].creadoEl : ahora
    };

    if (existenteIdx >= 0) {
      informesExistentes[existenteIdx] = informeEmitido;
    } else {
      informesExistentes.push(informeEmitido);
    }
  }

  let osActualizadaParaSub: OrdenServicioTrabajo | null = null;

  const ordenesActualizadas = (caso.ordenesServicio || []).map((os) => {
    if (os.id === osId || os.codigoOS === osId) {
      const updated: OrdenServicioTrabajo = {
        ...os,
        codigoCaso: caso.codigoCaso,
        ...(informeEmitido ? { informeTecnicoId: informeEmitido.codigoInforme } : {}),
        actividadesRealizadas: params.actividadesRealizadas?.trim() || os.actividadesRealizadas || os.actividades,
        piezasReemplazadas: params.piezasReemplazadas !== undefined ? params.piezasReemplazadas.trim() : os.piezasReemplazadas,
        horasHombre: params.horasHombreReales !== undefined ? params.horasHombreReales : os.horasHombre,
        horasHombreReales: params.horasHombreReales !== undefined ? params.horasHombreReales : os.horasHombreReales,
        estado: estadoFinalOS as any,
        fechaFin: estadoFinalOS === 'FINALIZADA' ? (os.fechaFin || ahora) : os.fechaFin,
        pruebasQA: {
          superoQA,
          resultadoOperatividad: resultado,
          esIrreparable,
          ...(params.checklist ? { checklist: params.checklist } : {}),
          observacionesQA: params.observacionesQA || (superoQA ? 'Protocolo QA superado satisfactoriamente.' : 'Equipo observado en pruebas de control de calidad.'),
          fechaPruebas: ahora,
          tecnicoQA: params.tecnico
        },
        firmaDigitalTecnico: resultado !== 'OBSERVADO'
          ? (params.firmaDigitalTecnico || os.firmaDigitalTecnico || params.tecnico)
          : null
      };
      osActualizadaParaSub = updated;
      return updated;
    }
    return { ...os, codigoCaso: caso.codigoCaso };
  });

  // Si la OS finalizó, marcar su incidencia origen como RESUELTA
  const incTargetId = (osActualizadaParaSub as OrdenServicioTrabajo | null)?.incidenciaId;
  const incidenciasActualizadas = (caso.incidencias || []).map((inc) => {
    if (estadoFinalOS === 'FINALIZADA' && incTargetId && inc.id === incTargetId) {
      return { ...inc, codigoCaso: caso.codigoCaso, estado: 'RESUELTA' as const };
    }
    return { ...inc, codigoCaso: caso.codigoCaso };
  });

  const nuevosEventosHistorial: ActividadHistorial[] = [
    {
      id: `ACT-${Date.now()}-1`,
      fecha: ahora,
      autor: params.tecnico,
      tipo: 'ORDEN_SERVICIO',
      titulo: `Protocolo QA y Dictamen (${osTarget?.codigoOS || osId}): ${resultado === 'REPARADO' ? 'REPARADO / LISTO' : resultado}`,
      detalle: resultado === 'REPARADO'
        ? `Control QA superado satisfactoriamente en ${caso.codigoCaso}. OS cerrada como Finalizada y Etapa 4 habilitada. Obs: ${params.observacionesQA}`
        : resultado === 'INOPERATIVO'
          ? `Dictamen INOPERATIVO registrado en ${caso.codigoCaso} (daño irreversible o partes discontinuadas). Habilitado sustento de baja o reemplazo. Obs: ${params.observacionesQA}`
          : `Equipo OBSERVADO en protocolo QA; retorna a ajuste técnico en taller. Obs: ${params.observacionesQA}`,
      referenciaId: osTarget?.codigoOS || osId
    }
  ];

  if (informeEmitido && esNuevoInforme) {
    nuevosEventosHistorial.unshift({
      id: `ACT-${Date.now()}-2`,
      fecha: ahora,
      autor: params.tecnico,
      tipo: 'INFORME_TECNICO',
      titulo: `Informe Técnico ${informeEmitido.codigoInforme} Emitido (${caso.codigoCaso})`,
      detalle: `Informe Técnico vinculado al Expediente ${caso.codigoCaso}, Diagnóstico ${informeEmitido.diagnosticoId || 'N/A'} y Orden ${informeEmitido.ordenServicioId || osId}.`,
      referenciaId: informeEmitido.codigoInforme
    });
  }

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
    incidencias: incidenciasActualizadas,
    ordenesServicio: ordenesActualizadas,
    informesTecnicos: informesExistentes,
    estado: nuevoEstadoCaso,
    historial: [...nuevosEventosHistorial, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  if (osActualizadaParaSub) {
    try {
      const osSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/ordenes_servicio`, (osActualizadaParaSub as OrdenServicioTrabajo).id);
      await setDoc(osSubRef, limpiarUndefined(osActualizadaParaSub), { merge: true });
    } catch (err) {
      console.warn('Subcolección ordenes_servicio QA:', err);
    }
  }

  if (informeEmitido) {
    try {
      const itSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/informes_tecnicos`, informeEmitido.codigoInforme);
      await setDoc(itSubRef, limpiarUndefined(informeEmitido), { merge: true });
    } catch (err) {
      console.warn('Subcolección informes_tecnicos:', err);
    }
  }

  return informeEmitido;
};

/**
 * Garantiza que un Caso tenga emitido y persistido su Informe Técnico formal (IT-XXXXXX)
 * vinculado al expediente, incidencia, diagnóstico y orden de servicio antes de descargar PDF.
 */
export const asegurarInformeTecnicoCaso = async (
  codigoCasoOrId: string,
  osTargetId?: string
): Promise<{ caso: Caso; informe: InformeTecnicoCaso }> => {
  const caso = await getCasoByCodigo(codigoCasoOrId);
  if (!caso) throw new Error(`Caso ${codigoCasoOrId} no encontrado.`);

  const ordenes = [...(caso.ordenesServicio || [])];
  const osTarget = osTargetId
    ? ordenes.find(o => o.id === osTargetId || o.codigoOS === osTargetId)
    : ordenes[ordenes.length - 1];

  const informes = [...(caso.informesTecnicos || [])];
  const existente = osTarget
    ? informes.find(
        it =>
          (osTarget.informeTecnicoId && it.codigoInforme === osTarget.informeTecnicoId) ||
          it.ordenServicioId === osTarget.codigoOS ||
          it.ordenServicioId === osTarget.id
      )
    : informes[informes.length - 1];

  if (existente && /^IT-\d{6,}$/i.test(existente.codigoInforme)) {
    return { caso, informe: existente };
  }

  const ahora = new Date().toISOString();
  const codigoInforme = await generarSiguienteCodigoInformeTecnico();

  const dtAsociado = osTarget?.diagnosticoId
    ? caso.diagnosticos?.find(d => d.codigoDT === osTarget.diagnosticoId || d.id === osTarget.diagnosticoId)
    : caso.diagnosticos?.[caso.diagnosticos.length - 1];
  const incAsociada =
    osTarget?.incidenciaId ||
    dtAsociado?.incidenciaId ||
    caso.incidencias?.[caso.incidencias.length - 1]?.id ||
    caso.incidencias?.[0]?.id;

  const dictamen: 'REPARADO' | 'INOPERATIVO' | 'OBSERVADO' =
    osTarget?.pruebasQA?.resultadoOperatividad ||
    (caso.estado === 'INOPERATIVO' ? 'INOPERATIVO' : caso.estado === 'OBSERVADO' ? 'OBSERVADO' : 'REPARADO');

  const nuevoInforme: InformeTecnicoCaso = {
    id: codigoInforme,
    codigoInforme,
    codigoCaso: caso.codigoCaso,
    ...(incAsociada ? { incidenciaId: incAsociada } : {}),
    ...(dtAsociado ? { diagnosticoId: dtAsociado.codigoDT } : {}),
    ...(osTarget ? { ordenServicioId: osTarget.codigoOS } : {}),
    fechaEmision: osTarget?.pruebasQA?.fechaPruebas || osTarget?.fechaFin || caso.entrega?.fechaEntrega || ahora,
    tecnicoResponsable: osTarget?.tecnicoAsignado || dtAsociado?.tecnicoResponsable || 'Especialista de Taller',
    dictamenFinal: dictamen,
    resumenDiagnostico: dtAsociado?.diagnosticoDetallado || dtAsociado?.hallazgos || '',
    resumenActividades:
      osTarget?.actividadesRealizadas ||
      osTarget?.actividades ||
      'Intervención técnica especializada y validación funcional en laboratorio.',
    horasHombre: osTarget?.horasHombreReales ?? osTarget?.horasHombre ?? 1,
    creadoEl: ahora
  };

  const informesActualizados = existente
    ? informes.map(it => (it.id === existente.id ? nuevoInforme : it))
    : [...informes, nuevoInforme];

  const ordenesActualizadas = osTarget
    ? ordenes.map(o =>
        o.codigoOS === osTarget.codigoOS ? { ...o, codigoCaso: caso.codigoCaso, informeTecnicoId: codigoInforme } : o
      )
    : ordenes;

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: nuevoInforme.tecnicoResponsable,
    tipo: 'INFORME_TECNICO',
    titulo: `Informe Técnico ${codigoInforme} Emitido (${caso.codigoCaso})`,
    detalle: `Correlativo oficial ${codigoInforme} vinculado al Expediente ${caso.codigoCaso}${osTarget ? ` y Orden ${osTarget.codigoOS}` : ''}.`,
    referenciaId: codigoInforme
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
    ordenesServicio: ordenesActualizadas,
    informesTecnicos: informesActualizados,
    ...(caso.entrega ? { 'entrega.informeTecnicoId': codigoInforme } : {}),
    historial: [nuevaActividad, ...(caso.historial || [])],
    actualizadoEl: ahora
  }));

  try {
    const itSubRef = doc(db, `${COLECCION_CASOS}/${caso.id}/informes_tecnicos`, codigoInforme);
    await setDoc(itSubRef, limpiarUndefined(nuevoInforme), { merge: true });
  } catch (err) {
    console.warn('Subcolección informes_tecnicos:', err);
  }

  const casoActualizado: Caso = {
    ...caso,
    ordenesServicio: ordenesActualizadas,
    informesTecnicos: informesActualizados,
    entrega: caso.entrega ? { ...caso.entrega, informeTecnicoId: codigoInforme } : caso.entrega,
    historial: [nuevaActividad, ...(caso.historial || [])]
  };

  return { caso: casoActualizado, informe: nuevoInforme };
};

/**
 * PASO 4 (Diagrama): ENTREGA, GARANTÍA Y CIERRE
 * Coordinar entrega, activar garantía si aplica, y vincular el documento técnico de respaldo.
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

  const ultimaOS = caso.ordenesServicio?.[caso.ordenesServicio.length - 1];
  const ultimoIT = caso.informesTecnicos?.[caso.informesTecnicos.length - 1];
  const ultimaConstancia = caso.constancias?.[caso.constancias.length - 1];

  const docRespaldo =
    ultimoIT?.codigoInforme ||
    ultimaOS?.informeTecnicoId ||
    ultimaConstancia?.codigoConstancia ||
    ultimaOS?.codigoOS ||
    caso.codigoCaso;

  const nuevaActividad: ActividadHistorial = {
    id: `ACT-${Date.now()}`,
    fecha: ahora,
    autor: params.responsableEntrega,
    tipo: params.aplicaGarantia ? 'GARANTIA_ACTIVADA' : 'ENTREGA',
    titulo: params.aplicaGarantia 
      ? `Equipo Entregado (${caso.codigoCaso}) - Garantía Activada (${dias} días)` 
      : `Equipo Entregado al Cliente (${caso.codigoCaso})`,
    detalle: `Receptor: ${params.receptorNombre}${params.receptorDniRuc ? ` (DNI/RUC: ${params.receptorDniRuc})` : ''} · Respaldo: ${docRespaldo}. ${params.observaciones}${fechaVence ? `. Garantía vigente hasta ${new Date(fechaVence).toLocaleDateString('es-PE')}` : ''}`,
    referenciaId: docRespaldo
  };

  const nuevaEntrega = {
    fechaEntrega: ahora,
    receptorNombre: params.receptorNombre.trim(),
    receptorDniRuc: params.receptorDniRuc?.trim() || '',
    observaciones: params.observaciones?.trim() || '',
    responsableEntrega: params.responsableEntrega,
    ...(ultimaOS ? { ordenServicioId: ultimaOS.codigoOS } : {}),
    ...(ultimoIT?.codigoInforme || ultimaOS?.informeTecnicoId
      ? { informeTecnicoId: ultimoIT?.codigoInforme || ultimaOS?.informeTecnicoId }
      : {}),
    ...(!ultimaOS && ultimaConstancia ? { constanciaId: ultimaConstancia.codigoConstancia } : {})
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
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
    titulo: `Cierre Definitivo de Expediente ${caso.codigoCaso}`,
    detalle: `Liquidación técnica final aprobada. Expediente ${caso.codigoCaso} cerrado por ${params.firmadoPor}. ${params.observaciones}`,
    referenciaId: caso.codigoCaso
  };

  const docRef = doc(db, COLECCION_CASOS, caso.id);
  await updateDoc(docRef, limpiarUndefined({
    codigoCaso: caso.codigoCaso,
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
 * AUDITORÍA, NORMALIZACIÓN Y ORDENAMIENTO INTEGRAL DE TRAZABILIDAD DE TODOS LOS CASOS:
 * - Garantiza que ningún expediente tenga `codigoCaso` indefinido, duplicado o fuera del estándar `CASO-XXXXXX`.
 * - Estandariza correlativos únicos de 6 dígitos en orden cronológico para:
 *   - Diagnósticos Técnicos (`DT-XXXXXX`)
 *   - Órdenes de Servicio (`OS-XXXXXX`, respetando códigos externos manuales de ERP)
 *   - Informes Técnicos de Servicio (`IT-XXXXXX`)
 *   - Constancias de Atención Simple (`CA-XXXXXX`)
 * - Vincula explícitamente toda la cadena `CASO -> INC -> DT / CA -> OS -> IT -> Entrega`.
 * - Genera automáticamente el `InformeTecnicoCaso` (`IT-XXXXXX`) faltante en todo caso con OS finalizada o reparado/entregado.
 * - 100% idempotente: solo actualiza documentos que presenten diferencias reales y sincroniza `contadores/*`.
 */
export const repararYOrdenarTrazabilidadCasos = async (): Promise<{
  casosRevisados: number;
  casosActualizados: number;
  informesGenerados: number;
}> => {
  try {
    const [casosSnap, ordenesSnap, usuariosLista] = await Promise.all([
      getDocs(collection(db, COLECCION_CASOS)),
      getDocs(collection(db, COLECCION_ORDENES)),
      getUsuariosSistema().catch(() => [])
    ]);

    if (casosSnap.empty) {
      return { casosRevisados: 0, casosActualizados: 0, informesGenerados: 0 };
    }

    // Ordenar todos los expedientes cronológicamente desde el más antiguo al más reciente
    const docsOrdenados = [...casosSnap.docs].sort((a, b) => {
      const da = a.data();
      const dbData = b.data();
      const ta = new Date(da.fechaApertura || da.creadoEl || da.actualizadoEl || 0).getTime();
      const tb = new Date(dbData.fechaApertura || dbData.creadoEl || dbData.actualizadoEl || 0).getTime();
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });

    const usedCasos = new Set<string>();
    const usedDTs = new Set<string>();
    const usedOSs = new Set<string>();
    const usedITs = new Set<string>();
    const usedCAs = new Set<string>();

    let maxCasoNum = 0;
    let maxDTNum = 0;
    let maxOSNum = 0;
    let maxITNum = 0;
    let maxCANum = 0;

    // Registrar numeración previa de ordenes_servicio (colección clásica BaseDT) para no colisionar DTs
    ordenesSnap.docs.forEach((d) => {
      const codigoOrd = String(d.data().codigoDT || d.id || '').trim().toUpperCase();
      const m = codigoOrd.match(/^DT-(\d{6,})$/i);
      if (m) {
        maxDTNum = Math.max(maxDTNum, parseInt(m[1], 10));
      }
    });

    // Pre-escaneo de códigos canónicos de 6 dígitos ya existentes en `casos`
    docsOrdenados.forEach((d) => {
      const data = d.data();
      const candCaso =
        typeof data.codigoCaso === 'string' &&
        data.codigoCaso.trim() &&
        data.codigoCaso.trim().toLowerCase() !== 'undefined'
          ? data.codigoCaso.trim()
          : d.id;
      const mCaso = candCaso.match(/^CASO-(\d+)$/i);
      if (mCaso) {
        maxCasoNum = Math.max(maxCasoNum, parseInt(mCaso[1], 10));
      }

      (data.diagnosticos || []).forEach((dt: any) => {
        const m = String(dt.codigoDT || dt.id || '').match(/^DT-(\d{6,})$/i);
        if (m) maxDTNum = Math.max(maxDTNum, parseInt(m[1], 10));
      });
      (data.ordenesServicio || []).forEach((os: any) => {
        const m = String(os.codigoOS || os.id || '').match(/^OS-(\d{6,})$/i);
        if (m) maxOSNum = Math.max(maxOSNum, parseInt(m[1], 10));
      });
      (data.informesTecnicos || []).forEach((it: any) => {
        const m = String(it.codigoInforme || it.id || '').match(/^IT-(\d{6,})$/i);
        if (m) maxITNum = Math.max(maxITNum, parseInt(m[1], 10));
      });
      (data.constancias || []).forEach((cst: any) => {
        const m = String(cst.codigoConstancia || cst.id || '').match(/^CA-(\d{6,})$/i);
        if (m) maxCANum = Math.max(maxCANum, parseInt(m[1], 10));
      });
    });

    const reservarCodigo = (
      prefijo: 'CASO' | 'DT' | 'OS' | 'IT' | 'CA',
      used: Set<string>,
      incrementar: () => number
    ): string => {
      let candidato = '';
      do {
        const num = incrementar();
        candidato = `${prefijo}-${num.toString().padStart(6, '0')}`;
      } while (used.has(candidato));
      used.add(candidato);
      return candidato;
    };

    let casosActualizados = 0;
    let informesGenerados = 0;

    for (const docSnap of docsOrdenados) {
      const raw = docSnap.data();

      // 1. Resolver `codigoCaso` canónico `CASO-XXXXXX` único
      const rawCodigoStr =
        typeof raw.codigoCaso === 'string' &&
        raw.codigoCaso.trim() &&
        raw.codigoCaso.trim().toLowerCase() !== 'undefined' &&
        raw.codigoCaso.trim().toLowerCase() !== 'null'
          ? raw.codigoCaso.trim()
          : '';
      const baseCasoSource = rawCodigoStr || docSnap.id;
      const mCaso = baseCasoSource.match(/^CASO-(\d+)$/i);

      let codigoCaso = '';
      if (mCaso) {
        const normalizado = `CASO-${parseInt(mCaso[1], 10).toString().padStart(6, '0')}`;
        if (!usedCasos.has(normalizado)) {
          codigoCaso = normalizado;
          usedCasos.add(normalizado);
          maxCasoNum = Math.max(maxCasoNum, parseInt(mCaso[1], 10));
        }
      }
      if (!codigoCaso) {
        codigoCaso = reservarCodigo('CASO', usedCasos, () => ++maxCasoNum);
      }

      const mapRefCodes = new Map<string, string>();
      const fechaBase = raw.fechaApertura || raw.creadoEl || new Date().toISOString();

      // 2. Normalizar Incidencias (INC-001, INC-002... por ciclo del expediente)
      const incidenciasRaw: IncidenciaCaso[] = Array.isArray(raw.incidencias) ? raw.incidencias : [];
      const estadoCasoActual: EstadoCaso = raw.estado || 'ABIERTO';
      const casoEnEtapaResuelta = [
        'REPARADO',
        'INOPERATIVO',
        'ENTREGADO',
        'EN_GARANTIA',
        'EN GARANTÍA',
        'CERRADO',
        'CERRADO_SIN_REPARACION',
        'CERRADO SIN REPARACIÓN'
      ].includes(estadoCasoActual);

      const incidenciasBase: IncidenciaCaso[] =
        incidenciasRaw.length > 0
          ? incidenciasRaw
          : [
              {
                id: 'INC-001',
                codigoINC: 'INC-001',
                codigoCaso,
                fecha: fechaBase,
                reportadoPor: raw.cliente?.contacto || raw.cliente?.razonSocial || 'Recepción',
                descripcion: 'Ingreso técnico registrado en expediente.',
                prioridad: 'MEDIA',
                origen: (raw.origen as OrigenIncidencia) || 'TALLER',
                esReingresoGarantia: false,
                aplicaGarantia: false,
                requiereAnalisisTecnico: (raw.constancias?.length || 0) === 0,
                estado: casoEnEtapaResuelta ? 'RESUELTA' : 'REGISTRADA',
                creadoEl: fechaBase
              }
            ];

      const incidenciasLimpias: IncidenciaCaso[] = incidenciasBase.map((inc, idx) => {
        const codigoINC = `INC-${(idx + 1).toString().padStart(3, '0')}`;
        if (inc.codigoINC && inc.codigoINC !== codigoINC) {
          mapRefCodes.set(inc.codigoINC, codigoINC);
        }
        const estadoInc: IncidenciaCaso['estado'] =
          casoEnEtapaResuelta && idx === incidenciasBase.length - 1
            ? 'RESUELTA'
            : inc.estado || 'REGISTRADA';
        return {
          ...inc,
          id: codigoINC,
          codigoINC,
          codigoCaso,
          estado: estadoInc
        };
      });

      const primeraIncId = incidenciasLimpias[0]?.id || 'INC-001';

      // 3. Normalizar y ordenar Diagnósticos Técnicos (`DT-XXXXXX` global único)
      const diagnosticosRaw: DiagnosticoTecnicoCaso[] = Array.isArray(raw.diagnosticos) ? raw.diagnosticos : [];
      const diagnosticosLimpios: DiagnosticoTecnicoCaso[] = diagnosticosRaw.map((dt, idx) => {
        const oldCode = String(dt.codigoDT || dt.id || '').trim().toUpperCase();
        const m6 = oldCode.match(/^DT-(\d{6,})$/i);
        let nuevoCodigoDT = '';

        if (m6) {
          const formatted = `DT-${parseInt(m6[1], 10).toString().padStart(6, '0')}`;
          if (!usedDTs.has(formatted)) {
            nuevoCodigoDT = formatted;
            usedDTs.add(formatted);
            maxDTNum = Math.max(maxDTNum, parseInt(m6[1], 10));
          }
        }
        if (!nuevoCodigoDT) {
          nuevoCodigoDT = reservarCodigo('DT', usedDTs, () => ++maxDTNum);
        }
        if (oldCode && oldCode !== nuevoCodigoDT) {
          mapRefCodes.set(oldCode, nuevoCodigoDT);
        }
        if (dt.id && dt.id !== nuevoCodigoDT) {
          mapRefCodes.set(dt.id, nuevoCodigoDT);
        }

        const rawIncRef = dt.incidenciaId ? (mapRefCodes.get(dt.incidenciaId) || dt.incidenciaId) : undefined;
        const incAsociada =
          (rawIncRef && incidenciasLimpias.some(i => i.id === rawIncRef) ? rawIncRef : undefined) ||
          incidenciasLimpias[Math.min(idx, incidenciasLimpias.length - 1)]?.id ||
          primeraIncId;
        const tecDt = resolverUsuarioTecnico(dt.tecnicoResponsable, usuariosLista, dt.tecnicoId);

        return {
          ...dt,
          id: nuevoCodigoDT,
          codigoDT: nuevoCodigoDT,
          codigoCaso,
          ...(tecDt.tecnicoId ? { tecnicoId: tecDt.tecnicoId } : {}),
          tecnicoResponsable: tecDt.nombreCompleto,
          incidenciaId: incAsociada
        };
      });

      // 4. Normalizar y ordenar Constancias de Atención Simple (`CA-XXXXXX` global único)
      const constanciasRaw: ConstanciaAtencionSimple[] = Array.isArray(raw.constancias) ? raw.constancias : [];
      const constanciasLimpias: ConstanciaAtencionSimple[] = constanciasRaw.map((cst, idx) => {
        const oldCode = String(cst.codigoConstancia || cst.id || '').trim().toUpperCase();
        const m6 = oldCode.match(/^CA-(\d{6,})$/i);
        let nuevoCodigoCA = '';

        if (m6) {
          const formatted = `CA-${parseInt(m6[1], 10).toString().padStart(6, '0')}`;
          if (!usedCAs.has(formatted)) {
            nuevoCodigoCA = formatted;
            usedCAs.add(formatted);
            maxCANum = Math.max(maxCANum, parseInt(m6[1], 10));
          }
        }
        if (!nuevoCodigoCA) {
          nuevoCodigoCA = reservarCodigo('CA', usedCAs, () => ++maxCANum);
        }
        if (oldCode && oldCode !== nuevoCodigoCA) {
          mapRefCodes.set(oldCode, nuevoCodigoCA);
        }

        const rawIncRef = cst.incidenciaId ? (mapRefCodes.get(cst.incidenciaId) || cst.incidenciaId) : undefined;
        const incAsociada =
          (rawIncRef && incidenciasLimpias.some(i => i.id === rawIncRef) ? rawIncRef : undefined) ||
          incidenciasLimpias[Math.min(idx, incidenciasLimpias.length - 1)]?.id ||
          primeraIncId;
        const incObj = incidenciasLimpias.find(i => i.id === incAsociada) || incidenciasLimpias[0];
        const fechaRefYMD = (incObj?.fecha || cst.fecha || fechaBase).slice(0, 10);
        const tecCst = resolverUsuarioTecnico(cst.tecnicoResponsable, usuariosLista, cst.tecnicoId);

        return {
          ...cst,
          id: nuevoCodigoCA,
          codigoConstancia: nuevoCodigoCA,
          codigoCaso,
          incidenciaId: incAsociada,
          fechaIngreso: cst.fechaIngreso || fechaRefYMD,
          horaIngreso: cst.horaIngreso || '',
          fechaSalida: cst.fechaSalida || (cst.fecha ? cst.fecha.slice(0, 10) : fechaRefYMD),
          horaSalida: cst.horaSalida || '',
          ...(tecCst.tecnicoId ? { tecnicoId: tecCst.tecnicoId } : {}),
          tecnicoResponsable: tecCst.nombreCompleto
        };
      });

      // 5. Normalizar y ordenar Órdenes de Servicio (`OS-XXXXXX` global único o código ERP manual)
      const ordenesRaw: OrdenServicioTrabajo[] = Array.isArray(raw.ordenesServicio) ? raw.ordenesServicio : [];
      const ordenesLimpias: OrdenServicioTrabajo[] = ordenesRaw.map((os, idx) => {
        const oldCode = String(os.codigoOS || os.id || '').trim().toUpperCase();
        const esAutoNumerico = !oldCode || /^OS-\d+$/i.test(oldCode);
        const m6 = oldCode.match(/^OS-(\d{6,})$/i);
        let nuevoCodigoOS = '';

        if (!esAutoNumerico && !usedOSs.has(oldCode)) {
          // Conservar código externo digitado desde SAP/ERP (ej. OS-2026-8910)
          nuevoCodigoOS = oldCode;
          usedOSs.add(oldCode);
        } else if (m6) {
          const formatted = `OS-${parseInt(m6[1], 10).toString().padStart(6, '0')}`;
          if (!usedOSs.has(formatted)) {
            nuevoCodigoOS = formatted;
            usedOSs.add(formatted);
            maxOSNum = Math.max(maxOSNum, parseInt(m6[1], 10));
          }
        }
        if (!nuevoCodigoOS) {
          nuevoCodigoOS = reservarCodigo('OS', usedOSs, () => ++maxOSNum);
        }
        if (oldCode && oldCode !== nuevoCodigoOS) {
          mapRefCodes.set(oldCode, nuevoCodigoOS);
        }
        if (os.id && os.id !== nuevoCodigoOS) {
          mapRefCodes.set(os.id, nuevoCodigoOS);
        }

        const mappedDiagRef = os.diagnosticoId ? (mapRefCodes.get(os.diagnosticoId) || os.diagnosticoId) : undefined;
        const dtAsociado =
          (mappedDiagRef ? diagnosticosLimpios.find(d => d.codigoDT === mappedDiagRef) : undefined) ||
          diagnosticosLimpios[Math.min(idx, Math.max(0, diagnosticosLimpios.length - 1))];

        const mappedIncRef = os.incidenciaId ? (mapRefCodes.get(os.incidenciaId) || os.incidenciaId) : undefined;
        const incAsociada =
          (mappedIncRef && incidenciasLimpias.some(i => i.id === mappedIncRef) ? mappedIncRef : undefined) ||
          dtAsociado?.incidenciaId ||
          incidenciasLimpias[Math.min(idx, incidenciasLimpias.length - 1)]?.id ||
          primeraIncId;
        const tecOs = resolverUsuarioTecnico(os.tecnicoAsignado, usuariosLista, os.tecnicoId);

        return {
          ...os,
          id: nuevoCodigoOS,
          codigoOS: nuevoCodigoOS,
          codigoCaso,
          ...(tecOs.tecnicoId ? { tecnicoId: tecOs.tecnicoId } : {}),
          tecnicoAsignado: tecOs.nombreCompleto,
          incidenciaId: incAsociada,
          ...(dtAsociado ? { diagnosticoId: dtAsociado.codigoDT } : {})
        };
      });

      // 6. Normalizar Informes Técnicos existentes y generar los faltantes (`IT-XXXXXX`)
      const informesRaw: InformeTecnicoCaso[] = Array.isArray(raw.informesTecnicos) ? raw.informesTecnicos : [];
      const informesLimpios: InformeTecnicoCaso[] = informesRaw.map((it, idx) => {
        const oldCode = String(it.codigoInforme || it.id || '').trim().toUpperCase();
        const m6 = oldCode.match(/^IT-(\d{6,})$/i);
        let nuevoCodigoIT = '';

        if (m6) {
          const formatted = `IT-${parseInt(m6[1], 10).toString().padStart(6, '0')}`;
          if (!usedITs.has(formatted)) {
            nuevoCodigoIT = formatted;
            usedITs.add(formatted);
            maxITNum = Math.max(maxITNum, parseInt(m6[1], 10));
          }
        }
        if (!nuevoCodigoIT) {
          nuevoCodigoIT = reservarCodigo('IT', usedITs, () => ++maxITNum);
        }
        if (oldCode && oldCode !== nuevoCodigoIT) {
          mapRefCodes.set(oldCode, nuevoCodigoIT);
        }

        const mappedOsRef = it.ordenServicioId ? (mapRefCodes.get(it.ordenServicioId) || it.ordenServicioId) : undefined;
        const osAsociada =
          (mappedOsRef ? ordenesLimpias.find(o => o.codigoOS === mappedOsRef) : undefined) ||
          ordenesLimpias[Math.min(idx, Math.max(0, ordenesLimpias.length - 1))];

        const mappedDtRef = it.diagnosticoId ? (mapRefCodes.get(it.diagnosticoId) || it.diagnosticoId) : undefined;
        const dtAsociado =
          (mappedDtRef ? diagnosticosLimpios.find(d => d.codigoDT === mappedDtRef) : undefined) ||
          (osAsociada?.diagnosticoId ? diagnosticosLimpios.find(d => d.codigoDT === osAsociada.diagnosticoId) : undefined) ||
          diagnosticosLimpios[Math.min(idx, Math.max(0, diagnosticosLimpios.length - 1))];

        const incAsociada =
          (it.incidenciaId ? (mapRefCodes.get(it.incidenciaId) || it.incidenciaId) : undefined) ||
          osAsociada?.incidenciaId ||
          dtAsociado?.incidenciaId ||
          primeraIncId;
        const tecIt = resolverUsuarioTecnico(
          it.tecnicoResponsable,
          usuariosLista,
          it.tecnicoId || osAsociada?.tecnicoId || dtAsociado?.tecnicoId
        );

        return {
          ...it,
          id: nuevoCodigoIT,
          codigoInforme: nuevoCodigoIT,
          codigoCaso,
          ...(tecIt.tecnicoId ? { tecnicoId: tecIt.tecnicoId } : {}),
          tecnicoResponsable: tecIt.nombreCompleto,
          incidenciaId: incAsociada,
          ...(dtAsociado ? { diagnosticoId: dtAsociado.codigoDT } : {}),
          ...(osAsociada ? { ordenServicioId: osAsociada.codigoOS } : {})
        };
      });

      const nuevosEventosIT: ActividadHistorial[] = [];

      // Para toda OS finalizada (o en caso ya reparado/entregado/cerrado), asegurar Informe Técnico IT-XXXXXX
      const casoFinalizadoTecnico = [
        'REPARADO',
        'INOPERATIVO',
        'ENTREGADO',
        'EN_GARANTIA',
        'EN GARANTÍA',
        'CERRADO'
      ].includes(estadoCasoActual);

      for (let i = 0; i < ordenesLimpias.length; i++) {
        const os = ordenesLimpias[i];
        const requiereIT = os.estado === 'FINALIZADA' || (casoFinalizadoTecnico && i === ordenesLimpias.length - 1);

        let itVinculado = informesLimpios.find(
          it =>
            it.ordenServicioId === os.codigoOS ||
            (os.informeTecnicoId &&
              (it.codigoInforme === os.informeTecnicoId ||
                it.codigoInforme === mapRefCodes.get(os.informeTecnicoId)))
        );

        if (!itVinculado && requiereIT) {
          const codigoIT = reservarCodigo('IT', usedITs, () => ++maxITNum);
          const dtAsociado = os.diagnosticoId
            ? diagnosticosLimpios.find(d => d.codigoDT === os.diagnosticoId)
            : diagnosticosLimpios[diagnosticosLimpios.length - 1];
          const fechaEmision =
            os.pruebasQA?.fechaPruebas ||
            os.fechaFin ||
            raw.entrega?.fechaEntrega ||
            raw.actualizadoEl ||
            fechaBase;
          const dictamen: 'REPARADO' | 'INOPERATIVO' | 'OBSERVADO' =
            os.pruebasQA?.resultadoOperatividad ||
            (estadoCasoActual === 'INOPERATIVO' ? 'INOPERATIVO' : 'REPARADO');

          itVinculado = {
            id: codigoIT,
            codigoInforme: codigoIT,
            codigoCaso,
            incidenciaId: os.incidenciaId || primeraIncId,
            ...(dtAsociado ? { diagnosticoId: dtAsociado.codigoDT } : {}),
            ordenServicioId: os.codigoOS,
            fechaEmision,
            tecnicoResponsable: os.tecnicoAsignado || dtAsociado?.tecnicoResponsable || 'Especialista de Taller',
            dictamenFinal: dictamen,
            resumenDiagnostico: dtAsociado?.diagnosticoDetallado || dtAsociado?.hallazgos || '',
            resumenActividades:
              os.actividadesRealizadas ||
              os.actividades ||
              'Intervención técnica ejecutada en laboratorio.',
            horasHombre: os.horasHombreReales ?? os.horasHombre ?? 1,
            creadoEl: fechaEmision
          };
          informesLimpios.push(itVinculado);
          informesGenerados++;

          nuevosEventosIT.push({
            id: `ACT-IT-${codigoIT}`,
            fecha: fechaEmision,
            autor: itVinculado.tecnicoResponsable,
            tipo: 'INFORME_TECNICO',
            titulo: `Informe Técnico ${codigoIT} Vinculado (${codigoCaso})`,
            detalle: `Informe Técnico oficial vinculado a Expediente ${codigoCaso}${dtAsociado ? `, Diagnóstico ${dtAsociado.codigoDT}` : ''} y Orden ${os.codigoOS}.`,
            referenciaId: codigoIT
          });
        }

        if (itVinculado) {
          ordenesLimpias[i] = {
            ...os,
            informeTecnicoId: itVinculado.codigoInforme,
            estado: requiereIT ? 'FINALIZADA' : os.estado
          };
        }
      }

      // Caso especial: expediente finalizado por ruta técnica sin constancia ni OS registrada pero con DT
      if (
        casoFinalizadoTecnico &&
        ordenesLimpias.length === 0 &&
        constanciasLimpias.length === 0 &&
        informesLimpios.length === 0 &&
        diagnosticosLimpios.length > 0
      ) {
        const ultimoDT = diagnosticosLimpios[diagnosticosLimpios.length - 1];
        const codigoIT = reservarCodigo('IT', usedITs, () => ++maxITNum);
        const fechaEmision = raw.entrega?.fechaEntrega || raw.actualizadoEl || fechaBase;
        const nuevoIT: InformeTecnicoCaso = {
          id: codigoIT,
          codigoInforme: codigoIT,
          codigoCaso,
          incidenciaId: ultimoDT.incidenciaId || primeraIncId,
          diagnosticoId: ultimoDT.codigoDT,
          fechaEmision,
          tecnicoResponsable: ultimoDT.tecnicoResponsable || 'Especialista de Taller',
          dictamenFinal: estadoCasoActual === 'INOPERATIVO' ? 'INOPERATIVO' : 'REPARADO',
          resumenDiagnostico: ultimoDT.diagnosticoDetallado || ultimoDT.hallazgos || '',
          resumenActividades:
            ultimoDT.solucionPropuesta ||
            ultimoDT.recomendaciones ||
            'Evaluación e intervención técnica en laboratorio.',
          horasHombre: 1,
          creadoEl: fechaEmision
        };
        informesLimpios.push(nuevoIT);
        informesGenerados++;
      }

      // Vincular reingresos en garantía con su intervención previa si faltaba
      for (let i = 1; i < incidenciasLimpias.length; i++) {
        const inc = incidenciasLimpias[i];
        if (inc.esReingresoGarantia && !inc.vinculoIntervencionPrevia) {
          const prevRef =
            informesLimpios[0]?.codigoInforme ||
            ordenesLimpias[0]?.codigoOS ||
            diagnosticosLimpios[0]?.codigoDT ||
            constanciasLimpias[0]?.codigoConstancia;
          if (prevRef) {
            incidenciasLimpias[i] = { ...inc, vinculoIntervencionPrevia: prevRef };
          }
        }
      }

      // 7. Vincular `entrega` con OS / IT / CA del expediente
      let entregaLimpia = raw.entrega || null;
      if (entregaLimpia) {
        const ultimaOS = ordenesLimpias[ordenesLimpias.length - 1];
        const ultimoIT = informesLimpios[informesLimpios.length - 1];
        const ultimaCA = constanciasLimpias[constanciasLimpias.length - 1];
        entregaLimpia = {
          ...entregaLimpia,
          ...(ultimaOS ? { ordenServicioId: ultimaOS.codigoOS } : {}),
          ...(ultimoIT ? { informeTecnicoId: ultimoIT.codigoInforme } : {}),
          ...(!ultimaOS && ultimaCA ? { constanciaId: ultimaCA.codigoConstancia } : {})
        };
      }

      // 8. Actualizar referencias antiguas en el historial si cambiaron códigos cortos (ej. OS-001 -> OS-000001)
      const historialRaw: ActividadHistorial[] = Array.isArray(raw.historial) ? raw.historial : [];
      const historialActualizado: ActividadHistorial[] = [
        ...nuevosEventosIT,
        ...historialRaw.map((act) => {
          const nuevoRef = act.referenciaId ? (mapRefCodes.get(act.referenciaId) || act.referenciaId) : act.referenciaId;
          let nuevoTitulo = act.titulo || '';
          let nuevoDetalle = act.detalle || '';
          mapRefCodes.forEach((newVal, oldVal) => {
            if (oldVal && newVal && oldVal !== newVal) {
              nuevoTitulo = nuevoTitulo.split(oldVal).join(newVal);
              nuevoDetalle = nuevoDetalle.split(oldVal).join(newVal);
            }
          });
          return {
            ...act,
            titulo: nuevoTitulo,
            detalle: nuevoDetalle,
            ...(nuevoRef ? { referenciaId: nuevoRef } : {})
          };
        })
      ];

      // Comparación determinística para escribir SOLO si el documento requiere cambios
      const snapshotAntes = JSON.stringify(
        limpiarUndefined({
          codigoCaso: raw.codigoCaso ?? null,
          incidencias: raw.incidencias ?? [],
          diagnosticos: raw.diagnosticos ?? [],
          ordenesServicio: raw.ordenesServicio ?? [],
          informesTecnicos: raw.informesTecnicos ?? [],
          constancias: raw.constancias ?? [],
          entrega: raw.entrega ?? null,
          historial: raw.historial ?? []
        })
      );

      const snapshotDespues = JSON.stringify(
        limpiarUndefined({
          codigoCaso,
          incidencias: incidenciasLimpias,
          diagnosticos: diagnosticosLimpios,
          ordenesServicio: ordenesLimpias,
          informesTecnicos: informesLimpios,
          constancias: constanciasLimpias,
          entrega: entregaLimpia,
          historial: historialActualizado
        })
      );

      if (snapshotAntes !== snapshotDespues) {
        await updateDoc(
          doc(db, COLECCION_CASOS, docSnap.id),
          limpiarUndefined({
            codigoCaso,
            incidencias: incidenciasLimpias,
            diagnosticos: diagnosticosLimpios,
            ordenesServicio: ordenesLimpias,
            informesTecnicos: informesLimpios,
            constancias: constanciasLimpias,
            entrega: entregaLimpia,
            historial: historialActualizado
          })
        );
        casosActualizados++;
      }
    }

    // Sincronizar documentos de contadores globales con los máximos vigentes
    const ahora = new Date().toISOString();
    const contadoresSync: Array<{ id: string; prefijo: string; max: number }> = [
      { id: 'casos', prefijo: 'CASO', max: maxCasoNum },
      { id: 'diagnosticos', prefijo: 'DT', max: maxDTNum },
      { id: 'ordenes_trabajo', prefijo: 'OS', max: maxOSNum },
      { id: 'informes_tecnicos', prefijo: 'IT', max: maxITNum },
      { id: 'constancias', prefijo: 'CA', max: maxCANum }
    ];

    await Promise.all(
      contadoresSync.map(async (cnt) => {
        if (cnt.max <= 0) return;
        const cRef = doc(db, 'contadores', cnt.id);
        const cSnap = await getDoc(cRef);
        const guardado = cSnap.exists() ? (cSnap.data()?.ultimoNumero || 0) : 0;
        if (cnt.max > guardado) {
          await setDoc(
            cRef,
            { ultimoNumero: cnt.max, prefijo: cnt.prefijo, actualizadoEl: ahora },
            { merge: true }
          );
        }
      })
    );

    return {
      casosRevisados: docsOrdenados.length,
      casosActualizados,
      informesGenerados
    };
  } catch (err) {
    console.error('Error al auditar y ordenar trazabilidad de casos:', err);
    return { casosRevisados: 0, casosActualizados: 0, informesGenerados: 0 };
  }
};

let promesaAuditoriaSesion: Promise<{
  casosRevisados: number;
  casosActualizados: number;
  informesGenerados: number;
}> | null = null;

/**
 * Ejecuta una vez por sesión de cliente la auditoría y ordenamiento automático de trazabilidad.
 */
export const asegurarTrazabilidadOrdenadaEnSesion = () => {
  if (!promesaAuditoriaSesion) {
    promesaAuditoriaSesion = repararYOrdenarTrazabilidadCasos().catch((err) => {
      promesaAuditoriaSesion = null;
      throw err;
    });
  }
  return promesaAuditoriaSesion;
};

/**
 * MIGRACIÓN / SEEDER TRANSPARENTE:
 * Sincroniza órdenes existentes en 'ordenes_servicio' hacia 'casos' si aún no tienen expediente,
 * y ordena de inmediato toda la cadena de trazabilidad documental.
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

      const codigoCaso = await generarSiguienteCodigoCaso();
      const ahora = ord.actualizadoEl || ord.creadoEl || new Date().toISOString();

      const estadoCaso: EstadoCaso = 
        ord.estadoGeneral === 'ENTREGADO' ? 'ENTREGADO' :
        ord.estadoGeneral === 'REPARADO' ? 'REPARADO' :
        ord.estadoGeneral === 'EN_REPARACION' ? 'EN_REPARACION' :
        ord.estadoGeneral === 'APROBADO_PARA_REPARACION' ? 'APROBADO_PARA_REPARACION' :
        ord.estadoGeneral === 'DIAGNOSTICADO' ? 'DIAGNOSTICADO' :
        ord.estadoGeneral === 'EN_DIAGNOSTICO' ? 'EN_DIAGNOSTICO' :
        ord.estadoGeneral === 'CERRADO_SIN_REPARACION' ? 'CERRADO_SIN_REPARACION' :
        'ABIERTO';

      const dtCode =
        ord.codigoDT && /^DT-\d{6,}$/i.test(ord.codigoDT)
          ? ord.codigoDT.toUpperCase()
          : await generarSiguienteCodigoDTGlobal();

      const tieneOS = Boolean(ord.intervencion?.actividadesRealizadas);
      const osCode = tieneOS ? await generarSiguienteCodigoOSGlobal() : '';
      const itCode =
        tieneOS && (estadoCaso === 'ENTREGADO' || estadoCaso === 'REPARADO')
          ? await generarSiguienteCodigoInformeTecnico()
          : '';

      const nuevoCaso: Caso = {
        id: codigoCaso,
        codigoCaso,
        estado: estadoCaso,
        origen: ord.origen || ord.ingreso?.origen || 'TALLER',
        contratoAlquiler: ord.contratoAlquiler || ord.ingreso?.contratoAlquiler || '',
        cliente: ord.ingreso?.cliente || { razonSocial: 'Cliente General', ruc: '00000000000', contacto: '' },
        equipo: ord.ingreso?.equipo || { tipoEquipo: 'Equipo', marca: '', modelo: '', numeroSerie: serie },
        responsableApertura: ord.ingreso?.registradoPor || 'Sistema',
        fechaApertura: ord.ingreso?.fechaIngreso || ahora,
        fechaCierre: ord.cierre?.fechaEntrega || null,
        incidencias: [
          {
            id: 'INC-001',
            codigoINC: 'INC-001',
            codigoCaso,
            fecha: ord.ingreso?.fechaIngreso || ahora,
            reportadoPor: ord.ingreso?.cliente?.contacto || 'Recepción',
            descripcion: ord.ingreso?.fallaReportada || 'Falla no especificada',
            prioridad: 'MEDIA',
            origen: ord.origen || ord.ingreso?.origen || 'TALLER',
            esReingresoGarantia: false,
            aplicaGarantia: false,
            requiereAnalisisTecnico: true,
            estado: estadoCaso === 'ENTREGADO' || estadoCaso === 'REPARADO' ? 'RESUELTA' : 'EN_ATENCION',
            creadoEl: ahora
          }
        ],
        diagnosticos: ord.diagnostico?.diagnosticoDetallado ? [
          {
            id: dtCode,
            codigoDT: dtCode,
            codigoCaso,
            incidenciaId: 'INC-001',
            fecha: ord.diagnostico.fechaDiagnostico || ahora,
            tecnicoResponsable: ord.diagnostico.tecnicoDiagnostico || 'Área Técnica',
            tipoFalla: ord.diagnostico.tipoFalla || 'HARDWARE',
            hallazgos: ord.diagnostico.danosFisicos || 'Evaluación de taller',
            diagnosticoDetallado: ord.diagnostico.diagnosticoDetallado,
            requiereRepuestos: Boolean(ord.diagnostico.requiereRepuestos),
            repuestosRequeridos: ord.diagnostico.repuestosRequeridos || [],
            estado: tieneOS ? 'APROBADO' : 'CONCLUIDO',
            creadoEl: ahora
          }
        ] : [],
        ordenesServicio: tieneOS ? [
          {
            id: osCode,
            codigoOS: osCode,
            codigoCaso,
            incidenciaId: 'INC-001',
            ...(ord.diagnostico?.diagnosticoDetallado ? { diagnosticoId: dtCode } : {}),
            ...(itCode ? { informeTecnicoId: itCode } : {}),
            tipo: 'CORRECTIVA',
            tecnicoAsignado: ord.intervencion.tecnicoAsignado || 'Técnico',
            actividades: ord.intervencion.actividadesRealizadas || '',
            actividadesRealizadas: ord.intervencion.actividadesRealizadas || '',
            horasHombre: ord.intervencion.horasHombre || 1,
            horasHombreReales: ord.intervencion.horasHombre || 1,
            estado: 'FINALIZADA',
            creadoEl: ahora
          }
        ] : [],
        informesTecnicos: itCode ? [
          {
            id: itCode,
            codigoInforme: itCode,
            codigoCaso,
            incidenciaId: 'INC-001',
            ...(ord.diagnostico?.diagnosticoDetallado ? { diagnosticoId: dtCode } : {}),
            ordenServicioId: osCode,
            fechaEmision: ord.cierre?.fechaEntrega || ahora,
            tecnicoResponsable: ord.intervencion.tecnicoAsignado || 'Técnico',
            dictamenFinal: 'REPARADO',
            resumenDiagnostico: ord.diagnostico?.diagnosticoDetallado || '',
            resumenActividades: ord.intervencion.actividadesRealizadas || '',
            horasHombre: ord.intervencion.horasHombre || 1,
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
            titulo: `Expediente ${codigoCaso} creado a partir de ${dtCode}`,
            detalle: `Trazabilidad migrada con estado ${ord.estadoGeneral}`,
            referenciaId: codigoCaso
          }
        ],
        creadoEl: ord.creadoEl || ahora,
        actualizadoEl: ord.actualizadoEl || ahora
      };

      await setDoc(doc(db, COLECCION_CASOS, codigoCaso), limpiarUndefined(nuevoCaso));
      seriesConCaso.add(serie);
      migrados++;
    }

    await repararYOrdenarTrazabilidadCasos();
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

