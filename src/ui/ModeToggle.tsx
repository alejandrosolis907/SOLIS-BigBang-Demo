import React from 'react';

interface Props {
  mode: 'BigBang' | 'SOLIS';
  onChange: (m: 'BigBang' | 'SOLIS') => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <select
      value={mode}
      onChange={e => onChange(e.target.value as 'BigBang' | 'SOLIS')}
      className="bg-slate-900 rounded-md px-2 py-1"
    >
      <option value="BigBang">BigBang</option>
      <option value="SOLIS">SOLIS</option>
    </select>
  );
}
