import { useState, useEffect } from "react";
import { store } from "./store";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { fetchAllEvents, getWeekRange, getMonthRange, formatTime, formatDateShort, isSameDay } from "./calendar";

const PAGES = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "agenda", label: "Agenda", icon: "📅" },
  { id: "pos", label: "Pós-Graduação", icon: "🎓" },
  { id: "ingles", label: "Inglês", icon: "🇺🇸" },
  { id: "cursos", label: "Cursos Livres", icon: "📚" },
  { id: "biblioteca", label: "Biblioteca", icon: "📖" },
  { id: "links", label: "Links Úteis", icon: "🔗" },
];

const BOOK_STATUSES = [
  { id: "quero", label: "Quero ler", icon: "💭", color: "#c4b5fd" },
  { id: "lendo", label: "Lendo", icon: "📖", color: "#93c5fd" },
  { id: "lido", label: "Lido", icon: "✅", color: "#a7f3d0" },
  { id: "desisti", label: "Desisti", icon: "🚫", color: "#fca5a5" },
];

const uid = () => Math.random().toString(36).slice(2, 9);

const palette = {
  lilac: "#ddd6fe", lilacDark: "#a78bfa", lilacDeep: "#7c3aed",
  pink: "#fbcfe8", pinkDark: "#f472b6",
  blue: "#bfdbfe", blueDark: "#60a5fa",
  bg: "#faf5ff", card: "#ffffff", text: "#4c1d95", textLight: "#6d28d9",
  textMuted: "#8b5cf6", border: "#ede9fe",
  danger: "#fca5a5", dangerDark: "#ef4444",
  green: "#a7f3d0", greenDark: "#10b981",
};

const font = `'Quicksand', 'Nunito', sans-serif`;

/* ─── Shared Components ─── */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(124,58,237,0.18)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, padding: "28px 32px", minWidth: 340, maxWidth: 520, width: "90%", boxShadow: "0 20px 60px rgba(124,58,237,0.18)", fontFamily: font, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: palette.text, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: palette.textMuted, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style: s = {}, small = false }) {
  const base = { fontFamily: font, border: "none", cursor: "pointer", fontWeight: 600, borderRadius: small ? 10 : 14, padding: small ? "6px 14px" : "10px 20px", fontSize: small ? 13 : 14, transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 6 };
  const variants = { primary: { background: palette.lilacDark, color: "#fff" }, secondary: { background: palette.lilac, color: palette.text }, pink: { background: palette.pink, color: palette.text }, blue: { background: palette.blue, color: palette.text }, danger: { background: palette.danger, color: palette.dangerDark }, ghost: { background: "transparent", color: palette.textMuted, padding: "6px 10px" } };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...s }}>{children}</button>;
}

function Input({ value, onChange, placeholder, style: s = {}, multiline = false, type = "text" }) {
  const base = { fontFamily: font, border: `2px solid ${palette.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", color: palette.text, background: palette.bg, transition: "border-color 0.2s", resize: multiline ? "vertical" : "none" };
  if (multiline) return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...base, ...s }} />;
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...base, ...s }} />;
}

function EmptyState({ icon, text }) {
  return <div style={{ textAlign: "center", padding: "40px 20px", color: palette.textMuted, fontFamily: font, fontSize: 15 }}><div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>{text}</div>;
}

function Card({ children, style: s = {} }) {
  return <div style={{ background: palette.card, borderRadius: 20, padding: "20px 24px", boxShadow: "0 2px 16px rgba(124,58,237,0.06)", border: `1px solid ${palette.border}`, ...s }}>{children}</div>;
}

function DeleteBtn({ onClick }) {
  return <button onClick={onClick} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: palette.textMuted, padding: "4px 6px", borderRadius: 8, transition: "all 0.2s", opacity: 0.5, flexShrink: 0 }} onMouseEnter={e => { e.target.style.opacity = 1; e.target.style.color = palette.dangerDark; }} onMouseLeave={e => { e.target.style.opacity = 0.5; e.target.style.color = palette.textMuted; }}>🗑️</button>;
}

function ProgressBar({ percent, size = "normal" }) {
  const h = size === "small" ? 8 : 14;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height: h, background: palette.border, borderRadius: h, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: `linear-gradient(90deg, ${palette.lilacDark}, ${palette.pinkDark})`, borderRadius: h, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontFamily: font, fontSize: size === "small" ? 11 : 13, fontWeight: 700, color: percent === 100 ? palette.greenDark : palette.textLight, minWidth: 40, textAlign: "right" }}>{Math.round(percent)}%</span>
    </div>
  );
}

function getSubjectProgress(s) {
  const totalVideos = s.classes.reduce((a, c) => a + c.videos.length, 0);
  const doneVideos = s.classes.reduce((a, c) => a + c.videos.filter(v => v.done).length, 0);
  const hasExam = s.hasExam !== false;
  const totalItems = totalVideos + (hasExam ? 1 : 0);
  const doneItems = doneVideos + (hasExam && s.examDone ? 1 : 0);
  return totalItems > 0 ? (doneItems / totalItems) * 100 : 0;
}

/* ─── Agenda Page ─── */
function AgendaPage({ accessToken }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    setLoading(true);
    const { start, end } = getMonthRange(year, month);
    fetchAllEvents(accessToken, start, end).then(({ events: evs }) => {
      setEvents(evs);
      setLoading(false);
    });
  }, [accessToken, year, month]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const monthName = viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getEventsForDay = (day) => {
    const date = new Date(year, month, day);
    return events.filter(ev => {
      const evDate = new Date(ev.start);
      return isSameDay(evDate, date);
    });
  };

  if (!accessToken) return <EmptyState icon="📅" text="Reconecte sua conta Google para ver sua agenda" />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Btn onClick={prevMonth} variant="secondary" small>◀ Anterior</Btn>
        <h3 style={{ margin: 0, color: palette.text, fontFamily: font, fontSize: 18, fontWeight: 800, textTransform: "capitalize" }}>{monthName}</h3>
        <Btn onClick={nextMonth} variant="secondary" small>Próximo ▶</Btn>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, fontFamily: font, color: palette.textMuted }}>
          <div style={{ fontSize: 36, marginBottom: 8, animation: "pulse 1.5s infinite" }}>📅</div>Carregando eventos...
        </div>
      ) : (
        <Card style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
            {dayNames.map(d => (<div key={d} style={{ textAlign: "center", fontFamily: font, fontSize: 12, fontWeight: 700, color: palette.textMuted, padding: "6px 0" }}>{d}</div>))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: firstDayOfWeek }, (_, i) => (<div key={`e-${i}`} style={{ minHeight: 80 }} />))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(new Date(year, month, day), today);
              return (
                <div key={day} style={{ minHeight: 80, borderRadius: 12, padding: "6px 8px", background: isToday ? palette.lilac : palette.bg, border: isToday ? `2px solid ${palette.lilacDark}` : `1px solid ${palette.border}` }}>
                  <div style={{ fontFamily: font, fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? palette.lilacDeep : palette.text, marginBottom: 4 }}>{day}</div>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} style={{ fontFamily: font, fontSize: 10, color: "#fff", background: ev.calendarColor || palette.lilacDark, borderRadius: 6, padding: "2px 6px", marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontWeight: 600 }} title={`${ev.title}${ev.allDay ? "" : ` · ${formatTime(ev.start)}`}`}>
                      {ev.allDay ? "" : `${formatTime(ev.start)} `}{ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div style={{ fontFamily: font, fontSize: 9, color: palette.textMuted, textAlign: "center" }}>+{dayEvents.length - 3}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {!loading && events.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontFamily: font, color: palette.text, fontSize: 15, marginBottom: 12 }}>📋 Eventos do mês</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map(ev => (
              <Card key={ev.id + ev.calendarId} style={{ padding: "12px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 4, height: 36, borderRadius: 4, background: ev.calendarColor || palette.lilacDark, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: palette.text }}>{ev.title}</div>
                    <div style={{ fontFamily: font, fontSize: 12, color: palette.textMuted }}>
                      {formatDateShort(ev.start)}{ev.allDay ? " · Dia inteiro" : ` · ${formatTime(ev.start)} - ${formatTime(ev.end)}`}
                    </div>
                    {ev.location && <div style={{ fontFamily: font, fontSize: 11, color: palette.blueDark, marginTop: 2 }}>📍 {ev.location}</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Week Events Widget (Home) ─── */
function WeekEventsWidget({ accessToken }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    const { start, end } = getWeekRange();
    fetchAllEvents(accessToken, start, end).then(({ events: evs }) => {
      setEvents(evs);
      setLoading(false);
    });
  }, [accessToken]);

  if (!accessToken) return (
    <Card><h4 style={{ margin: "0 0 10px 0", fontFamily: font, color: palette.text, fontSize: 15 }}>📅 Agenda da Semana</h4>
      <div style={{ fontFamily: font, color: palette.textMuted, fontSize: 13, textAlign: "center", padding: 12 }}>Faça logout e login novamente para conectar o calendário 🌙</div></Card>
  );

  if (loading) return (
    <Card><h4 style={{ margin: "0 0 10px 0", fontFamily: font, color: palette.text, fontSize: 15 }}>📅 Agenda da Semana</h4>
      <div style={{ fontFamily: font, color: palette.textMuted, fontSize: 13, textAlign: "center", padding: 12 }}>Carregando...</div></Card>
  );

  const grouped = {};
  events.forEach(ev => {
    const d = new Date(ev.start);
    const key = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  });

  return (
    <Card>
      <h4 style={{ margin: "0 0 14px 0", fontFamily: font, color: palette.text, fontSize: 15 }}>📅 Agenda da Semana</h4>
      {events.length === 0 ? (
        <div style={{ fontFamily: font, color: palette.textMuted, fontSize: 13, textAlign: "center", padding: 12 }}>Semana livre! 🎉</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              <div style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: palette.lilacDeep, marginBottom: 6, textTransform: "capitalize" }}>{day}</div>
              {dayEvents.map(ev => (
                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, background: palette.bg, borderRadius: 10, padding: "8px 12px", marginBottom: 4 }}>
                  <div style={{ width: 3, height: 24, borderRadius: 3, background: ev.calendarColor || palette.pinkDark, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: palette.text }}>{ev.title}</div>
                    <div style={{ fontFamily: font, fontSize: 11, color: palette.textMuted }}>{ev.allDay ? "Dia inteiro" : `${formatTime(ev.start)} - ${formatTime(ev.end)}`}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─── Inglês Page ─── */
function SimpleStudyPage({ data, setData }) {
  const [tab, setTab] = useState("notes");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const tabs = [{ id: "notes", label: "Anotações", icon: "📝" }, { id: "schedule", label: "Cronograma", icon: "📅" }, { id: "links", label: "Links & Materiais", icon: "🔗" }];
  const save = (field, items) => setData({ ...data, [field]: items });
  const addItem = () => {
    if (tab === "notes" && form.title) save("notes", [...data.notes, { id: uid(), title: form.title, content: form.content || "", date: new Date().toLocaleDateString("pt-BR") }]);
    else if (tab === "schedule" && form.title) save("schedule", [...data.schedule, { id: uid(), title: form.title, date: form.date || "", done: false }]);
    else if (tab === "links" && form.title) save("links", [...data.links, { id: uid(), title: form.title, url: form.url || "", tag: form.tag || "" }]);
    setForm({}); setModal(null);
  };
  const deleteItem = (field, id) => save(field, data[field].filter(i => i.id !== id));
  const toggleDone = (id) => save("schedule", data.schedule.map(i => i.id === id ? { ...i, done: !i.done } : i));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>{tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ fontFamily: font, border: "none", cursor: "pointer", fontWeight: 600, borderRadius: 14, padding: "10px 18px", fontSize: 14, background: tab === t.id ? palette.lilacDark : palette.lilac, color: tab === t.id ? "#fff" : palette.text, transition: "all 0.2s" }}>{t.icon} {t.label}</button>))}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ margin: 0, color: palette.text, fontFamily: font, fontSize: 17 }}>{tabs.find(t => t.id === tab)?.icon} {tabs.find(t => t.id === tab)?.label}</h3><Btn onClick={() => setModal("add")} small>＋ Adicionar</Btn></div>
      {tab === "notes" && (data.notes.length === 0 ? <EmptyState icon="📝" text="Nenhuma anotação ainda..." /> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{data.notes.map(n => (<Card key={n.id}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div><div style={{ fontWeight: 700, color: palette.text, fontFamily: font, fontSize: 15 }}>{n.title}</div><div style={{ color: palette.textMuted, fontSize: 12, marginTop: 2, fontFamily: font }}>{n.date}</div>{n.content && <div style={{ color: palette.textLight, fontSize: 14, marginTop: 8, fontFamily: font, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{n.content}</div>}</div><DeleteBtn onClick={() => deleteItem("notes", n.id)} /></div></Card>))}</div>)}
      {tab === "schedule" && (data.schedule.length === 0 ? <EmptyState icon="📅" text="Cronograma vazio..." /> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{data.schedule.map(s => (<Card key={s.id} style={{ padding: "14px 20px" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><button onClick={() => toggleDone(s.id)} style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${s.done ? palette.lilacDark : palette.border}`, background: s.done ? palette.lilacDark : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", transition: "all 0.2s", flexShrink: 0 }}>{s.done ? "✓" : ""}</button><div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: palette.text, fontFamily: font, fontSize: 14, textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.5 : 1 }}>{s.title}</div>{s.date && <div style={{ color: palette.textMuted, fontSize: 12, fontFamily: font, marginTop: 2 }}>{s.date}</div>}</div><DeleteBtn onClick={() => deleteItem("schedule", s.id)} /></div></Card>))}</div>)}
      {tab === "links" && (data.links.length === 0 ? <EmptyState icon="🔗" text="Nenhum link salvo..." /> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{data.links.map(l => (<Card key={l.id} style={{ padding: "14px 20px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontWeight: 600, color: palette.text, fontFamily: font, fontSize: 14 }}>{l.title}</div>{l.url && <div style={{ fontSize: 12, color: palette.blueDark, fontFamily: font, marginTop: 2, wordBreak: "break-all" }}>{l.url}</div>}{l.tag && <span style={{ display: "inline-block", marginTop: 6, background: palette.pink, color: palette.text, fontFamily: font, fontSize: 11, fontWeight: 600, borderRadius: 8, padding: "3px 10px" }}>{l.tag}</span>}</div><DeleteBtn onClick={() => deleteItem("links", l.id)} /></div></Card>))}</div>)}
      <Modal open={modal === "add"} onClose={() => { setModal(null); setForm({}); }} title={`Adicionar ${tabs.find(t => t.id === tab)?.label}`}><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><Input value={form.title || ""} onChange={v => setForm({ ...form, title: v })} placeholder="Título" />{tab === "notes" && <Input value={form.content || ""} onChange={v => setForm({ ...form, content: v })} placeholder="Conteúdo..." multiline />}{tab === "schedule" && <Input value={form.date || ""} onChange={v => setForm({ ...form, date: v })} placeholder="Data (ex: 20/04/2026)" />}{tab === "links" && (<><Input value={form.url || ""} onChange={v => setForm({ ...form, url: v })} placeholder="URL" /><Input value={form.tag || ""} onChange={v => setForm({ ...form, tag: v })} placeholder="Tag" /></>)}<Btn onClick={addItem} style={{ marginTop: 4, alignSelf: "flex-end" }}>Salvar 💜</Btn></div></Modal>
    </div>
  );
}

/* ─── Pós-Graduação Page ─── */
function PosPage({ data, setData }) {
  const [modal, setModal] = useState(null); const [form, setForm] = useState({}); const [expandedSubject, setExpandedSubject] = useState(null);
  const subjects = data.subjects || [];
  const addSubject = () => { if (!form.name) return; setData({ ...data, subjects: [...subjects, { id: uid(), name: form.name, classes: [1,2,3].map(c => ({ id: uid(), name: `Aula ${c}`, videos: [1,2,3,4].map(v => ({ id: uid(), name: `Vídeo ${v}`, done: false })) })), examDone: false, hasExam: true }] }); setForm({}); setModal(null); };
  const toggleVideo = (sid, cid, vid) => setData({ ...data, subjects: subjects.map(s => s.id !== sid ? s : { ...s, classes: s.classes.map(c => c.id !== cid ? c : { ...c, videos: c.videos.map(v => v.id !== vid ? v : { ...v, done: !v.done }) }) }) });
  const toggleExam = (sid) => setData({ ...data, subjects: subjects.map(s => s.id !== sid ? s : { ...s, examDone: !s.examDone }) });
  const deleteSubject = (id) => setData({ ...data, subjects: subjects.filter(s => s.id !== id) });
  const getTotalProgress = () => subjects.length === 0 ? 0 : subjects.reduce((a, s) => a + getSubjectProgress(s), 0) / subjects.length;

  return (
    <div>
      {subjects.length > 0 && <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #ede9fe, #fce7f3)" }}><div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: palette.text, marginBottom: 8 }}>📊 Progresso Geral da Pós</div><ProgressBar percent={getTotalProgress()} /></Card>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ margin: 0, color: palette.text, fontFamily: font, fontSize: 17 }}>🎓 Matérias</h3><Btn onClick={() => setModal("add")} small>＋ Nova Matéria</Btn></div>
      {subjects.length === 0 ? <EmptyState icon="🎓" text="Nenhuma matéria cadastrada ainda..." /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{subjects.map(s => { const progress = getSubjectProgress(s); const isOpen = expandedSubject === s.id; return (
          <Card key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ cursor: "pointer", flex: 1 }} onClick={() => setExpandedSubject(isOpen ? null : s.id)}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0)" }}>▶</span><div style={{ fontWeight: 700, color: palette.text, fontFamily: font, fontSize: 15 }}>{s.name}</div>{progress === 100 && <span style={{ fontSize: 14 }}>✅</span>}</div><div style={{ marginTop: 8, maxWidth: 400 }}><ProgressBar percent={progress} size="small" /></div></div><DeleteBtn onClick={() => deleteSubject(s.id)} /></div>
            {isOpen && (<div style={{ marginTop: 16, paddingLeft: 8 }}>{s.classes.map(c => { const cd = c.videos.filter(v => v.done).length; return (<div key={c.id} style={{ marginBottom: 14 }}><div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: palette.textLight, marginBottom: 6 }}>📘 {c.name} <span style={{ fontWeight: 500, color: palette.textMuted }}>({cd}/{c.videos.length})</span></div><div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 8 }}>{c.videos.map(v => (<button key={v.id} onClick={() => toggleVideo(s.id, c.id, v.id)} style={{ fontFamily: font, border: `2px solid ${v.done ? palette.greenDark : palette.border}`, borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: v.done ? palette.green : "#fff", color: v.done ? palette.greenDark : palette.textMuted, transition: "all 0.2s" }}>{v.done ? "✓ " : ""}{v.name}</button>))}</div></div>); })}{s.hasExam !== false && (<div style={{ marginTop: 8, borderTop: `1px solid ${palette.border}`, paddingTop: 12, display: "flex", alignItems: "center", gap: 10 }}><button onClick={() => toggleExam(s.id)} style={{ fontFamily: font, border: `2px solid ${s.examDone ? palette.greenDark : palette.border}`, borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: s.examDone ? palette.green : "#fff", color: s.examDone ? palette.greenDark : palette.textMuted, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>{s.examDone ? "✅" : "📝"} Prova {s.examDone ? "(Concluída)" : "(Pendente)"}</button>{s.tccNote && <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: palette.lilacDeep, background: palette.lilac, borderRadius: 10, padding: "5px 12px" }}>⭐ Nota: {s.tccNote}</span>}</div>)}</div>)}
          </Card>); })}</div>}
      <Modal open={modal === "add"} onClose={() => { setModal(null); setForm({}); }} title="Nova Matéria"><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><Input value={form.name || ""} onChange={v => setForm({ ...form, name: v })} placeholder="Nome da matéria" /><div style={{ fontFamily: font, fontSize: 12, color: palette.textMuted, background: palette.bg, borderRadius: 10, padding: "10px 14px" }}>ℹ️ 3 aulas × 4 vídeos + 1 prova</div><Btn onClick={addSubject} style={{ alignSelf: "flex-end" }}>Adicionar 🎓</Btn></div></Modal>
    </div>
  );
}

/* ─── Cursos Livres ─── */
function CursosPage({ data, setData }) {
  const [modal, setModal] = useState(null); const [form, setForm] = useState({ modules: [{ name: "Módulo 1", lessonCount: 3 }] }); const [expandedCourse, setExpandedCourse] = useState(null);
  const courses = data.courses || [];
  const addModuleToForm = () => setForm({ ...form, modules: [...form.modules, { name: `Módulo ${form.modules.length + 1}`, lessonCount: 3 }] });
  const removeModuleFromForm = (idx) => { if (form.modules.length <= 1) return; setForm({ ...form, modules: form.modules.filter((_, i) => i !== idx) }); };
  const updateFormModule = (idx, field, val) => { const m = [...form.modules]; m[idx] = { ...m[idx], [field]: val }; setForm({ ...form, modules: m }); };
  const addCourse = () => { if (!form.name) return; setData({ ...data, courses: [...courses, { id: uid(), name: form.name, link: form.link || "", modules: form.modules.map((m, mi) => ({ id: uid(), name: m.name || `Módulo ${mi+1}`, lessons: Array.from({ length: parseInt(m.lessonCount)||1 }, (_,li) => ({ id: uid(), name: `Aula ${li+1}`, done: false })) })) }] }); setForm({ modules: [{ name: "Módulo 1", lessonCount: 3 }] }); setModal(null); };
  const toggleLesson = (cid, mid, lid) => setData({ ...data, courses: courses.map(c => c.id !== cid ? c : { ...c, modules: c.modules.map(m => m.id !== mid ? m : { ...m, lessons: m.lessons.map(l => l.id !== lid ? l : { ...l, done: !l.done }) }) }) });
  const deleteCourse = (id) => setData({ ...data, courses: courses.filter(c => c.id !== id) });
  const getCourseProgress = (c) => { const t = c.modules.reduce((a,m) => a+m.lessons.length,0); const d = c.modules.reduce((a,m) => a+m.lessons.filter(l=>l.done).length,0); return t>0?(d/t)*100:0; };
  const getTotalProgress = () => courses.length === 0 ? 0 : courses.reduce((a,c) => a+getCourseProgress(c),0)/courses.length;

  return (
    <div>
      {courses.length > 0 && <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #dbeafe, #fce7f3)" }}><div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: palette.text, marginBottom: 8 }}>📊 Progresso Geral</div><ProgressBar percent={getTotalProgress()} /></Card>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ margin: 0, color: palette.text, fontFamily: font, fontSize: 17 }}>📚 Meus Cursos</h3><Btn onClick={() => setModal("add")} small>＋ Novo Curso</Btn></div>
      {courses.length === 0 ? <EmptyState icon="📚" text="Nenhum curso cadastrado..." /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{courses.map(c => { const p = getCourseProgress(c); const isOpen = expandedCourse === c.id; return (
          <Card key={c.id}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ cursor: "pointer", flex: 1 }} onClick={() => setExpandedCourse(isOpen ? null : c.id)}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, transform: isOpen ? "rotate(90deg)" : "rotate(0)", display: "inline-block", transition: "transform 0.2s" }}>▶</span><div style={{ fontWeight: 700, color: palette.text, fontFamily: font, fontSize: 15 }}>{c.name}</div>{p === 100 && <span>🎉</span>}</div>{c.link && <div style={{ fontSize: 12, color: palette.blueDark, fontFamily: font, marginTop: 3, paddingLeft: 20, wordBreak: "break-all" }}>🔗 {c.link}</div>}<div style={{ marginTop: 8, maxWidth: 400 }}><ProgressBar percent={p} size="small" /></div></div><DeleteBtn onClick={() => deleteCourse(c.id)} /></div>
            {isOpen && (<div style={{ marginTop: 16, paddingLeft: 8 }}>{c.modules.map(m => { const md = m.lessons.filter(l=>l.done).length; return (<div key={m.id} style={{ marginBottom: 14 }}><div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: palette.textLight, marginBottom: 6 }}>📦 {m.name} ({md}/{m.lessons.length})</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 8 }}>{m.lessons.map(l => (<button key={l.id} onClick={() => toggleLesson(c.id, m.id, l.id)} style={{ fontFamily: font, border: `2px solid ${l.done ? palette.greenDark : palette.border}`, borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: l.done ? palette.green : "#fff", color: l.done ? palette.greenDark : palette.textMuted, transition: "all 0.2s" }}>{l.done ? "✓ " : ""}{l.name}</button>))}</div></div>); })}</div>)}
          </Card>); })}</div>}
      <Modal open={modal === "add"} onClose={() => { setModal(null); setForm({ modules: [{ name: "Módulo 1", lessonCount: 3 }] }); }} title="Novo Curso"><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><Input value={form.name||""} onChange={v => setForm({...form,name:v})} placeholder="Nome do curso" /><Input value={form.link||""} onChange={v => setForm({...form,link:v})} placeholder="Link do curso (opcional)" /><div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: palette.text, marginTop: 4 }}>📦 Módulos</div>{form.modules.map((m,i) => (<div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}><Input value={m.name} onChange={v => updateFormModule(i,"name",v)} placeholder={`Módulo ${i+1}`} style={{ flex: 2 }} /><Input value={m.lessonCount} onChange={v => updateFormModule(i,"lessonCount",v)} placeholder="Aulas" type="number" style={{ flex: 1 }} />{form.modules.length > 1 && <button onClick={() => removeModuleFromForm(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: palette.dangerDark, padding: 4 }}>×</button>}</div>))}<Btn onClick={addModuleToForm} variant="secondary" small>＋ Módulo</Btn><Btn onClick={addCourse} style={{ alignSelf: "flex-end", marginTop: 4 }}>Salvar 📚</Btn></div></Modal>
    </div>
  );
}

/* ─── Library ─── */
const GENRES = [{ id: "ficcao", label: "Ficção", color: "#c4b5fd" },{ id: "romance", label: "Romance", color: "#fbcfe8" },{ id: "autoajuda", label: "Autoajuda", color: "#a7f3d0" },{ id: "negocios", label: "Negócios", color: "#93c5fd" },{ id: "biografia", label: "Biografia", color: "#fde68a" },{ id: "fantasia", label: "Fantasia", color: "#ddd6fe" },{ id: "suspense", label: "Suspense", color: "#fca5a5" },{ id: "psicologia", label: "Psicologia", color: "#a5f3fc" },{ id: "educacao", label: "Educação", color: "#bfdbfe" },{ id: "outro", label: "Outro", color: "#e0f2fe" }];

function LibraryPage({ books, setBooks }) {
  const [modal, setModal] = useState(null); const [form, setForm] = useState({}); const [filter, setFilter] = useState("all"); const [genreFilter, setGenreFilter] = useState("all");
  const addBook = () => { if (!form.title) return; setBooks([...books, { id: uid(), title: form.title, author: form.author||"", status: form.status||"quero", rating: 0, pages: form.pages||"", genre: form.genre||"outro", startDate: form.startDate||"", endDate: form.endDate||"" }]); setForm({}); setModal(null); };
  const editBook = () => { if (!form.title || !form.editId) return; setBooks(books.map(b => b.id !== form.editId ? b : { ...b, title: form.title, author: form.author||"", pages: form.pages||"", genre: form.genre||b.genre, startDate: form.startDate||"", endDate: form.endDate||"", status: form.status||b.status })); setForm({}); setModal(null); };
  const openEdit = (b) => { setForm({ editId: b.id, title: b.title, author: b.author, pages: b.pages, genre: b.genre, startDate: b.startDate, endDate: b.endDate, status: b.status }); setModal("edit"); };
  const deleteBook = (id) => setBooks(books.filter(b => b.id !== id));
  const cycleStatus = (id) => { const order = ["quero","lendo","lido","desisti"]; setBooks(books.map(b => { if (b.id !== id) return b; const idx = order.indexOf(b.status); const ns = order[(idx+1)%order.length]; const u = { status: ns }; if (ns==="lendo"&&!b.startDate) u.startDate=new Date().toLocaleDateString("pt-BR"); if (ns==="lido"&&!b.endDate) u.endDate=new Date().toLocaleDateString("pt-BR"); return {...b,...u}; })); };
  const setRating = (id, r) => setBooks(books.map(b => b.id === id ? { ...b, rating: r } : b));
  let filtered = filter === "all" ? books : books.filter(b => b.status === filter);
  if (genreFilter !== "all") filtered = filtered.filter(b => b.genre === genreFilter);
  const counts = { all: books.length, quero: books.filter(b=>b.status==="quero").length, lendo: books.filter(b=>b.status==="lendo").length, lido: books.filter(b=>b.status==="lido").length, desisti: books.filter(b=>b.status==="desisti").length };

  const totalPagesRead = books.filter(b => b.status === "lido" && b.pages).reduce((a, b) => a + (parseInt(b.pages) || 0), 0);
  const totalPagesReading = books.filter(b => b.status === "lendo" && b.pages).reduce((a, b) => a + (parseInt(b.pages) || 0), 0);
  const booksRead = books.filter(b => b.status === "lido").length;

  const bookFormFields = (<>
    <Input value={form.title||""} onChange={v => setForm({...form,title:v})} placeholder="Título" />
    <Input value={form.author||""} onChange={v => setForm({...form,author:v})} placeholder="Autor(a)" />
    <Input value={form.pages||""} onChange={v => setForm({...form,pages:v})} placeholder="Número de páginas" type="number" />
    <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: palette.text }}>Gênero</div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{GENRES.map(g => (<button key={g.id} onClick={() => setForm({...form,genre:g.id})} style={{ fontFamily: font, border: `2px solid ${(form.genre||"outro")===g.id ? palette.lilacDark : "transparent"}`, borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, background: g.color, color: palette.text, cursor: "pointer" }}>{g.label}</button>))}</div>
    <div style={{ display: "flex", gap: 8 }}><div style={{ flex: 1 }}><div style={{ fontFamily: font, fontSize: 12, color: palette.textMuted, marginBottom: 4 }}>Início</div><Input value={form.startDate||""} onChange={v => setForm({...form,startDate:v})} placeholder="dd/mm/aaaa" /></div><div style={{ flex: 1 }}><div style={{ fontFamily: font, fontSize: 12, color: palette.textMuted, marginBottom: 4 }}>Fim</div><Input value={form.endDate||""} onChange={v => setForm({...form,endDate:v})} placeholder="dd/mm/aaaa" /></div></div>
    <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: palette.text }}>Status</div>
    <div style={{ display: "flex", gap: 8 }}>{BOOK_STATUSES.map(s => (<button key={s.id} onClick={() => setForm({...form,status:s.id})} style={{ flex: 1, fontFamily: font, border: `2px solid ${(form.status||"quero")===s.id ? palette.lilacDark : "transparent"}`, borderRadius: 12, padding: "8px", fontSize: 12, fontWeight: 600, background: s.color, color: palette.text, cursor: "pointer" }}>{s.icon} {s.label}</button>))}</div>
  </>);

  return (
    <div>
      {/* Stats bar */}
      {books.length > 0 && (
        <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #ede9fe, #fce7f3)", padding: "16px 24px" }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: palette.text }}>{booksRead}</div><div style={{ fontFamily: font, fontSize: 11, color: palette.textLight, fontWeight: 600 }}>Livros lidos</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: palette.text }}>{totalPagesRead.toLocaleString("pt-BR")}</div><div style={{ fontFamily: font, fontSize: 11, color: palette.textLight, fontWeight: 600 }}>Páginas lidas</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: palette.text }}>{totalPagesReading.toLocaleString("pt-BR")}</div><div style={{ fontFamily: font, fontSize: 11, color: palette.textLight, fontWeight: 600 }}>Páginas em andamento</div></div>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>{[{ id: "all", label: "Todos", icon: "📚", color: palette.lilac }, ...BOOK_STATUSES].map(s => (<button key={s.id} onClick={() => setFilter(s.id)} style={{ fontFamily: font, border: "none", cursor: "pointer", borderRadius: 14, padding: "10px 16px", fontSize: 13, fontWeight: 600, background: filter === s.id ? (s.id === "all" ? palette.lilacDark : s.color) : "#f5f3ff", color: filter === s.id ? (s.id === "all" ? "#fff" : palette.text) : palette.textMuted, transition: "all 0.2s" }}>{s.icon} {s.label} ({counts[s.id]})</button>))}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}><button onClick={() => setGenreFilter("all")} style={{ fontFamily: font, border: "none", cursor: "pointer", borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 600, background: genreFilter==="all" ? palette.lilacDark : "#f5f3ff", color: genreFilter==="all" ? "#fff" : palette.textMuted }}>Todos gêneros</button>{GENRES.map(g => { const c = books.filter(b=>b.genre===g.id).length; if(!c) return null; return <button key={g.id} onClick={() => setGenreFilter(g.id)} style={{ fontFamily: font, border: "none", cursor: "pointer", borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 600, background: genreFilter===g.id ? g.color : "#f5f3ff", color: genreFilter===g.id ? palette.text : palette.textMuted }}>{g.label} ({c})</button>; })}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ margin: 0, color: palette.text, fontFamily: font, fontSize: 17 }}>📖 Minha Biblioteca</h3><Btn onClick={() => { setForm({}); setModal("add"); }} small>＋ Adicionar livro</Btn></div>
      {filtered.length === 0 ? <EmptyState icon="📖" text="Nenhum livro aqui ainda..." /> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>{filtered.map(b => { const st = BOOK_STATUSES.find(s=>s.id===b.status); const genre = GENRES.find(g=>g.id===b.genre); return (
          <Card key={b.id} style={{ padding: "18px 20px", position: "relative" }}>
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 2 }}>
              <button onClick={() => openEdit(b)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: palette.textMuted, padding: "4px 6px", borderRadius: 8, opacity: 0.5, transition: "all 0.2s" }} onMouseEnter={e => { e.target.style.opacity = 1; }} onMouseLeave={e => { e.target.style.opacity = 0.5; }}>✏️</button>
              <DeleteBtn onClick={() => deleteBook(b.id)} />
            </div>
            {genre && <span style={{ display: "inline-block", background: genre.color, color: palette.text, fontFamily: font, fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "2px 8px", marginBottom: 6 }}>{genre.label}</span>}
            <div style={{ fontWeight: 700, color: palette.text, fontFamily: font, fontSize: 15, paddingRight: 48 }}>{b.title}</div>
            {b.author && <div style={{ color: palette.textMuted, fontSize: 13, fontFamily: font, marginTop: 2 }}>{b.author}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {b.pages && <span style={{ fontFamily: font, fontSize: 11, color: palette.textMuted, background: palette.bg, borderRadius: 8, padding: "3px 8px" }}>📄 {b.pages} págs</span>}
              {b.startDate && <span style={{ fontFamily: font, fontSize: 11, color: palette.textMuted, background: palette.bg, borderRadius: 8, padding: "3px 8px" }}>📅 {b.startDate}</span>}
              {b.endDate && <span style={{ fontFamily: font, fontSize: 11, color: palette.textMuted, background: palette.bg, borderRadius: 8, padding: "3px 8px" }}>🏁 {b.endDate}</span>}
            </div>
            <button onClick={() => cycleStatus(b.id)} style={{ display: "inline-block", marginTop: 10, background: st.color, color: palette.text, fontFamily: font, fontSize: 12, fontWeight: 700, borderRadius: 10, padding: "5px 12px", border: "none", cursor: "pointer" }}>{st.icon} {st.label}</button>
            {b.status === "lido" && (<div style={{ marginTop: 8 }}>{[1,2,3,4,5].map(star => (<span key={star} onClick={() => setRating(b.id, star)} style={{ cursor: "pointer", fontSize: 18, filter: star <= b.rating ? "none" : "grayscale(1) opacity(0.3)" }}>⭐</span>))}</div>)}
          </Card>); })}</div>}
      {/* Add Modal */}
      <Modal open={modal === "add"} onClose={() => { setModal(null); setForm({}); }} title="Adicionar Livro"><div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{bookFormFields}<Btn onClick={addBook} style={{ marginTop: 4, alignSelf: "flex-end" }}>Salvar 📖</Btn></div></Modal>
      {/* Edit Modal */}
      <Modal open={modal === "edit"} onClose={() => { setModal(null); setForm({}); }} title="Editar Livro"><div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{bookFormFields}<Btn onClick={editBook} style={{ marginTop: 4, alignSelf: "flex-end" }}>Atualizar 📖</Btn></div></Modal>
    </div>
  );
}

/* ─── Links Úteis ─── */
function LinksPage({ links, setLinks }) {
  const [modal, setModal] = useState(null); const [form, setForm] = useState({});
  const CATEGORIES = [{ id: "trabalho", label: "Trabalho", icon: "💼", color: palette.lilac },{ id: "estudo", label: "Estudo", icon: "📚", color: palette.blue },{ id: "ferramentas", label: "Ferramentas", icon: "🛠️", color: palette.pink },{ id: "outros", label: "Outros", icon: "✨", color: "#e0f2fe" }];
  const [filter, setFilter] = useState("all");
  const addLink = () => { if (!form.title) return; setLinks([...links, { id: uid(), title: form.title, url: form.url||"", description: form.description||"", category: form.category||"outros" }]); setForm({}); setModal(null); };
  const deleteLink = (id) => setLinks(links.filter(l => l.id !== id));
  const filtered = filter === "all" ? links : links.filter(l => l.category === filter);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}><button onClick={() => setFilter("all")} style={{ fontFamily: font, border: "none", cursor: "pointer", borderRadius: 14, padding: "10px 16px", fontSize: 13, fontWeight: 600, background: filter==="all" ? palette.lilacDark : "#f5f3ff", color: filter==="all" ? "#fff" : palette.textMuted }}>🔗 Todos ({links.length})</button>{CATEGORIES.map(c => { const n = links.filter(l=>l.category===c.id).length; return <button key={c.id} onClick={() => setFilter(c.id)} style={{ fontFamily: font, border: "none", cursor: "pointer", borderRadius: 14, padding: "10px 16px", fontSize: 13, fontWeight: 600, background: filter===c.id ? c.color : "#f5f3ff", color: filter===c.id ? palette.text : palette.textMuted }}>{c.icon} {c.label} ({n})</button>; })}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ margin: 0, color: palette.text, fontFamily: font, fontSize: 17 }}>🔗 Meus Links Úteis</h3><Btn onClick={() => setModal("add")} small>＋ Novo Link</Btn></div>
      {filtered.length === 0 ? <EmptyState icon="🔗" text="Nenhum link salvo..." /> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>{filtered.map(l => { const cat = CATEGORIES.find(c=>c.id===l.category)||CATEGORIES[3]; return (
          <Card key={l.id} style={{ padding: "18px 20px", position: "relative", cursor: l.url ? "pointer" : "default" }} onClick={() => { if (l.url) window.open(l.url.startsWith("http") ? l.url : `https://${l.url}`, "_blank"); }}><div style={{ position: "absolute", top: 12, right: 12 }} onClick={e => e.stopPropagation()}><DeleteBtn onClick={() => deleteLink(l.id)} /></div><span style={{ display: "inline-block", background: cat.color, color: palette.text, fontFamily: font, fontSize: 11, fontWeight: 600, borderRadius: 8, padding: "3px 10px", marginBottom: 8 }}>{cat.icon} {cat.label}</span><div style={{ fontWeight: 700, color: palette.text, fontFamily: font, fontSize: 15, paddingRight: 28 }}>{l.title}</div>{l.description && <div style={{ color: palette.textMuted, fontSize: 13, fontFamily: font, marginTop: 4 }}>{l.description}</div>}{l.url && <div style={{ fontSize: 12, color: palette.blueDark, fontFamily: font, marginTop: 6, wordBreak: "break-all" }}>🌐 {l.url}</div>}</Card>); })}</div>}
      <Modal open={modal === "add"} onClose={() => { setModal(null); setForm({}); }} title="Novo Link Útil"><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><Input value={form.title||""} onChange={v => setForm({...form,title:v})} placeholder="Nome" /><Input value={form.url||""} onChange={v => setForm({...form,url:v})} placeholder="URL" /><Input value={form.description||""} onChange={v => setForm({...form,description:v})} placeholder="Descrição (opcional)" /><div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: palette.text }}>Categoria</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{CATEGORIES.map(c => (<button key={c.id} onClick={() => setForm({...form,category:c.id})} style={{ flex: 1, minWidth: 80, fontFamily: font, border: `2px solid ${(form.category||"outros")===c.id ? palette.lilacDark : "transparent"}`, borderRadius: 12, padding: "8px", fontSize: 12, fontWeight: 600, background: c.color, color: palette.text, cursor: "pointer" }}>{c.icon} {c.label}</button>))}</div><Btn onClick={addLink} style={{ alignSelf: "flex-end", marginTop: 4 }}>Salvar 🔗</Btn></div></Modal>
    </div>
  );
}

/* ─── Home ─── */
function HomePage({ inglesData, books, posData, cursosData, accessToken }) {
  const now = new Date(); const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const posSubjects = posData.subjects || [];
  const posProgress = posSubjects.length > 0 ? posSubjects.reduce((a,s) => a+getSubjectProgress(s),0)/posSubjects.length : 0;
  const cursos = cursosData.courses || [];
  const cursosProgress = cursos.length > 0 ? cursos.reduce((a,c) => { const t=c.modules.reduce((x,m)=>x+m.lessons.length,0); const d=c.modules.reduce((x,m)=>x+m.lessons.filter(l=>l.done).length,0); return a+(t>0?(d/t)*100:0); },0)/cursos.length : 0;
  const doneSchedule = inglesData.schedule.filter(s => s.done).length;
  const stats = [{ icon: "🎓", label: "Pós", value: `${Math.round(posProgress)}%`, color: palette.lilac },{ icon: "📚", label: "Cursos", value: `${Math.round(cursosProgress)}%`, color: palette.blue },{ icon: "📅", label: "Inglês", value: `${doneSchedule}/${inglesData.schedule.length}`, color: palette.pink },{ icon: "📖", label: "Livros", value: books.length, color: "#dbeafe" }];
  const pendingSubjects = posSubjects.filter(s => getSubjectProgress(s) < 100);
  const readingBooks = books.filter(b => b.status === "lendo");

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #ddd6fe 0%, #fbcfe8 50%, #bfdbfe 100%)", borderRadius: 24, padding: "32px 28px", marginBottom: 24, position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", top: -20, right: -10, fontSize: 80, opacity: 0.15, transform: "rotate(15deg)" }}>✨</div><div style={{ fontFamily: font, fontSize: 28, fontWeight: 800, color: palette.text }}>{greeting}, Vit! 💜</div><div style={{ fontFamily: font, fontSize: 15, color: palette.textLight, marginTop: 6 }}>{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>{stats.map(s => (<Card key={s.label} style={{ padding: "18px", textAlign: "center", background: s.color }}><div style={{ fontSize: 28 }}>{s.icon}</div><div style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: palette.text, marginTop: 4 }}>{s.value}</div><div style={{ fontFamily: font, fontSize: 12, color: palette.textLight, fontWeight: 600 }}>{s.label}</div></Card>))}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card><h4 style={{ margin: "0 0 14px 0", fontFamily: font, color: palette.text, fontSize: 15 }}>🎓 Pendentes</h4>{pendingSubjects.length === 0 ? <div style={{ fontFamily: font, color: palette.textMuted, fontSize: 13, textAlign: "center", padding: 16 }}>Tudo concluído! 🎉</div> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{pendingSubjects.slice(0,5).map(s => (<div key={s.id} style={{ background: palette.bg, borderRadius: 12, padding: "10px 14px" }}><div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: palette.text, marginBottom: 6 }}>{s.name}</div><ProgressBar percent={getSubjectProgress(s)} size="small" /></div>))}</div>}</Card>
        <Card><h4 style={{ margin: "0 0 14px 0", fontFamily: font, color: palette.text, fontSize: 15 }}>📖 Lendo Agora</h4>{readingBooks.length === 0 ? <div style={{ fontFamily: font, color: palette.textMuted, fontSize: 13, textAlign: "center", padding: 16 }}>Nenhum livro 🌙</div> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{readingBooks.map(b => (<div key={b.id} style={{ background: palette.bg, borderRadius: 12, padding: "10px 14px" }}><div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: palette.text }}>{b.title}</div>{b.author && <div style={{ fontFamily: font, fontSize: 11, color: palette.textMuted }}>{b.author}</div>}</div>))}</div>}</Card>
      </div>
      <WeekEventsWidget accessToken={accessToken} />
    </div>
  );
}

/* ─── Pre-populated data ─── */
const makeSubject = (name, allDone, examDone, hasExam = true) => ({ id: uid(), name, classes: [1,2,3].map(c => ({ id: uid(), name: `Aula ${c}`, videos: [1,2,3,4].map(v => ({ id: uid(), name: `Vídeo ${v}`, done: allDone })) })), examDone, hasExam });
const makeConfigTrabalho = () => { const s = makeSubject("Configurações de trabalho: híbrido, remoto e presencial", false, false); s.classes[0].videos.forEach(v => v.done=true); s.classes[1].videos.forEach(v => v.done=true); s.classes[2].videos[0].done=true; s.classes[2].videos[1].done=true; s.classes[2].videos[2].done=true; return s; };
const makeTCC = () => ({ id: uid(), name: "Aplicação do conhecimento: Prova Final e Preparo para o TCC", classes: [1,2,3].map(c => ({ id: uid(), name: `Aula ${c}`, videos: [1,2,3,4].map(v => ({ id: uid(), name: `Vídeo ${v}`, done: true })) })), examDone: true, hasExam: true, tccNote: "9,7" });
const initialPosSubjects = () => [makeSubject("Saúde, bem-estar e engajamento no trabalho",true,true),makeSubject("Educação corporativa",true,true),makeSubject("Offboarding: Demissões, Mudanças e Aposentadoria",true,true),makeSubject("Empreendedorismo e Intraempreendedorismo no Trabalho",true,true),makeSubject("Gestão da Mudança e Comunicação Organizacional",true,true),makeSubject("Gestão de cargos e movimentação de pessoas",true,true),makeSubject("Atração, Seleção e Onboarding",true,true),makeSubject("Saúde mental e doenças no trabalho",true,true),makeSubject("Cultura e Clima Organizacional",true,true),makeSubject("Carreira e Propósito",true,true),makeSubject("Liderando equipes de alta performance",true,true),makeSubject("Gestão de Conflitos, Gestão de Crise e Tomada de Decisão",true,true),makeSubject("Gestão de Projetos e Metodologias Ágeis",true,true),makeSubject("Legislação Trabalhista e Relações de Trabalho",true,true),makeSubject("Gestão do Conhecimento e Inteligência Organizacional",true,true),makeSubject("Employer Branding: posicionamento e marca do empregador",true,true),makeSubject("Diversidade e Inclusão nas Organizações",true,true),makeSubject("Consultoria Interna de RH: Business Partner",true,true),makeSubject("Flow: criatividade e alta performance",true,true),makeConfigTrabalho(),makeSubject("People Analytics: análise de dados, indicadores, desempenho",false,false),makeSubject("Profissional Integral: consciência e transformação social",false,false,false),makeTCC()];
const initialBooks = () => [
  { id: uid(), title: "Império da Tempestade - tomo 1", author: "Sarah J Maas", genre: "fantasia", status: "lido", rating: 5, pages: "", startDate: "30/12/2025", endDate: "08/01/2026" },
  { id: uid(), title: "Império da Tempestade - tomo 2", author: "Sarah J Maas", genre: "fantasia", status: "lido", rating: 5, pages: "", startDate: "08/01/2026", endDate: "12/01/2026" },
  { id: uid(), title: "Torre do Alvorecer", author: "Sarah J Maas", genre: "fantasia", status: "lido", rating: 5, pages: "", startDate: "12/01/2026", endDate: "20/01/2026" },
  { id: uid(), title: "Reino das Cinzas", author: "Sarah J Maas", genre: "fantasia", status: "lido", rating: 5, pages: "", startDate: "21/01/2026", endDate: "06/02/2026" },
  { id: uid(), title: "Como seduzir a capitã", author: "Sarah Oliveira", genre: "romance", status: "lido", rating: 5, pages: "", startDate: "25/02/2026", endDate: "27/02/2026" },
  { id: uid(), title: "Como seduzir a novata", author: "Helena Vieria", genre: "romance", status: "lido", rating: 4, pages: "", startDate: "27/02/2026", endDate: "03/03/2026" },
  { id: uid(), title: "Eles odeiam garotas como nós", author: "Yasmim Mahmud Kade", genre: "romance", status: "lido", rating: 4, pages: "", startDate: "03/03/2026", endDate: "31/03/2026" },
  { id: uid(), title: "Amanhecer na Colheita", author: "Suzanne Collins", genre: "ficcao", status: "lendo", rating: 0, pages: "", startDate: "06/02/2026", endDate: "" },
  { id: uid(), title: "A Bíblia do Tarot", author: "Rachel Pollack", genre: "outro", status: "quero", rating: 0, pages: "", startDate: "", endDate: "" },
  { id: uid(), title: "A Hospedeira", author: "Stephenie Meyer", genre: "ficcao", status: "quero", rating: 0, pages: "", startDate: "", endDate: "" },
  { id: uid(), title: "Coração de Tinta", author: "", genre: "ficcao", status: "quero", rating: 0, pages: "", startDate: "", endDate: "" },
  { id: uid(), title: "Bestiário brasileiro: Monstros, visagens e assombrações", author: "Luiz Antonio Simas", genre: "ficcao", status: "desisti", rating: 0, pages: "", startDate: "24/02/2026", endDate: "" },
];

/* ─── Login Screen ─── */
function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleGoogleLogin = async () => {
    setLoading(true); setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = result._tokenResponse?.oauthAccessToken || "";
      if (token) sessionStorage.setItem("vit-gcal-token", token);
      onLogin(result.user, token);
    } catch (e) { console.error(e); setError("Erro ao fazer login. Tente novamente."); setLoading(false); }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #faf5ff 0%, #fce7f3 50%, #eff6ff 100%)", fontFamily: font }}>
      <style>{`@keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }`}</style>
      <div style={{ background: "#fff", borderRadius: 28, padding: "48px 40px", textAlign: "center", boxShadow: "0 20px 60px rgba(124,58,237,0.12)", maxWidth: 380, width: "90%" }}>
        <div style={{ fontSize: 56, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>✨</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: palette.text, marginBottom: 4 }}>Cantinho da Vit</div>
        <div style={{ fontSize: 14, color: palette.textMuted, marginBottom: 28 }}>Entre com sua conta Google 💜</div>
        <button onClick={handleGoogleLogin} disabled={loading} style={{ fontFamily: font, border: `2px solid ${palette.border}`, cursor: loading ? "wait" : "pointer", fontWeight: 700, borderRadius: 14, padding: "12px 24px", fontSize: 15, width: "100%", background: "#fff", color: palette.text, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {loading ? "Entrando..." : "Entrar com Google"}
        </button>
        {error && <div style={{ color: palette.dangerDark, fontSize: 13, marginTop: 12, fontWeight: 600 }}>{error}</div>}
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem("vit-gcal-token") || "");
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("home");
  const [inglesData, setInglesData] = useState({ notes: [], schedule: [], links: [] });
  const [posData, setPosData] = useState({ subjects: [] });
  const [cursosData, setCursosData] = useState({ courses: [] });
  const [books, setBooks] = useState([]);
  const [linksData, setLinksData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthChecked(true); }); return unsub; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ig = await store.get("ingles"); if (ig) setInglesData(ig);
      const po = await store.get("pos"); if (po && po.subjects && po.subjects.length > 0) setPosData(po); else setPosData({ subjects: initialPosSubjects() });
      const cu = await store.get("cursos"); if (cu) setCursosData(cu);
      const bk = await store.get("books"); if (bk && bk.length > 0) setBooks(bk); else setBooks(initialBooks());
      const lk = await store.get("links-uteis"); if (lk) setLinksData(lk);
      setLoaded(true);
    })();
  }, [user]);

  useEffect(() => { if (loaded) store.set("ingles", inglesData); }, [inglesData, loaded]);
  useEffect(() => { if (loaded) store.set("pos", posData); }, [posData, loaded]);
  useEffect(() => { if (loaded) store.set("cursos", cursosData); }, [cursosData, loaded]);
  useEffect(() => { if (loaded) store.set("books", books); }, [books, loaded]);
  useEffect(() => { if (loaded) store.set("links-uteis", linksData); }, [linksData, loaded]);

  const handleLogin = (u, token) => { setUser(u); setAccessToken(token); };
  const handleLogout = async () => { await signOut(auth); setUser(null); setAccessToken(""); sessionStorage.removeItem("vit-gcal-token"); setLoaded(false); };

  const currentPage = PAGES.find(p => p.id === page);

  if (!authChecked) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: palette.bg, fontFamily: font, color: palette.textLight }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 1.5s infinite" }}>✨</div>Carregando...</div><style>{`@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }`}</style></div>);
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (!loaded) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: palette.bg, fontFamily: font, color: palette.textLight }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 1.5s infinite" }}>✨</div>Carregando seu cantinho...</div><style>{`@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }`}</style></div>);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: palette.bg, fontFamily: font }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } } @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } } @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }`}</style>
      {sidebarOpen && (
        <div style={{ width: 220, background: "#fff", borderRight: `1px solid ${palette.border}`, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6, position: "sticky", top: 0, height: "100vh", flexShrink: 0, animation: "slideIn 0.2s ease" }}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 20, color: palette.lilacDeep, marginBottom: 8, padding: "0 8px" }}>✨ Cantinho da Vit</div>
          <div style={{ fontSize: 12, color: palette.textMuted, padding: "0 8px", marginBottom: 16, fontFamily: font }}>Organizado com amor 💜</div>
          {PAGES.map(p => (<button key={p.id} onClick={() => setPage(p.id)} style={{ fontFamily: font, border: "none", cursor: "pointer", textAlign: "left", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, background: page === p.id ? palette.lilac : "transparent", color: page === p.id ? palette.lilacDeep : palette.textLight, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18 }}>{p.icon}</span>{p.label}</button>))}
          <div style={{ flex: 1 }} />
          <button onClick={handleLogout} style={{ fontFamily: font, border: "none", cursor: "pointer", borderRadius: 12, padding: "10px 14px", fontSize: 12, fontWeight: 600, background: palette.bg, color: palette.textMuted, textAlign: "left" }}>🚪 Sair</button>
          <div style={{ background: "linear-gradient(135deg, #ede9fe, #fce7f3)", borderRadius: 16, padding: "16px", textAlign: "center" }}><div style={{ fontSize: 24 }}>🌸</div><div style={{ fontFamily: font, fontSize: 11, color: palette.textLight, marginTop: 4, fontWeight: 600 }}>Feito com carinho</div></div>
        </div>
      )}
      <div style={{ flex: 1, padding: "28px 36px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}><button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: palette.textMuted, padding: "4px 8px", borderRadius: 8 }}>{sidebarOpen ? "◀" : "☰"}</button><h2 style={{ margin: 0, fontFamily: font, color: palette.text, fontSize: 22, fontWeight: 800 }}>{currentPage?.icon} {currentPage?.label}</h2></div>
        <div style={{ animation: "fadeIn 0.25s ease" }}>
          {page === "home" && <HomePage inglesData={inglesData} books={books} posData={posData} cursosData={cursosData} accessToken={accessToken} />}
          {page === "agenda" && <AgendaPage accessToken={accessToken} />}
          {page === "pos" && <PosPage data={posData} setData={setPosData} />}
          {page === "ingles" && <SimpleStudyPage data={inglesData} setData={setInglesData} />}
          {page === "cursos" && <CursosPage data={cursosData} setData={setCursosData} />}
          {page === "biblioteca" && <LibraryPage books={books} setBooks={setBooks} />}
          {page === "links" && <LinksPage links={linksData} setLinks={setLinksData} />}
        </div>
      </div>
    </div>
  );
}
