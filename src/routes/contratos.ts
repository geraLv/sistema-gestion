import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../db";
import { ContratoRepository } from "../repositories/contratoRepository";
import { SolicitudRepository } from "../repositories/solicitudRepository";
import { PdfService } from "../services/pdfService";
import { authenticateToken } from "./auth";
import { strictLimiter } from "../middleware/rateLimiter";

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit to prevent OOM
});

/**
 * POST /api/contratos/generar
 * Genera el contrato PDF para una solicitud
 */
router.post("/generar", authenticateToken, async (req: any, res: any, next: any) => {
    try {
        const { idsolicitud } = req.body;
        let { datosContrato } = req.body;

        if (!idsolicitud) {
            return res.status(400).json({ error: "idsolicitud es requerido" });
        }

        // Validate and sanitize datosContrato to prevent layout-breaking strings
        if (datosContrato && typeof datosContrato === 'object') {
            for (const key in datosContrato) {
                if (typeof datosContrato[key] === 'string' && key !== 'firmaProductor') {
                    // Limit strings to 200 characters to prevent PDF layout overflow
                    if (datosContrato[key].length > 200) {
                        datosContrato[key] = datosContrato[key].substring(0, 200);
                    }
                }
            }
        }

        // 1. Verificar si ya existe un contrato pendiente
        const contratoExistente = await ContratoRepository.getContratoBySolicitud(idsolicitud);
        if (contratoExistente && contratoExistente.estado === 2) {
            return res.status(400).json({ error: "La solicitud ya tiene un contrato firmado." });
        }

        // 2. Obtener datos de la solicitud
        const solicitud = await SolicitudRepository.getSolicitudById(idsolicitud);
        if (!solicitud) {
            return res.status(404).json({ error: "Solicitud no encontrada" });
        }

        // 3. Generar PDF y Token (PdfService + Supabase Storage)
        const { url, token } = await PdfService.generarContratoPendiente(solicitud, datosContrato);

        // 4. Guardar en Base de Datos
        if (contratoExistente) {
            // Reemplazar el contrato pendiente existente
            const contratoActualizado = await ContratoRepository.updateContratoPendiente(
                contratoExistente.idcontrato,
                url,
                token
            );
            return res.status(200).json(contratoActualizado);
        } else {
            // Crear nuevo
            const nuevoContrato = await ContratoRepository.createContrato({
                relasolicitud: idsolicitud,
                token_acceso: token,
                url_pdf_original: url
            });
            return res.status(201).json(nuevoContrato);
        }
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/contratos/publico/:token
 * Endpoint público para que el cliente vea el contrato
 */
router.get("/publico/:token", async (req, res, next) => {
    try {
        const { token } = req.params;

        const contrato = await ContratoRepository.getContratoByToken(token);

        if (!contrato) {
            return res.status(404).json({ error: "Contrato no encontrado o token inválido" });
        }

        // Obtener info básica del cliente para mostrar
        const solicitud = await SolicitudRepository.getSolicitudById(contrato.relasolicitud);

        res.status(200).json({
            contrato,
            cliente: (solicitud as any)?.cliente,
            producto: (solicitud as any)?.producto,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/contratos/firmar/:token
 * Endpoint público que recibe la firma en base64
 */
router.post("/firmar/:token", strictLimiter, async (req, res, next) => {
    try {
        const { token } = req.params;
        const { firmaBase64, aclaracionCliente } = req.body;

        if (!firmaBase64) {
            return res.status(400).json({ error: "Se requiere la firma" });
        }

        // Prevent OOM by limiting the base64 string size (~200KB limit ~ 200,000 chars)
        // A normal react-signature-canvas signature is < 50KB in base64
        if (firmaBase64.length > 200000) {
            return res.status(413).json({ error: "La firma es demasiado pesada. Por favor, intente de nuevo." });
        }

        // 1. Obtener Contrato
        const contrato = await ContratoRepository.getContratoByToken(token);
        if (!contrato) {
            return res.status(404).json({ error: "Contrato no encontrado" });
        }

        if (contrato.estado === 2) {
            return res.status(400).json({ error: "Este contrato ya fue firmado previamente" });
        }

        // 2. Estampar firma en el PDF Original y subir a Storage
        if (!contrato.url_pdf_original) {
            return res.status(400).json({ error: "El PDF original no existe." });
        }
        const pdfFirmadoUrl = await PdfService.estamparFirma(
            contrato.url_pdf_original,
            contrato.relasolicitud,
            firmaBase64,
            aclaracionCliente
        );

        // 3. Capturar IP
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 4. Actualizar estado del contrato en BD
        try {
            const contratoFirmado = await ContratoRepository.markAsSigned(
                contrato.idcontrato,
                pdfFirmadoUrl,
                String(ip)
            );
            res.status(200).json(contratoFirmado);
        } catch (dbError) {
            // Cleanup orphaned file in Supabase if DB update fails
            const fileNameMatch = pdfFirmadoUrl.match(/contratos\/(firmados\/.*?\.pdf)/);
            if (fileNameMatch) {
                await supabase.storage.from('contratos').remove([fileNameMatch[1]]);
            }
            throw dbError;
        }
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/contratos/subir-manual
 * Endpoint privado para subir un PDF de contrato físico firmado
 */
router.post("/subir-manual", authenticateToken, upload.single("pdf"), async (req: any, res: any, next: any) => {
    try {
        const { idsolicitud } = req.body;
        const file = req.file;

        if (!idsolicitud) {
            return res.status(400).json({ error: "idsolicitud es requerido" });
        }
        if (!file) {
            return res.status(400).json({ error: "Se requiere un archivo PDF" });
        }
        if (file.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "El archivo debe ser un PDF" });
        }

        // 1. Subir el archivo a Supabase Storage
        const fileId = uuidv4();
        const fileName = `firmados/contrato_manual_${idsolicitud}_${fileId}.pdf`;

        const { error: uploadError } = await supabase.storage
            .from("contratos")
            .upload(fileName, file.buffer, {
                contentType: "application/pdf",
                upsert: true,
            });

        if (uploadError) {
            return res.status(500).json({ error: `Error subiendo PDF manual: ${uploadError.message}` });
        }

        const { data: publicUrlData } = supabase.storage.from("contratos").getPublicUrl(fileName);
        const fileUrl = publicUrlData.publicUrl;

        // 2. Revisar si ya existe un contrato en BD para marcarlo, o crearlo si no existe
        const contratoExistente = await ContratoRepository.getContratoBySolicitud(Number(idsolicitud));

        let contratoFinal;
        if (contratoExistente) {
            contratoFinal = await ContratoRepository.markAsSigned(
                contratoExistente.idcontrato,
                fileUrl,
                "Subida manual (Admin)"
            );
        } else {
            // Creamos uno directo como estado 2
            const dummyToken = uuidv4();
            const nuevo = await ContratoRepository.createContrato({
                relasolicitud: Number(idsolicitud),
                token_acceso: dummyToken,
                url_pdf_original: fileUrl // guardamos el mismo como original
            });
            contratoFinal = await ContratoRepository.markAsSigned(
                nuevo.idcontrato,
                fileUrl,
                "Subida manual al crear (Admin)"
            );
        }

        res.status(200).json({ success: true, contrato: contratoFinal });
    } catch (error) {
        next(error);
    }
});

export default router;
