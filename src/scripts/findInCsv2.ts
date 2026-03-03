import fs from 'fs';

const file = fs.readFileSync('C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/DOC PROGRAMADOR.csv', 'latin1');
const lines = file.split('\n');

const clientRow = lines.find(l => l.startsWith('"1690,""5"",""AYALA DOLORES"'));
console.log("Cliente:", clientRow);

const solRow = lines.find(l => l.startsWith('"1815,""1690""'));
console.log("Solicitud:", solRow);

const cuotas = lines.filter(l => l.includes('""1815""')); // To see if there are cuotas with relasolicitud 1815
console.log("Cuotas 1815:");
cuotas.forEach(c => console.log(c));
