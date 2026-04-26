#!/usr/bin/env node
/**
 * set-audio-urls.js
 * Asigna las URLs de audio de Google Drive a todas las word cards de la demo.
 *
 * Uso:
 *   npm run demo:audio
 *   node scripts/set-audio-urls.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB ?? 'test';

if (!URI) {
  console.error('❌  MONGODB_URI no está definida. Verifica tu archivo .env');
  process.exit(1);
}

const driveUrl = (id) =>
  `https://drive.google.com/uc?export=download&id=${id}`;

const AUDIO_MAP = [
  // Animales
  { word: 'gato',     id: '1eWDJ_y574TPi38yfUsb4O75RqGI9483Y' },
  { word: 'perro',    id: '1SSzdoU4gr2h1g2WrBJYmDSbVhF1A118_' },
  { word: 'pato',     id: '14Uwlb5-ZV6raZsRlVvCajzmQWlIhnKYO' },
  { word: 'vaca',     id: '1MPR1AV_KIr4iwK6UdFeo4u-lNTYzax_K' },
  { word: 'caballo',  id: '1AgC_551saCmeJ0OoVleERFgU2WAprHLz' },
  // Familia
  { word: 'mamá',     id: '1tsNiuhYWiHyDg57EWisneLbaWlenJXZt' },
  { word: 'papá',     id: '19igdckeHxWPntlzoL8bT_CmD3xYwj7MG' },
  { word: 'prima',    id: '1_PzP2G5pzYzUZuefkIZJIgN1-X2Rb6hq' },
  { word: 'abuelo',   id: '1bCiX9I5DLDlMFiwZcxXFTnz5jYSm8AiJ' },
  { word: 'hermana',  id: '1qceIKQUU_Noqt-2WD9A_KG0NmUaX5f1_' },
  // Cocina
  { word: 'pan',      id: '1kmLdxdRU12Ay9tU8V3sZADknmfHIlCwR' },
  { word: 'leche',    id: '1Gjul8Ju9aDqpMPacssMDHYHwQ5moJY8v' },
  { word: 'queso',    id: '1MsUZ63XG7Ap1NggDrOS6fIPSsH8eabWl' },
  { word: 'sopa',     id: '15RhuphrdOnjEf7wVqa8AYVewc_78-fmE' },
  { word: 'arroz',    id: '1L88TfkO2S7FmeRmKMZnJ_At8YklUUX3x' },
];

async function main() {
  const client = new MongoClient(URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const coll = db.collection('doman_word_cards');

    console.log('\n🎵  Actualizando URLs de audio...\n');

    let total = 0;
    for (const { word, id } of AUDIO_MAP) {
      const result = await coll.updateMany(
        { word },
        { $set: { audio_url: driveUrl(id), updated_at: new Date() } },
      );
      const icon = result.modifiedCount > 0 ? '✅' : '⚠️ ';
      console.log(`${icon}  ${word.padEnd(10)} → ${result.modifiedCount} tarjeta(s) actualizadas`);
      total += result.modifiedCount;
    }

    console.log(`\n🎉  Total: ${total} tarjetas con audio asignado`);
    console.log('    Naturaleza y Juguetes quedan pendientes (sin archivos aún)\n');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
