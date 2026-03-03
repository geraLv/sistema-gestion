import { supabase } from '../db';

async function importReal() {
    console.log("Insertando Cliente real (1690)...");
    const { error: eC } = await supabase.from('cliente').upsert({
        idcliente: 1690,
        relalocalidad: 5,
        appynom: 'AYALA DOLORES',
        dni: '', // CSV had empty DNI, null wasn't allowed
        direccion: 'BARRIO EL PORVENIR MZ 20 CS 3',
        telefono: '',
        condicion: 1,
        fechalta: '2025-12-20T11:21:33Z'
    });
    if (eC) console.error("Error cliente:", eC);

    console.log("Insertando Solicitud real (1815)...");

    const totalabonado = 150000 + 200000 + 400000 + 200000; // sum of 4 paid cuotas = 950000
    const porcentaje = (totalabonado * 100) / 3100000;

    const { error: eS } = await supabase.from('solicitud').upsert({
        idsolicitud: 1815,
        relacliente: 1690,
        relaproducto: 4,
        relavendedor: 8, // Hardcode a vendedor 8 porque 108 no existe
        monto: 3100000,
        cantidadcuotas: 18,
        totalabonado: totalabonado,
        totalapagar: 3100000,
        porcentajepagado: Math.round(porcentaje * 100) / 100,
        fechalta: '2025-12-20T11:52:56Z',
        nrosolicitud: 2555,
        estado: 1
    });
    if (eS) console.error("Error solicitud:", eS);

    console.log("Insertando Cuotas reales (37394-37411)...");
    const cuotasData = [
        { idcuota: 37394, relasolicitud: 1815, nrocuota: 1, importe: 150000, fecha: "2025-10-31", vencimiento: "2025-10-20", saldoanterior: 0, estado: 2 },
        { idcuota: 37395, relasolicitud: 1815, nrocuota: 2, importe: 200000, fecha: "2025-11-12", vencimiento: "2025-11-20", saldoanterior: 0, estado: 2 },
        { idcuota: 37396, relasolicitud: 1815, nrocuota: 3, importe: 400000, fecha: "2025-12-13", vencimiento: "2025-12-20", saldoanterior: 0, estado: 2 },
        { idcuota: 37397, relasolicitud: 1815, nrocuota: 4, importe: 200000, fecha: "2026-01-03", vencimiento: "2026-01-20", saldoanterior: 0, estado: 2 },
        { idcuota: 37398, relasolicitud: 1815, nrocuota: 5, importe: 150000, fecha: null, vencimiento: "2026-02-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37399, relasolicitud: 1815, nrocuota: 6, importe: 150000, fecha: null, vencimiento: "2026-03-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37400, relasolicitud: 1815, nrocuota: 7, importe: 150000, fecha: null, vencimiento: "2026-04-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37401, relasolicitud: 1815, nrocuota: 8, importe: 150000, fecha: null, vencimiento: "2026-05-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37402, relasolicitud: 1815, nrocuota: 9, importe: 150000, fecha: null, vencimiento: "2026-06-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37403, relasolicitud: 1815, nrocuota: 10, importe: 150000, fecha: null, vencimiento: "2026-07-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37404, relasolicitud: 1815, nrocuota: 11, importe: 150000, fecha: null, vencimiento: "2026-08-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37405, relasolicitud: 1815, nrocuota: 12, importe: 150000, fecha: null, vencimiento: "2026-09-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37406, relasolicitud: 1815, nrocuota: 13, importe: 150000, fecha: null, vencimiento: "2026-10-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37407, relasolicitud: 1815, nrocuota: 14, importe: 150000, fecha: null, vencimiento: "2026-11-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37408, relasolicitud: 1815, nrocuota: 15, importe: 150000, fecha: null, vencimiento: "2026-12-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37409, relasolicitud: 1815, nrocuota: 16, importe: 150000, fecha: null, vencimiento: "2027-01-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37410, relasolicitud: 1815, nrocuota: 17, importe: 150000, fecha: null, vencimiento: "2027-02-20", saldoanterior: 0, estado: 0 },
        { idcuota: 37411, relasolicitud: 1815, nrocuota: 18, importe: 150000, fecha: null, vencimiento: "2027-03-20", saldoanterior: 0, estado: 0 },
    ];

    for (const c of cuotasData) {
        const { error: e } = await supabase.from('cuotas').upsert(c);
        if (e) console.error(`Error en cuota ${c.idcuota}:`, e);
    }

    console.log("🎉 Listo, datos reales cargados.");
}

importReal().catch(console.error);
