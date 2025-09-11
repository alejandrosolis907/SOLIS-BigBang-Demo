import React from 'react';
import { telemetry } from '../../solis/telemetry';

export function SolisPanel() {
  const [count, setCount] = React.useState(telemetry.snapshots.length);
  React.useEffect(() => {
    const fn = () => setCount(telemetry.snapshots.length);
    telemetry.on('snapshot', fn);
    return () => {
      telemetry.off('snapshot', fn);
    };
  }, []);

  return (
    <div className="mt-4 p-2 bg-slate-800 rounded-md text-xs">
      SOLIS telemetry samples: {count}
    </div>
  );
}
