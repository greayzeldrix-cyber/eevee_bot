import { useEffect, useRef, useState } from "react";
import { FX_OPTIONS, MOVE_OPTIONS, EVENT_META } from "../shared/shared.js";

const VARS_CMD = "{user} {n}";
const F = ({ l, children }) => <label>{l}{children}</label>;
const Pick = ({ value, onChange, options }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
);

export default function Dashboard() {
  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState("");
  const ws = useRef();

  useEffect(() => {
    let dead = false, t;
    fetch("/api/config").then((r) => r.json()).then((c) => { setCfg(c); setSaved(JSON.stringify(c)); });
    const open = () => {
      ws.current = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
      ws.current.onclose = () => { if (!dead) t = setTimeout(open, 2000); };
    };
    open();
    return () => { dead = true; clearTimeout(t); ws.current?.close(); };
  }, []);

  if (!cfg) return <div className="wrap">Lade …</div>;
  const dirty = JSON.stringify(cfg) !== saved;
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const upCmd = (i, patch) => set("commands", cfg.commands.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const upEv = (k, patch) => set("events", { ...cfg.events, [k]: { ...cfg.events[k], ...patch } });
  const test = (msg) => ws.current?.readyState === 1 && ws.current.send(JSON.stringify({ type: "test", ...msg }));
  const save = async () => {
    await fetch("/api/config", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(cfg) });
    setSaved(JSON.stringify(cfg));
  };
  const addCmd = () => set("commands", [...cfg.commands, { id: Date.now().toString(36), name: "!neu", enabled: true, responses: ["{user} hat !neu benutzt."], chatReply: "", fx: "stars", move: "hop", ms: 4600, counter: false }]);
  const normName = (v) => (v.startsWith("!") ? v : "!" + v).replace(/\s/g, "").toLowerCase();

  return (
    <div className="wrap">
      <img src="/eevee.png" alt="" className="logo" />
      <h1>Galaxy Eevee Bot</h1>
      <p className="hint">OBS → Quelle hinzufügen → Browser → URL <code>{location.origin}/overlay</code> · Größe 1920×1080. Änderungen erscheinen nach dem Speichern sofort im Overlay.</p>

      <h2>Kanal & Overlay</h2>
      <div className="row">
        <F l="Twitch-Kanal"><input value={cfg.channel} onChange={(e) => set("channel", e.target.value)} /></F>
        <F l="Position"><Pick value={cfg.corner} onChange={(v) => set("corner", v)} options={[["left", "Links unten"], ["right", "Rechts unten"]]} /></F>
        <F l="Größe (1 = 340 px)"><input type="number" step="0.1" min="0.3" max="3" value={cfg.scale} onChange={(e) => set("scale", +e.target.value || 1)} /></F>
        <F l="Cooldown pro Befehl (Sek.)"><input type="number" min="0" value={cfg.cooldownSec} onChange={(e) => set("cooldownSec", +e.target.value || 0)} /></F>
      </div>

      <h2>Bot-Account (optional, nur zum Antworten im Chat)</h2>
      <div className="row">
        <F l="Bot-Name"><input value={cfg.botName} onChange={(e) => set("botName", e.target.value)} /></F>
        <F l="OAuth-Token (chat:edit)"><input type="password" autoComplete="off" value={cfg.botOAuth} placeholder="oauth:…" onChange={(e) => set("botOAuth", e.target.value)} /></F>
        <label className="chk"><input type="checkbox" checked={cfg.replyInChat} onChange={(e) => set("replyInChat", e.target.checked)} /> Im Chat antworten</label>
      </div>

      <h2>Befehle</h2>
      {cfg.commands.map((c, i) => (
        <div className="item" key={c.id}>
          <div className="row">
            <F l="Befehl"><input value={c.name} onChange={(e) => upCmd(i, { name: normName(e.target.value) })} /></F>
            <F l="Effekt"><Pick value={c.fx} onChange={(v) => upCmd(i, { fx: v })} options={FX_OPTIONS} /></F>
            <F l="Bewegung"><Pick value={c.move} onChange={(v) => upCmd(i, { move: v })} options={MOVE_OPTIONS} /></F>
            <F l="Dauer (Sek.)"><input type="number" min="1" step="0.5" value={c.ms / 1000} onChange={(e) => upCmd(i, { ms: Math.max(1, +e.target.value || 1) * 1000 })} /></F>
          </div>
          <F l={`Sprechblase – eine Antwort pro Zeile, es wird zufällig eine gewählt · Variablen: ${VARS_CMD}`}>
            <textarea rows={Math.max(2, c.responses.length)} value={c.responses.join("\n")} onChange={(e) => upCmd(i, { responses: e.target.value.split("\n") })} />
          </F>
          <F l="Antwort im Chat (leer = keine)"><input value={c.chatReply} onChange={(e) => upCmd(i, { chatReply: e.target.value })} /></F>
          <div className="actions">
            <label className="chk"><input type="checkbox" checked={c.enabled} onChange={(e) => upCmd(i, { enabled: e.target.checked })} /> Aktiv</label>
            <label className="chk"><input type="checkbox" checked={c.counter} onChange={(e) => upCmd(i, { counter: e.target.checked })} /> Zähler {"{n}"}</label>
            <button onClick={() => test({ kind: "command", item: c })}>Testen</button>
            <button className="ghost" onClick={() => confirm(`${c.name} löschen?`) && set("commands", cfg.commands.filter((_, j) => j !== i))}>Löschen</button>
          </div>
        </div>
      ))}
      <button onClick={addCmd}>+ Befehl hinzufügen</button>

      <h2>Ereignisse</h2>
      {Object.entries(EVENT_META).map(([k, meta]) => {
        const e = cfg.events[k];
        return (
          <div className="item" key={k}>
            <div className="row">
              <strong className="evt">{meta.label}</strong>
              <F l="Effekt"><Pick value={e.fx} onChange={(v) => upEv(k, { fx: v })} options={FX_OPTIONS} /></F>
              <F l="Bewegung"><Pick value={e.move} onChange={(v) => upEv(k, { move: v })} options={MOVE_OPTIONS} /></F>
            </div>
            <F l={`Sprechblase · Variablen: ${meta.vars}`}><input value={e.text} onChange={(ev) => upEv(k, { text: ev.target.value })} /></F>
            <F l="Antwort im Chat (leer = keine)"><input value={e.chatReply} onChange={(ev) => upEv(k, { chatReply: ev.target.value })} /></F>
            <div className="actions">
              <label className="chk"><input type="checkbox" checked={e.enabled} onChange={(ev) => upEv(k, { enabled: ev.target.checked })} /> Aktiv</label>
              <button onClick={() => test({ kind: "event", key: k, item: e })}>Testen</button>
            </div>
          </div>
        );
      })}

      <div className="bar">
        <span>{dirty ? "Ungespeicherte Änderungen" : "Alles gespeichert ✦"}</span>
        <button disabled={!dirty} onClick={save}>Speichern</button>
      </div>
    </div>
  );
}
