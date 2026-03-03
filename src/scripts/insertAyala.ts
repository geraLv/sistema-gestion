import { supabase } from '../db';
import fs from 'fs';
// @ts-ignore
import pdfLib from 'pdf-parse';
const { PDFParse } = pdfLib;

const FAKE_DNI = '99999999'; // Dni temporal

async function parseAndInsertAyala() {
    console.log("Insertando AYALA DOLORES manualmente...");

    // 1. Check if she's already inserted with this fake DNI
    const { data: existingClient } = await supabase
        .from('cliente')
        .select('idcliente')
        .eq('dni', FAKE_DNI)
        .single();

    let idCliente = existingClient?.idcliente;

    if (!idCliente) {
        console.log("No existe el cliente, creándolo...");
        const { data: newClient, error: errClient } = await supabase
            .from('cliente')
            .insert({
                appynom: 'AYALA DOLORES',
                dni: FAKE_DNI,
                relalocalidad: 5, // Asumiendo Formosa capital, default fallback
                direccion: 'Sin datos',
                telefono: 'Sin datos',
                condicion: 1, // Activo
                fechalta: new Date().toISOString()
            })
            .select()
            .single();

        if (errClient) {
            console.error("Error al crear cliente:", errClient);
            return;
        }
        idCliente = newClient.idcliente;
        console.log("Cliente creado con ID:", idCliente);
    } else {
        console.log("Cliente ya existe con ID:", idCliente);
    }

    // 2. Extraer info del PDF sobre la solicitud 2555
    const pdfPath = "C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/Reporte de Solicitudes CREDITO GESTION.pdf";
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    const fullText = pdfData.text.replace(/\r?\n/g, ' ');

    // Ajustado para capturar la línea aunque no tenga DNI: busca solicitud 2555
    // Asumiendo formato: 2555 AYALA DOLORES Moto $12.000 18 $12.000...
    // Ej: "2555 AYALA DOLORES Moto $ 12.000 18 $ 24.000"

    console.log("Extrayendo solicitud del PDF...");

    // Expresión regular específica para esta línea.
    const regex2555 = /2555\s+AYALA DOLORES\s+(Moto|Usado|0[ ]?Km)\s+\$([\d\.]+)\s+(\d+)\s+\$([\d\.]+)/i;
    const match = fullText.match(regex2555);

    if (!match) {
        console.error("No se encontró la línea de la solicitud 2555 en el PDF o el formato no coincide.");
        console.log("Voy a escanear un extracto del texto en busca de 2555 AYALA DOLORES...");
        const idx = fullText.indexOf("2555");
        if (idx !== -1) {
            console.log("TEXTO CERCANO A 2555:", fullText.substring(idx - 50, idx + 100));
        }
        return;
    }

    console.log("Línea encontrada:", match[0]);

    const productoStr = match[1].trim();
    const montoCuota = parseInt(match[2].replace(/\./g, ''));
    const cantCuotas = parseInt(match[3]);
    const totalAbonado = parseInt(match[4].replace(/\./g, ''));

    const mapProd: Record<string, number> = {
        'Moto': 6, 'Usado': 4, '0 Km': 5, '0Km': 5
    };
    const idProducto = mapProd[productoStr] || 6;
    const totalAPagar = montoCuota * cantCuotas;
    const porcentajePagado = totalAPagar > 0 ? Math.round((totalAbonado * 100 / totalAPagar) * 100) / 100 : 0;

    // Insertar solicitud
    console.log("Insertando Solicitud 2555...");
    const { data: currentSol } = await supabase.from('solicitud').select('idsolicitud').eq('nrosolicitud', 2555).single();
    let idSolicitud = currentSol?.idsolicitud;

    if (!idSolicitud) {
        const { data: newSol, error: errSol } = await supabase
            .from('solicitud')
            .insert({
                nrosolicitud: 2555,
                relacliente: idCliente,
                relaproducto: idProducto,
                relavendedor: 8, // vendedor por defecto
                monto: totalAPagar,
                cantidadcuotas: cantCuotas,
                totalabonado: totalAbonado,
                totalapagar: totalAPagar,
                porcentajepagado: porcentajePagado,
                estado: 1, // Pendiente
                fechalta: new Date().toISOString()
            })
            .select()
            .single();

        if (errSol) {
            console.error("Error al crear solicitud:", errSol);
            return;
        }
        idSolicitud = newSol.idsolicitud;
        console.log("Solicitud creada con ID:", idSolicitud);
    } else {
        console.log("La solicitud 2555 ya existe con ID:", idSolicitud);
    }

    console.log("🎉 Proceso finalizado. El registro de cuotas puede importarse usando el script de cuotas si está en el Excel o se pueden cargar manualmente si faltan.");
}

parseAndInsertAyala().catch(e => console.error(e));
