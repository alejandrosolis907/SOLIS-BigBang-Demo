import { EventEmitter } from 'events';
import { SolisSnapshot } from './ontology';

class Telemetry extends EventEmitter {
  snapshots: SolisSnapshot[] = [];
  record(s: SolisSnapshot) {
    this.snapshots.push(s);
    this.emit('snapshot', s);
  }
}

export const telemetry = new Telemetry();
