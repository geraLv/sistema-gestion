"use strict";
/**
 * Ejemplos de uso del módulo Clientes (Cliente TypeScript)
 *
 * Para probar estos ejemplos:
 * 1. npm run dev
 * 2. Ejecuta los comandos curl o usa Postman
 */
// ==========================================
// 1. LISTAR TODOS LOS CLIENTES
// ==========================================
// curl http://localhost:4000/api/clientes
// ==========================================
// 2. BUSCAR CLIENTES
// ==========================================
// curl "http://localhost:4000/api/clientes/search?q=García"
// ==========================================
// 3. OBTENER UN CLIENTE POR ID
// ==========================================
// curl http://localhost:4000/api/clientes/1
// ==========================================
// 4. CREAR UN NUEVO CLIENTE
// ==========================================
// curl -X POST http://localhost:4000/api/clientes \
//   -H "Content-Type: application/json" \
//   -d '{
//     "appynom": "Pérez, María",
//     "dni": "87654321",
//     "direccion": "Avenida 2 456",
//     "telefono": "3118765432",
//     "selectLocalidades": 2
//   }'
// ==========================================
// 5. ACTUALIZAR UN CLIENTE
// ==========================================
// curl -X POST http://localhost:4000/api/clientes \
//   -H "Content-Type: application/json" \
//   -d '{
//     "idcliente": 1,
//     "appynom": "García López, Juan",
//     "dni": "12345678",
//     "direccion": "Calle 1 789",
//     "telefono": "3119876543",
//     "selectLocalidades": 3
//   }'
// ==========================================
// 6. OBTENER LOCALIDADES DISPONIBLES
// ==========================================
// curl http://localhost:4000/api/localidades
// ==========================================
// EJEMPLOS EN JAVASCRIPT (fetch API)
// ==========================================
// Listar clientes
async function listarClientes() {
    const response = await fetch("http://localhost:4000/api/clientes");
    const clientes = await response.json();
    console.log("Clientes:", clientes);
}
// Crear cliente
async function crearCliente() {
    const response = await fetch("http://localhost:4000/api/clientes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            appynom: "López, Carlos",
            dni: "23456789",
            direccion: "Calle 3 789",
            telefono: "3116543210",
            selectLocalidades: 1,
        }),
    });
    const result = await response.json();
    if (result.success) {
        console.log("Cliente creado:", result.data);
    }
    else {
        console.error("Error:", result.error);
    }
}
// Actualizar cliente
async function actualizarCliente(idcliente) {
    const response = await fetch("http://localhost:4000/api/clientes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            idcliente,
            appynom: "López Martínez, Carlos",
            dni: "23456789",
            direccion: "Calle 4 000",
            telefono: "3116543211",
            selectLocalidades: 2,
        }),
    });
    const result = await response.json();
    if (result.success) {
        console.log("Cliente actualizado:", result.data);
    }
    else {
        console.error("Error:", result.error);
    }
}
// Buscar clientes
async function buscarClientes(query) {
    const response = await fetch(`http://localhost:4000/api/clientes/search?q=${encodeURIComponent(query)}`);
    const clientes = await response.json();
    console.log("Resultados de búsqueda:", clientes);
}
// Obtener un cliente
async function obtenerCliente(idcliente) {
    const response = await fetch(`http://localhost:4000/api/clientes/${idcliente}`);
    const cliente = await response.json();
    console.log("Cliente:", cliente);
}
