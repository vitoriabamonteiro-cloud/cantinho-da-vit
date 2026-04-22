const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function fetchAllCalendars(accessToken) {
  try {
    const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`CalendarList error: ${res.status}`);
    const data = await res.json();
    return (data.items || []).map(cal => ({
      id: cal.id,
      name: cal.summary || "",
      color: cal.backgroundColor || "#a78bfa",
      primary: cal.primary || false,
    }));
  } catch (e) {
    console.error("CalendarList fetch error:", e);
    return [];
  }
}

export async function fetchCalendarEvents(accessToken, calendarId, timeMin, timeMax) {
  try {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(ev => ({
      id: ev.id,
      title: ev.summary || "(Sem título)",
      start: ev.start?.dateTime || ev.start?.date || "",
      end: ev.end?.dateTime || ev.end?.date || "",
      allDay: !ev.start?.dateTime,
      location: ev.location || "",
      calendarId,
    }));
  } catch (e) {
    console.error("Events fetch error:", e);
    return [];
  }
}

export async function fetchAllEvents(accessToken, timeMin, timeMax) {
  const calendars = await fetchAllCalendars(accessToken);
  const allEvents = [];
  for (const cal of calendars) {
    const events = await fetchCalendarEvents(accessToken, cal.id, timeMin, timeMax);
    events.forEach(ev => {
      ev.calendarName = cal.name;
      ev.calendarColor = cal.color;
    });
    allEvents.push(...events);
  }
  allEvents.sort((a, b) => parseEventDate(a.start) - parseEventDate(b.start));
  return { calendars, events: allEvents };
}

export function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function getMonthRange(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

// Parse event date correctly - all-day events come as "YYYY-MM-DD" which
// JavaScript interprets as UTC midnight, shifting the day in negative timezones.
// This function parses dates correctly for local timezone.
export function parseEventDate(dateStr) {
  if (!dateStr) return new Date();
  // All-day event: "2026-04-25" (no T, no time)
  if (dateStr.length === 10 && dateStr.includes("-")) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  // Regular event with time: "2026-04-25T13:00:00-03:00"
  return new Date(dateStr);
}
