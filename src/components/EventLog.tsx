import React from "react";
import type { EventEpsilon } from "../lib/solisModel";

export function EventLog({ events }: { events: EventEpsilon[] }) {
  return (
    <div style={{border:"1px solid #444", borderRadius:8, padding:12}}>
      <strong>ε — Eventos (ℜ ≥ θ)</strong>
      <div style={{maxHeight:160, overflow:"auto", marginTop:8}}>
        <table style={{width:"100%", fontSize:12}}>
          <thead>
            <tr>
              <th style={{textAlign:"left"}}>t</th>
              <th style={{textAlign:"left"}}>id</th>
              <th style={{textAlign:"left"}}>ℜ</th>
              <th style={{textAlign:"left"}}>L</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, idx) => (
              <tr key={idx}>
                <td>{e.t}</td>
                <td>{e.id}</td>
                <td>{e.r.toFixed(3)}</td>
                <td>[{e.L.map(x=>x.toFixed(2)).join(", ")}]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
