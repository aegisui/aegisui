/**
 * Gate de §9.2 aún no implementado. Falla A PROPÓSITO: un gate sin objetivos que
 * analizar no puede pasar en verde (anti-verde-falso, SPEC §13). El job existe ya
 * —con su `name:` estable— para poder fijarlo como required en la protección de
 * rama cuando su fase lo active; hasta entonces está en rojo, que es su estado
 * honesto. Cuando la fase lo implemente, se reemplaza el comando de este job por
 * el gate real.
 *
 *   node scripts/pending-gate.mjs <gate> <fase>
 */
const [, , gate = 'desconocido', fase = '?'] = process.argv;

console.error(`❌ gate "${gate}": aún no implementado; se activa en la Fase ${fase}.`);
console.error('   Falla a propósito (anti-verde-falso, SPEC §13): sin objetivos que');
console.error('   analizar no pasa en verde. Reemplaza el comando de este job por el');
console.error('   gate real cuando la fase lo implemente. No cambies el `name:` del job:');
console.error('   está fijado como required en la protección de rama.');
process.exit(1);
