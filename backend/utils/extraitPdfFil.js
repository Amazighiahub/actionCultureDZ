/**
 * Fil séparé (worker_threads) qui coupe un PDF à ses premières pages : voir extraitPdf.js.
 * Sa mémoire est limitée par le fil principal ; s'il la dépasse, seul ce fil s'arrête.
 */
const { parentPort, workerData } = require('worker_threads');
const { garderPremieresPages } = require('./extraitPdf');

garderPremieresPages(workerData.chemin, workerData.maxPages)
  .then((r) => parentPort.postMessage(r))
  .catch((e) => parentPort.postMessage({ erreur: e?.message || 'PDF illisible' }));
