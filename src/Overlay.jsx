import { useEffect, useRef, useState } from "react";
import { pick, fill, fmt } from "../shared/shared.js";

const STAR = ["✦", "✧", "✶", "★"];
const PAL = ["#fff", "#b9a4ff", "#7fe7ff", "#ff9be6"];
const GLOW = "drop-shadow(0 0 34px rgba(190,140,255,.95))";
const IDLE = "drop-shadow(0 0 14px rgba(150,110,255,.55))";
const wsUrl = () => `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;

export default function Overlay() {
  const [cfg, setCfg] = useState(null);
  const [bubble, setBubble] = useState({ parts: [], on: false });
  const stageEl = useRef(), fxEl = useRef(), imgEl = useRef();
  const st = useRef({ queue: [], busy: false, last: {} });
  const api = useRef({});
  const cfgRef = useRef(null);
  cfgRef.current = cfg;

  /* ---------- Effekte & Bewegungen ---------- */
  const spawn = (glyphs, colors, n, spread = 300) => {
    const box = stageEl.current, layer = fxEl.current; if (!box || !layer) return;
    const sc = cfgRef.current?.scale || 1;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span"); p.className = "p"; p.textContent = pick(glyphs);
      const s = p.style;
      s.setProperty("--c", pick(colors));
      s.left = box.clientWidth * 0.15 + Math.random() * box.clientWidth * 0.7 + "px";
      s.top = box.clientHeight * (0.25 + Math.random() * 0.5) + "px";
      s.setProperty("--x", ((Math.random() - 0.5) * spread) / 2 + "px");
      s.setProperty("--y", -(90 + Math.random() * 180) + "px");
      s.setProperty("--r", (Math.random() - 0.5) * 90 + "deg");
      s.setProperty("--d", 1.6 + Math.random() * 1.4 + "s");
      s.fontSize = (14 + Math.random() * 22) * sc + "px";
      s.animationDelay = Math.random() * 0.5 + "s";
      layer.appendChild(p); setTimeout(() => p.remove(), 3800);
    }
  };
  const FX = {
    hearts: () => spawn(["♥", "♡", "✦"], ["#ff8fd8", "#ffb3ec", "#c8a2ff"], 16),
    stars: () => spawn(STAR, PAL, 18),
    burst: () => spawn(STAR.concat(["♥"]), PAL, 40, 600),
    zzz: () => spawn(["z", "Z", "✧"], ["#cdbfff", "#9fe9ff"], 7, 120),
    shoot: () => {
      for (let i = 0; i < 3; i++) setTimeout(() => {
        const box = stageEl.current, layer = fxEl.current; if (!box || !layer) return;
        const s = document.createElement("div"); s.className = "streak";
        s.style.left = Math.random() * box.clientWidth * 0.8 + "px"; s.style.top = Math.random() * box.clientHeight * 0.4 + "px";
        layer.appendChild(s); setTimeout(() => s.remove(), 1300);
      }, i * 320);
      spawn(STAR, PAL, 8);
    },
  };
  const MOVES = {
    hop: () => imgEl.current?.animate([{ transform: "none", filter: IDLE }, { transform: "translateY(-46px) scale(.97,1.04)", filter: GLOW, offset: 0.4 }, { transform: "translateY(0) scale(1.05,.95)", offset: 0.7 }, { transform: "none", filter: IDLE }], { duration: 700, easing: "ease-out" }),
    dance: () => imgEl.current?.animate([{ transform: "rotate(0)" }, { transform: "rotate(-7deg) translateY(-14px)", filter: GLOW }, { transform: "rotate(7deg)" }, { transform: "rotate(-7deg) translateY(-14px)", filter: GLOW }, { transform: "rotate(7deg)" }, { transform: "rotate(0)", filter: IDLE }], { duration: 1800, easing: "ease-in-out" }),
    snug: () => imgEl.current?.animate([{ transform: "none" }, { transform: "scale(1.08,.93)", filter: GLOW }, { transform: "none", filter: IDLE }], { duration: 900, easing: "ease-in-out" }),
    nap: () => imgEl.current?.animate([{ transform: "none" }, { transform: "scale(1.02,.94) translateY(10px)" }, { transform: "scale(1.02,.94) translateY(10px)", offset: 0.8 }, { transform: "none" }], { duration: 3600, easing: "ease-in-out" }),
  };

  /* ---------- Warteschlange: immer nur eine Reaktion gleichzeitig ---------- */
  api.current.next = () => {
    const s = st.current, r = s.queue.shift();
    if (!r) { s.busy = false; return; }
    s.busy = true;
    setBubble({ parts: r.parts, on: true });
    (MOVES[r.move] || MOVES.hop)(); (FX[r.fx] || FX.stars)();
    setTimeout(() => setBubble((b) => ({ ...b, on: false })), r.ms);
    setTimeout(() => api.current.next(), r.ms + 450);
  };
  api.current.react = (r) => {
    const s = st.current; if (s.queue.length < 6) s.queue.push(r);
    if (!s.busy) api.current.next();
  };
  api.current.show = (item, vars, tpl) =>
    api.current.react({ parts: fill(tpl, vars), fx: item.fx, move: item.move, ms: item.ms || 4600 });

  /* ---------- Befehle & Events aus der Config ---------- */
  api.current.runCommand = async (cmd, user, say, isTest) => {
    const c = cfgRef.current, s = st.current;
    if (!isTest) {
      if (!cmd.enabled || Date.now() - (s.last[cmd.id] || 0) < c.cooldownSec * 1000) return;
      s.last[cmd.id] = Date.now();
    }
    let n = "";
    if (cmd.counter) {
      try {
        const r = await fetch(`/api/counter/${cmd.id}${isTest ? "?peek=1" : ""}`, { method: "POST" });
        n = (await r.json()).n;
      } catch { n = "?"; }
    }
    const lines = (cmd.responses || []).filter(Boolean); if (!lines.length) return;
    const vars = { user, n };
    api.current.show(cmd, vars, pick(lines));
    if (cmd.chatReply && !isTest) say?.(fmt(cmd.chatReply, vars));
  };
  api.current.runEvent = (key, vars, say, isTest, itemOverride) => {
    const ev = itemOverride || cfgRef.current.events?.[key];
    if (!ev || (!ev.enabled && !isTest)) return;
    api.current.show(ev, vars, ev.text);
    if (ev.chatReply && !isTest) say?.(fmt(ev.chatReply, vars));
  };
  api.current.onMessage = (tags, user, text, say) => {
    if (tags["bits"]) api.current.runEvent("bits", { user, n: tags["bits"] }, say);
    if (tags["first-msg"] === "1") api.current.runEvent("firstMsg", { user }, say);
    if (text.startsWith("!")) {
      const word = text.split(/\s+/)[0].toLowerCase();
      const cmd = cfgRef.current.commands.find((c) => c.name.toLowerCase() === word);
      if (cmd) api.current.runCommand(cmd, user, say);
    }
  };
  api.current.onNotice = (tags, say) => {
    const id = tags["msg-id"], user = tags["display-name"] || tags["login"] || "jemand";
    if (id === "sub" || id === "resub") api.current.runEvent("sub", { user, months: tags["msg-param-cumulative-months"] || 1 }, say);
    else if (id === "subgift") api.current.runEvent("gift", { user, to: tags["msg-param-recipient-display-name"], n: 1 }, say);
    else if (id === "submysterygift") api.current.runEvent("gift", { user, n: tags["msg-param-mass-gift-count"] }, say);
    else if (id === "raid") api.current.runEvent("raid", { from: tags["msg-param-displayName"] || user, n: tags["msg-param-viewerCount"] }, say);
  };
  // Test-Knopf im Dashboard (nutzt auch ungespeicherte Änderungen)
  api.current.test = (m) => {
    if (m.kind === "command") api.current.runCommand(m.item, "Tester", null, true);
    else api.current.runEvent(m.key, { user: "Tester", from: "FreundlicherStreamer", to: "Gast", n: 42, months: 3 }, null, true, m.item);
  };

  /* ---------- Config laden + live Updates vom Dashboard ---------- */
  useEffect(() => {
    let ws, dead = false, t;
    fetch("/api/config").then((r) => r.json()).then((c) => !dead && setCfg(c)).catch(() => {});
    const open = () => {
      ws = new WebSocket(wsUrl());
      ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.type === "config") setCfg(m.config); if (m.type === "test") api.current.test(m); };
      ws.onclose = () => { if (!dead) t = setTimeout(open, 2000); };
    };
    open();
    return () => { dead = true; clearTimeout(t); ws && ws.close(); };
  }, []);

  /* ---------- Twitch-Chat (WebSocket-IRC; liest anonym, schreibt nur mit Bot-Login) ---------- */
  const channel = cfg?.channel?.toLowerCase().replace("#", "");
  useEffect(() => {
    if (!cfg) return;
    if (!channel || channel === "dein_kanalname") {
      api.current.react({ parts: [{ t: "Trag deinen Kanal im " }, { t: "Dashboard", b: true }, { t: " ein!" }], fx: "stars", move: "hop", ms: 8000 });
      return;
    }
    let ws, dead = false, t, retry = 1000;
    const canTalk = !!(cfg.botName && cfg.botOAuth);
    const say = (msg) => { if (canTalk && cfg.replyInChat && ws?.readyState === 1) ws.send(`PRIVMSG #${channel} :${msg}`); };
    const connect = () => {
      ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
      ws.onopen = () => {
        retry = 1000;
        ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        ws.send(canTalk ? `PASS ${cfg.botOAuth}` : "PASS SCHMOOPIIE");
        ws.send(`NICK ${canTalk ? cfg.botName.toLowerCase() : "justinfan" + Math.floor(10000 + Math.random() * 80000)}`);
        ws.send(`JOIN #${channel}`);
      };
      ws.onmessage = (e) => e.data.split("\r\n").filter(Boolean).forEach((raw) => {
        if (raw.startsWith("PING")) return ws.send("PONG :tmi.twitch.tv");
        const tags = {}; let rest = raw;
        if (raw[0] === "@") {
          const i = raw.indexOf(" ");
          raw.slice(1, i).split(";").forEach((kv) => { const [k, ...v] = kv.split("="); tags[k] = v.join("=").replace(/\\s/g, " "); });
          rest = raw.slice(i + 1);
        }
        const m = rest.match(/^:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/);
        if (m) return api.current.onMessage(tags, tags["display-name"] || m[1], m[2], say);
        if (/ USERNOTICE /.test(rest)) api.current.onNotice(tags, say);
      });
      ws.onclose = () => { if (!dead) { t = setTimeout(connect, retry); retry = Math.min(retry * 2, 30000); } };
    };
    connect();
    return () => { dead = true; clearTimeout(t); ws && ws.close(); };
  }, [channel, cfg?.botName, cfg?.botOAuth, cfg?.replyInChat, !!cfg]);

  // dezentes Funkeln im Ruhezustand
  useEffect(() => {
    const t = setInterval(() => { if (!st.current.busy) spawn(["✦", "✧"], PAL, 1, 80); }, 1400);
    return () => clearInterval(t);
  }, []);

  if (!cfg) return null;
  const right = cfg.corner === "right";
  return (
    <div ref={stageEl} id="stage" className={right ? "right" : "left"} style={{ width: 340 * cfg.scale, [right ? "right" : "left"]: 24 }}>
      <div ref={fxEl} id="fx" />
      <div id="flip"><div id="float"><img ref={imgEl} id="eevee" src="/eevee.png" alt="eevee" /></div></div>
      <div id="bubble" className={bubble.on ? "on" : ""} style={{ fontSize: 26 * cfg.scale }}>
        {bubble.parts.map((p, i) => (p.b ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}
      </div>
    </div>
  );
}
