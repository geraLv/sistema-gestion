import { PDFDocument, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { SolicitudConDetalles } from '../types/solicitud';

export class PdfService {

    /**
     * Genera el contrato PDF rellenando los datos del cliente
     * y lo sube al bucket 'contratos'.
     * Retorna la URL del archivo y el token generado.
     */
    static async generarContratoPendiente(solicitud: SolicitudConDetalles, datosContrato?: any): Promise<{ url: string, token: string }> {
        try {
            let templatePath = process.env.TEMPLATE_PDF_PATH;
            if (!templatePath) {
                const pathsToTry = [
                    path.join(__dirname, '../../..', 'SOLICITUD .pdf'), // relative from dist/services
                    path.join(process.cwd(), '../SOLICITUD .pdf'),      // relative from backend execution
                    path.join(process.cwd(), 'SOLICITUD .pdf'),         // if executed from root
                    path.resolve(__dirname, '../../../SOLICITUD .pdf')
                ];
                for (const p of pathsToTry) {
                    if (fs.existsSync(p)) {
                        templatePath = p;
                        break;
                    }
                }
                if (!templatePath) {
                    templatePath = pathsToTry[0]; // fallback so error message is descriptive
                }
            }

            let pdfBytes: Uint8Array;
            try {
                pdfBytes = await fs.promises.readFile(templatePath);
            } catch (err) {
                console.warn(`No se encontró el PDF en ${templatePath}. Usando documento en blanco de prueba.`);
                const emptyPdf = await PDFDocument.create();
                const page = emptyPdf.addPage();
                page.drawText('Plantilla no encontrada, contrato de prueba.', { x: 50, y: 700 });
                pdfBytes = await emptyPdf.save();
            }

            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const secondPage = pages.length > 1 ? pages[1] : null;

            // Extraemos datos de datosContrato o usamos fallbacks vacios (ya que la UI deberia mandar todo)
            const d = datosContrato || {};

            const vehNuevo = d.vehNuevo || "";
            const vehUsado = d.vehUsado || "";
            const nroOp = d.nroOp || "";
            const fechaDia = d.fechaDia || "";
            const fechaMes = d.fechaMes || "";
            const fechaAnio = d.fechaAnio || "";

            const productoNombre = d.productoNombre || (solicitud as any).producto?.descripcion || "";
            const prodCod = d.prodCod || "";

            const clienteNombre = d.clienteNombre || (solicitud as any).cliente?.appynom || "";
            const estadoCivil = d.estadoCivil || "";
            const clienteDni = d.clienteDni || (solicitud as any).cliente?.dni || "";
            const fNac = d.fNac || "";
            const hijos = d.hijos || "";

            const conyugeNombre = d.conyugeNombre || "";
            const conyugeDni = d.conyugeDni || "";
            const conyugeFNac = d.conyugeFNac || "";
            const conyugeDomicilio = d.conyugeDomicilio || "";
            const conyugeTel = d.conyugeTel || "";

            const referencia = d.referencia || "";
            const codPostal = d.codPostal || "";
            const clienteLocalidad = d.clienteLocalidad || (solicitud as any).cliente?.localidad?.nombre || "";
            const provincia = d.provincia || "";

            const observaciones1 = d.observaciones1 || "";
            const observaciones2 = d.observaciones2 || "";

            const ciudad = d.ciudad || "";
            const recibiDe = d.recibiDe || "";
            const sumaLetras = d.sumaLetras || "";
            const sumaNum = d.sumaNum || "";
            const pagoPedidoNro = d.pagoPedidoNro || "";
            const sonPesos = d.sonPesos || "";

            // Montos y cuotas (por si aca, aunque los principales van en las coords dadas)
            const monto = d.monto || solicitud.monto;
            const cantidadcuotas = d.cantidadCuotas || solicitud.cantidadcuotas;
            const totalapagar = d.totalAPagar || solicitud.totalapagar;

            const drawText = (text: string | number | undefined, x: number, y: number, page = firstPage, fontSize = 10) => {
                if (text && page) {
                    page.drawText(String(text), {
                        x,
                        y,
                        size: fontSize,
                        color: rgb(0, 0, 0),
                    });
                }
            };

            // Escribimos valores en las coordenadas especificas de la PÁGINA 1
            // Se le suma +5 a X a todos los campos para separarlos
            // Algunos campos suben un poco en Y (+3)

            drawText(vehNuevo, 100, 631);
            drawText(vehUsado, 246, 631);
            drawText(nroOp, 378, 631);

            drawText(fechaDia, 453, 631);
            drawText(fechaMes, 489, 631);
            drawText(fechaAnio, 525, 631);

            drawText(productoNombre, 137, 606);
            drawText(prodCod, 62, 582);

            drawText(clienteNombre, 132, 508);
            drawText(estadoCivil, 100, 486); // subido
            drawText(clienteDni, 337, 483);
            drawText(fNac, 75, 458);
            drawText(hijos, 291, 458);

            drawText(conyugeNombre, 132, 406);
            drawText(conyugeDni, 287, 406);
            drawText(conyugeFNac, 444, 406);
            drawText(conyugeDomicilio, 87, 384); // subido
            drawText(conyugeTel, 383, 381);

            drawText(referencia, 96, 359); // subido
            drawText(codPostal, 99, 335); // subido
            drawText(clienteLocalidad, 216, 335); // subido
            drawText(provincia, 407, 335); // subido

            drawText(observaciones1, 124, 279); // subido
            drawText(observaciones2, 42, 255); // subido

            // RECIBO
            drawText(ciudad, 118, 163); // subido
            drawText(recibiDe, 88, 136);
            drawText(sumaLetras, 100, 113); // subido
            drawText(sumaNum, 287, 113); // subido
            drawText(pagoPedidoNro, 153, 89); // subido

            // SON$ tiene letras más grandes (size 12)
            drawText(sonPesos, 88, 49, firstPage, 12);

            // Aclaración Productor
            const aclaracionProductor = d.aclaracionProductor || "";
            drawText(aclaracionProductor, 469, 55);

            // Firma Productor
            if (d.firmaProductor && typeof d.firmaProductor === "string" && d.firmaProductor.length > 200000) {
                console.warn(`Firma productor ignorada por ser demasiado pesada: ${d.firmaProductor.length} chars`);
                d.firmaProductor = null; // Prevent processing excessively large base64 strings (Out of memory risk)
            }

            if (d.firmaProductor) {
                try {
                    const base64Data = d.firmaProductor.replace(/^data:image\/(png|jpeg);base64,/, "");
                    const imageBytes = Buffer.from(base64Data, "base64");
                    const signatureImage = await pdfDoc.embedPng(imageBytes);

                    firstPage.drawImage(signatureImage, {
                        x: 323,
                        y: 30,
                        width: 119,
                        height: 49,
                    });

                    if (secondPage) {
                        secondPage.drawImage(signatureImage, {
                            x: 89,
                            y: 30,
                            width: 136,
                            height: 48,
                        });
                    }
                } catch (e) {
                    console.error("Error estampar firma productor:", e);
                }
            }

            // Escribimos en la PÁGINA 2
            if (secondPage) {
                drawText(clienteNombre, 211, 799, secondPage);
                drawText(aclaracionProductor, 373, 53, secondPage);
            }

            // 3. Serializar y guardar
            const pdfConDatos = await pdfDoc.save();

            // 3. Subir a Supabase Storage
            const token = uuidv4();
            const fileName = `pendientes/contrato_${solicitud.idsolicitud}_${token}.pdf`;

            const { data, error } = await supabase
                .storage
                .from('contratos')
                .upload(fileName, pdfConDatos, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (error) {
                throw new Error(`Error subiendo PDF a Storage: ${error.message}`);
            }

            const { data: publicUrlData } = supabase.storage.from('contratos').getPublicUrl(fileName);

            return {
                url: publicUrlData.publicUrl,
                token
            };

        } catch (error) {
            console.error("Error en generarContratoPendiente:", error);
            throw error;
        }
    }

    /**
     * Incrusta la firma (en base64) en el PDF original y lo guarda como 'firmado'
     */
    static async estamparFirma(
        urlOriginal: string,
        idSolicitud: number,
        firmaBase64: string,
        aclaracionCliente?: string
    ): Promise<string> {
        try {
            // 1. Descargar el PDF original desde Storage
            // urlOriginal es una URL publica de supabase
            const pdfResponse = await fetch(urlOriginal);
            if (!pdfResponse.ok) throw new Error("No se pudo descargar el PDF original");
            const originalPdfBytes = await pdfResponse.arrayBuffer();

            const pdfDoc = await PDFDocument.load(originalPdfBytes);
            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];

            // 2. Procesar imagen de firma
            const base64Data = firmaBase64.replace(/^data:image\/(png|jpeg);base64,/, "");
            const imageBytes = Buffer.from(base64Data, "base64");
            const signatureImage = await pdfDoc.embedPng(imageBytes);

            const firstPage = pages[0];
            const secondPage = pages.length > 1 ? pages[1] : null;

            const drawText = (text: string | number | undefined, x: number, y: number, page: any, fontSize = 9) => {
                if (text && page) {
                    page.drawText(String(text), {
                        x,
                        y,
                        size: fontSize,
                        color: rgb(0, 0, 0),
                    });
                }
            };

            // Estampar Aclaracion Cliente
            if (aclaracionCliente) {
                drawText(aclaracionCliente, 500, 220, firstPage, 10);
                if (secondPage) {
                    drawText(aclaracionCliente, 366, 93, secondPage, 10);
                }
            }

            // Estampar Firma Cliente en Pagina 1
            firstPage.drawImage(signatureImage, {
                x: 395,
                y: 202,
                width: 103,
                height: 43,
            });

            // Estampar Firma Cliente en Pagina 2
            if (secondPage) {
                secondPage.drawImage(signatureImage, {
                    x: 104,
                    y: 79,
                    width: 125,
                    height: 32,
                });
            }

            // Sello de tiempo (Opcional, en la esquina de la pagina 1 o 2)
            const selloPage = secondPage || firstPage;
            const { width } = selloPage.getSize();
            selloPage.drawText(`Firmado digitalmente el ${new Date().toLocaleString()}`, {
                x: width / 2 - 100,
                y: 20, // Lo bajo a 20 para que no choque con la firma
                size: 8,
                color: rgb(0, 0, 0),
            });

            const finalPdfBytes = await pdfDoc.save();

            // 4. Subir PDF firmado a Storage
            const fileName = `firmados/contrato_firmado_${idSolicitud}_${Date.now()}.pdf`;

            const { data, error } = await supabase
                .storage
                .from('contratos')
                .upload(fileName, finalPdfBytes, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (error) {
                throw new Error(`Error subiendo PDF firmado a Storage: ${error.message}`);
            }

            const { data: publicUrlData } = supabase.storage.from('contratos').getPublicUrl(fileName);

            return publicUrlData.publicUrl;

        } catch (error) {
            console.error("Error en estamparFirma:", error);
            throw error;
        }
    }
}
