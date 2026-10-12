import { useState, useEffect, useCallback } from 'react';

const CLIENT_ID = '115460769681-hcjjg6dpd9lu2umfh6r822qda48avpo7.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';

export const GCAL_COLORS = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
  '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
  '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
};

export const getEventColor = (event) => {
  if (event?.color?.background) return event.color.background;
  if (event?.colorId && GCAL_COLORS[event.colorId]) return GCAL_COLORS[event.colorId];
  return '#a292c5';
};

export const useGoogleCalendar = () => {
  const [token, setToken] = useState(() => localStorage.getItem('gcal_token'));
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const fetchEventos = useCallback(async (accessToken) => {
    setCargando(true);
    setError(null);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=200`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.status === 401) {
        localStorage.removeItem('gcal_token'); setToken(null); setEventos([]); return;
      }
      if (!res.ok) throw new Error('Error al obtener eventos');
      const data = await res.json();
      setEventos(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { if (token) fetchEventos(token); }, []);

  const conectar = useCallback(() => {
    if (!window.google) { setError('Google Identity Services no cargó. Recarga la página.'); return; }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) { setError(response.error); return; }
        localStorage.setItem('gcal_token', response.access_token);
        setToken(response.access_token);
        fetchEventos(response.access_token);
      },
    });
    client.requestAccessToken();
  }, [fetchEventos]);

  const desconectar = useCallback(() => {
    if (token && window.google) window.google.accounts.oauth2.revoke(token, () => {});
    localStorage.removeItem('gcal_token');
    setToken(null); setEventos([]); setError(null);
  }, [token]);

  const crearEvento = useCallback(async (titulo, fecha) => {
    if (!token) return { ok: false, error: 'No conectado al calendario' };
    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: titulo, start: { date: fecha }, end: { date: fecha } }),
      });
      if (res.status === 403) return { ok: false, error: 'Permisos insuficientes. Desconecta y vuelve a conectar.' };
      if (res.status === 401) {
        localStorage.removeItem('gcal_token'); setToken(null);
        return { ok: false, error: 'Token expirado. Vuelve a conectar.' };
      }
      if (!res.ok) { const e = await res.json(); return { ok: false, error: e?.error?.message || 'Error al crear evento' }; }
      await fetchEventos(token);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  }, [token, fetchEventos]);

  return { token, eventos, cargando, error, conectar, desconectar, crearEvento };
};
