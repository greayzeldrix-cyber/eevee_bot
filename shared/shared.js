// Wird vom Server UND vom Frontend genutzt.
export const FX_OPTIONS = [["hearts","Herzen"],["stars","Sterne"],["burst","Feuerwerk"],["shoot","Sternschnuppen"],["zzz","Zzz"]];
export const MOVE_OPTIONS = [["hop","Hüpfen"],["dance","Tanzen"],["snug","Kuscheln"],["nap","Nickerchen"]];
export const EVENT_META = {
  sub:     { label: "Abo / Resub",          vars: "{user} {months}" },
  gift:    { label: "Geschenkte Abos",      vars: "{user} {to} {n}" },
  raid:    { label: "Raid",                 vars: "{from} {n}" },
  bits:    { label: "Bits",                 vars: "{user} {n}" },
  firstMsg:{ label: "Erste Nachricht",      vars: "{user}" },
};

export const pick = (a) => a[Math.floor(Math.random() * a.length)];
// "{user} hallo" -> [{t:"user-name", b:true},{t:" hallo"}]  (Variablen werden hervorgehoben)
export const fill = (tpl, vars) =>
  String(tpl).split(/\{(\w+)\}/).map((s, i) => (i % 2 ? { t: String(vars[s] ?? ""), b: true } : { t: s })).filter((p) => p.t !== "");
export const fmt = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

export const DEFAULTS = {
  channel: "dein_kanalname",
  corner: "left",
  scale: 1,
  cooldownSec: 4,
  botName: "",
  botOAuth: "",
  replyInChat: false,
  commands: [
    { id: "hello", name: "!hello", enabled: true, responses: ["Hi {user}! Die Sterne haben dir einen Platz freigehalten.", "{user}! Willkommen in der Galaxie."], chatReply: "Willkommen, @{user}! ✦", fx: "stars", move: "hop", ms: 4600, counter: false },
    { id: "pet",   name: "!pet",   enabled: true, responses: ["{user} krault mich… der ganze Himmel schnurrt. (Streichler #{n})"], chatReply: "*schnurrt im Sternenlicht* danke @{user} ♥", fx: "hearts", move: "snug", ms: 4600, counter: true },
    { id: "hug",   name: "!hug",   enabled: true, responses: ["{user} umarmt mich. Mein Fell ist jetzt zehnmal flauschiger."], chatReply: "", fx: "hearts", move: "snug", ms: 4600, counter: false },
    { id: "star",  name: "!star",  enabled: true, responses: ["Wünsch dir was, {user}! ✦"], chatReply: "", fx: "shoot", move: "hop", ms: 4600, counter: false },
    { id: "dance", name: "!dance", enabled: true, responses: ["{user} will tanzen! Haltet eure Sternbilder fest."], chatReply: "", fx: "stars", move: "dance", ms: 2800, counter: false },
    { id: "lurk",  name: "!lurk",  enabled: true, responses: ["{user} driftet in den Nebel. Sichere Umlaufbahn!"], chatReply: "Sichere Umlaufbahn, @{user}! ✦", fx: "stars", move: "hop", ms: 4600, counter: false },
    { id: "sleep", name: "!sleep", enabled: true, responses: ["{user} sagt: Zeit für ein Nickerchen… zzz"], chatReply: "", fx: "zzz", move: "nap", ms: 3800, counter: false },
  ],
  events: {
    sub:     { enabled: true, text: "{user} hat abonniert! Ein neuer Stern ist geboren.", chatReply: "Danke für das Abo, @{user}! ✦", fx: "burst", move: "dance", ms: 5200 },
    gift:    { enabled: true, text: "{user} verschenkt {n} Abo(s)! Es regnet Sterne!", chatReply: "", fx: "burst", move: "dance", ms: 5200 },
    raid:    { enabled: true, text: "RAID von {from} mit {n} Sternen! Willkommen!", chatReply: "Willkommen, Raider von {from}! ✦", fx: "burst", move: "dance", ms: 5600 },
    bits:    { enabled: true, text: "{user} hat {n} Bits gecheert! Pures Sternenstaub.", chatReply: "", fx: "burst", move: "hop", ms: 4800 },
    firstMsg:{ enabled: true, text: "Zum ersten Mal hier, {user}? Willkommen an Bord!", chatReply: "", fx: "stars", move: "hop", ms: 4600 },
  },
};
