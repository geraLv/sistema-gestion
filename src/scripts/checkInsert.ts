import { supabase } from '../db';

async function checkInsert() {
    console.log("Insertando Cliente real (1690)...");
    const d = new Date('2025-12-20T11:21:33Z');

    const payloadClient = {
        idcliente: 1690,
        relalocalidad: 5,
        appynom: 'AYALA DOLORES',
        dni: '', // Setting to empty string instead of null, some schemas don't like nulls
        direccion: 'BARRIO EL PORVENIR MZ 20 CS 3',
        telefono: '',
        condicion: 1,
        fechalta: d.toISOString()
    };

    const { data: cData, error: eC } = await supabase.from('cliente').upsert(payloadClient).select();
    if (eC) {
        console.error("Error cliente:", JSON.stringify(eC, null, 2));
        return;
    }
    console.log("Cliente insertado:", cData);

    console.log("Insertando Solicitud real (1815)...");
    const payloadSol = {
        idsolicitud: 1815,
        relacliente: 1690,
        relaproducto: 4,
        relavendedor: 8,
        monto: 3100000,
        cantidadcuotas: 18,
        totalabonado: 950000,
        totalapagar: 3100000,
        porcentajepagado: 30.65,
        fechalta: new Date('2025-12-20T11:52:56Z').toISOString(),
        nrosolicitud: 2555,
        estado: 1,
        observaciones: 'VENTA PRESENCIAL ATENDIO MARIANA ES VENTA DE NAVARRO EZEQUIEL , 6 CUOTA CON EL 30% .. PEUGEOT 208'
    };

    const { data: sData, error: eS } = await supabase.from('solicitud').upsert(payloadSol).select();
    if (eS) {
        console.error("Error solicitud:", JSON.stringify(eS, null, 2));
        return;
    }
    console.log("Solicitud insertada:", sData);

    console.log("Cuotas will be inserted by another script if this works.");
}

checkInsert().catch(console.error);
