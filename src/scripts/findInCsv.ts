import fs from 'fs';

const file = fs.readFileSync('C:/Users/ING Nordeste/Desktop/repos/sistema-gestion/sistema-migrado/DOC PROGRAMADOR.csv', 'latin1');
const lines = file.split('\n');

const res = lines.filter(l => l.includes('1690'));
console.log('Resultados para 1690:');
res.forEach(r => console.log(r));

const res2 = lines.filter(l => l.toLowerCase().includes('ayala') && l.toLowerCase().includes('dolores'));
console.log('\nResultados para AYALA DOLORES:');
res2.forEach(r => console.log(r));
