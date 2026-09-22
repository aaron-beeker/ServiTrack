/**
 * Script de inicialización y migración para Firebase Cloud Firestore
 * Proyecto: Sistema Web de Control de Atenciones Técnicas (SRT) - MUR Tecnología S.A.C.
 * Ejecuta: node seed_firestore.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 1. Colección Maestra: repuestos
const repuestosData = [
  {
    id: "M15626-001",
    descripcion: "SPS-DC IN CONNECTOR",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 5,
    activo: true
  },
  {
    id: "49Z77UC-KB",
    descripcion: "TECLADO RETROILUMINADO SPANISH",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 8,
    activo: true
  },
  {
    id: "TP-HP840G8",
    descripcion: "TOUCHPAD SYNAPTICS CLICKPAD",
    marca: "HP",
    modeloCompatible: "EliteBook 840 G8",
    categoria: "Hardware",
    stock: 3,
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

// 2. Colección Maestra: usuarios
const usuariosData = [
  {
    id: "beeker.valdez",
    nombreCompleto: "Beeker Aarón Valdéz Mattos",
    correo: "aarón.valdez@murtecnologia.com",
    rol: "ADMIN",
    cargo: "Practicante Full-Stack / Operaciones",
    activo: true
  },
  {
    id: "kevin.tecnico",
    nombreCompleto: "Kevin Quispe",
    correo: "kevin.soporte@murtecnologia.com",
    rol: "TECNICO",
    cargo: "Técnico de Campo y Taller",
    activo: true
  }
];

// 3. Colección Transaccional Principal: ordenes_servicio
// Datos reales migrados desde BaseDT de Excel
const ordenesData = [
  {
    codigoDT: "DT-000003",
    estadoGeneral: "EN_DIAGNOSTICO",
    creadoEl: "2026-08-21T09:00:00Z",
    actualizadoEl: "2026-09-14T10:00:00Z",
    ingreso: {
      fechaIngreso: "2026-08-21T09:00:00Z",
      registradoPor: "kevin.soporte@murtecnologia.com",
      cliente: {
        razonSocial: "OXXO S.A.C.",
        ruc: "20602743960",
        contacto: "Leonidas Cisneros Simbron",
        telefono: "992011409",
        correo: "leonidasc.simbron@oxxo.com"
      },
      equipo: {
        tipoEquipo: "Laptop",
        marca: "HP",
        modelo: "EliteBook 840 G8",
        numeroSerie: "5CG3013CXN",
        partNumber: "49Z77UC#ABM"
      },
      fallaReportada: "El touchpad no registra la función de clic ni desplazamiento."
    },
    diagnostico: {
      fechaDiagnostico: "2026-09-08T11:00:00Z",
      tecnicoDiagnostico: "Beeker Aarón Valdéz Mattos",
      tipoFalla: "HARDWARE",
      diagnosticoDetallado: "Cable flex de conexión del Clickpad se encuentra sulfatado y presenta pines desgastados.",
      danosFisicos: "Equipo operativo estéticamente, desgaste leve en tapa inferior.",
      repuestosRequeridos: [
        {
          partNumber: "TP-HP840G8",
          descripcion: "TOUCHPAD SYNAPTICS CLICKPAD",
          cantidad: 1
        }
      ]
    },
    intervencion: {
      fechaIntervencion: null,
      tecnicoAsignado: "Kevin Quispe",
      actividadesRealizadas: null,
      horasHombre: 0,
      estadoReparacion: null
    },
    cierre: {
      fechaEntrega: null,
      lugarEntrega: "Taller MUR Tecnología",
      observacionesFinales: null,
      constanciaGenerada: false,
      urlPdf: null
    }
  },
  {
    codigoDT: "DT-000004",
    estadoGeneral: "REGISTRADO",
    creadoEl: "2026-08-21T09:30:00Z",
    actualizadoEl: "2026-08-21T09:30:00Z",
    ingreso: {
      fechaIngreso: "2026-08-21T09:30:00Z",
      registradoPor: "kevin.soporte@murtecnologia.com",
      cliente: {
        razonSocial: "OXXO S.A.C.",
        ruc: "20602743960",
        contacto: "Leonidas Cisneros Simbron",
        telefono: "992011409",
        correo: "leonidasc.simbron@oxxo.com"
      },
      equipo: {
        tipoEquipo: "Laptop",
        marca: "HP",
        modelo: "EliteBook 840 G8",
        numeroSerie: "5CG3013D4X",
        partNumber: "49Z77UC#ABM"
      },
      fallaReportada: "Presenta falla en el teclado; el botón de encendido no opera y touchpad registra fallas."
    },
    diagnostico: {
      fechaDiagnostico: null,
      tecnicoDiagnostico: null,
      tipoFalla: null,
      diagnosticoDetallado: null,
      danosFisicos: null,
      repuestosRequeridos: []
    },
    intervencion: {
      fechaIntervencion: null,
      tecnicoAsignado: null,
      actividadesRealizadas: null,
      horasHombre: 0,
      estadoReparacion: null
    },
    cierre: {
      fechaEntrega: null,
      lugarEntrega: "Taller MUR Tecnología",
      observacionesFinales: null,
      constanciaGenerada: false,
      urlPdf: null
    }
  },
  {
    codigoDT: "DT-000005",
    estadoGeneral: "EN_DIAGNOSTICO",
    creadoEl: "2026-08-21T10:00:00Z",
    actualizadoEl: "2026-09-09T15:30:00Z",
    ingreso: {
      fechaIngreso: "2026-08-21T10:00:00Z",
      registradoPor: "kevin.soporte@murtecnologia.com",
      cliente: {
        razonSocial: "OXXO S.A.C.",
        ruc: "20602743960",
        contacto: "Leonidas Cisneros Simbron",
        telefono: "992011409",
        correo: "leonidasc.simbron@oxxo.com"
      },
      equipo: {
        tipoEquipo: "Laptop",
        marca: "HP",
        modelo: "EliteBook 840 G8",
        numeroSerie: "5CG3013D1Q",
        partNumber: "49Z77UC#ABM"
      },
      fallaReportada: "Presenta daño en el puerto de alimentación del cargador y cruce en teclado."
    },
    diagnostico: {
      fechaDiagnostico: "2026-09-09T14:00:00Z",
      tecnicoDiagnostico: "Beeker Aarón Valdéz Mattos",
      tipoFalla: "HARDWARE",
      diagnosticoDetallado: "Jack de energía DC-IN quebrado con pines doblados haciendo falso contacto.",
      danosFisicos: "Hundimiento en borde lateral derecho cerca al conector.",
      repuestosRequeridos: [
        {
          partNumber: "M15626-001",
          descripcion: "SPS-DC IN CONNECTOR",
          cantidad: 1
        }
      ]
    },
    intervencion: {
      fechaIntervencion: null,
      tecnicoAsignado: "Kevin Quispe",
      actividadesRealizadas: null,
      horasHombre: 0,
      estadoReparacion: null
    },
    cierre: {
      fechaEntrega: null,
      lugarEntrega: "Taller MUR Tecnología",
      observacionesFinales: null,
      constanciaGenerada: false,
      urlPdf: null
    }
  }
];

async function seedFirestore() {
  console.log("Iniciando carga de colecciones en Firebase Firestore...");

  // 1. Cargar repuestos
  console.log("-> Poblando colección 'repuestos'...");
  for (const item of repuestosData) {
    const { id, ...data } = item;
    await db.collection("repuestos").doc(id).set(data, { merge: true });
  }
  console.log(`✓ ${repuestosData.length} repuestos cargados.`);

  // 2. Cargar usuarios
  console.log("-> Poblando colección 'usuarios'...");
  for (const user of usuariosData) {
    const { id, ...data } = user;
    await db.collection("usuarios").doc(id).set(data, { merge: true });
  }
  console.log(`✓ ${usuariosData.length} usuarios cargados.`);

  // 3. Cargar ordenes_servicio
  console.log("-> Poblando colección 'ordenes_servicio' con datos de BaseDT...");
  for (const orden of ordenesData) {
    await db.collection("ordenes_servicio").doc(orden.codigoDT).set(orden, { merge: true });
  }
  console.log(`✓ ${ordenesData.length} órdenes técnicas creadas.`);

  console.log("\n=======================================================");
  console.log("¡Carga completada con éxito en Firebase Cloud Firestore!");
  console.log("=======================================================");
  process.exit(0);
}

seedFirestore().catch((err) => {
  console.error("Error al poblar Firestore:", err);
  process.exit(1);
});