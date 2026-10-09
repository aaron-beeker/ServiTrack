import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Caso, ConstanciaAtencionSimple } from '@/types';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

/**
 * Generación de CONSTANCIA DE ATENCIÓN (Ruta 2A - Soporte Simple)
 * Acredita soporte técnico menor o preventivo (reinicio, configuración, limpieza, soporte simple)
 * sin requerir diagnóstico formal ni cotización de repuestos.
 */
export const generarConstanciaAtencionPDF = (caso: Caso, constancia: ConstanciaAtencionSimple) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  const primaryColor: [number, number, number] = [35, 105, 161]; // #2369A1 Azul MUR
  const headerColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const textColor: [number, number, number] = [51, 65, 85]; // Slate 700

  // 1. Cabecera Corporativa
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('MUR TECNOLOGIA S.A.C.', 14, 18);

  doc.setFontSize(8.5);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text('RUC: 20603786301  |  Soporte de Hardware y Sistemas', 14, 23);
  doc.text('Av. Alfredo Benavides 3082, Of. 503, Miraflores - Lima', 14, 27);
  doc.text('Tel: (01) 640-9200  |  soporte@murtecnologia.com', 14, 31);

  // Recuadro de Título de la Constancia
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`CONSTANCIA DE ATENCIÓN TÉCNICA`, 112, 18);

  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38);
  doc.text(`N° ${constancia.codigoConstancia}`, 112, 23);

  doc.setFontSize(8.5);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Expediente: ${caso.codigoCaso}`, 112, 28);
  if (caso.contratoAlquiler) {
    doc.text(`Contrato: ${caso.contratoAlquiler}`, 112, 32);
  }

  const safeFormatDate = (val: string | null | undefined) => {
    if (!val) return 'N/A';
    try {
      return format(new Date(val), 'dd/MM/yyyy HH:mm');
    } catch {
      return String(val);
    }
  };

  // 2. Tabla Datos de Cliente y Activo
  autoTable(doc, {
    startY: 37,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    head: [['DATOS DEL CLIENTE', 'INFORMACIÓN DEL ACTIVO / EQUIPO']],
    body: [
      [
        `Razón Social: ${caso.cliente.razonSocial}\nRUC: ${caso.cliente.ruc}\nContacto: ${caso.cliente.contacto || 'N/A'}\nTeléfono: ${caso.cliente.telefono || 'N/A'}`,
        `Equipo: ${caso.equipo.tipoEquipo}\nMarca / Modelo: ${caso.equipo.marca} ${caso.equipo.modelo}\nNúmero de Serie: ${caso.equipo.numeroSerie}\nFecha Atención: ${safeFormatDate(constancia.fecha)}`
      ]
    ],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: textColor }
  });

  // 3. Tabla Detalle de la Atención Simple
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    theme: 'grid',
    headStyles: { fillColor: headerColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    head: [['CONCEPTO / EVALUACIÓN', 'DETALLE REGISTRADO EN ATENCIÓN']],
    body: [
      ['Motivo de Atención', constancia.motivoSoporte],
      ['Actividades Ejecutadas', constancia.actividadesRealizadas],
      ['Resultado Técnico', constancia.resultado],
      ['Técnico Responsable', constancia.tecnicoResponsable],
      ['Tipificación', 'SOPORTE MENOR / ATENCIÓN INMEDIATA (Sin requerimiento de repuestos)']
    ],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: textColor },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 }
    }
  });

  // 4. Cláusula de Conformidad
  const posY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'La presente constancia acredita la intervención técnica inmediata o preventiva descrita precedentemente, dejando constancia de la operatividad del activo.',
    14,
    posY,
    { maxWidth: 180 }
  );

  // 5. Bloques de Firmas
  const firmasY = posY + 32;

  // Firma Técnico
  doc.setDrawColor(148, 163, 184);
  doc.line(25, firmasY, 85, firmasY);
  doc.setFontSize(8.5);
  doc.setTextColor(...headerColor);
  doc.setFont('helvetica', 'bold');
  doc.text('TÉCNICO EJECUTOR', 55, firmasY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(constancia.tecnicoResponsable, 55, firmasY + 8, { align: 'center' });
  doc.text('MUR Tecnología S.A.C.', 55, firmasY + 12, { align: 'center' });

  // Firma Cliente / Receptor
  doc.line(125, firmasY, 185, firmasY);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFORMIDAD CLIENTE', 155, firmasY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(caso.cliente.contacto || caso.cliente.razonSocial, 155, firmasY + 8, { align: 'center' });
  doc.text(`RUC: ${caso.cliente.ruc}`, 155, firmasY + 12, { align: 'center' });

  // Guardar / Descargar PDF
  doc.save(`Constancia_${constancia.codigoConstancia}_${caso.equipo.numeroSerie}.pdf`);
};
