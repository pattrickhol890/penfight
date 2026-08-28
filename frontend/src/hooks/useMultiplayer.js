import { useState, useRef, useCallback } from 'react';

function getWsUrl() {
  const backend = process.env.REACT_APP_BACKEND_URL || window.location.origin;
  const wsProto = backend.startsWith('https') ? 'wss' : 'ws';
  const cleanHost = backend.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `${wsProto}://${cleanHost}/ws`;
}

export function useMultiplayer() {
  const wsRef = useRef(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [role, setRole] = useState(null); // 'p1' | 'p2'
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [opponentAim, setOpponentAim] = useState(null);
  const [opponentFlick, setOpponentFlick] = useState(null);
  const [syncedState, setSyncedState] = useState(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [rematchTrigger, setRematchTrigger] = useState(0);

  const initSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return wsRef.current;
    }

    const url = getWsUrl();
    console.log('[Multiplayer] Connecting to:', url);
    setConnecting(true);
    setErrorMessage(null);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Multiplayer] WebSocket connected');
      setConnected(true);
      setConnecting(false);
      setErrorMessage(null);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        console.log('[Multiplayer] Received:', msg);
        if (msg.type === 'ROOM_CREATED') {
          setRoomCode(msg.room_code);
          setRole('p1');
          setOpponentJoined(false);
          setConnecting(false);
        } else if (msg.type === 'GAME_START') {
          setRoomCode(msg.room_code);
          setRole(msg.role);
          setOpponentJoined(true);
          setOpponentLeft(false);
          setConnecting(false);
        } else if (msg.type === 'OPPONENT_AIM') {
          setOpponentAim(msg.aim);
        } else if (msg.type === 'OPPONENT_FLICK') {
          setOpponentFlick(msg);
        } else if (msg.type === 'STATE_SYNCED') {
          setSyncedState(msg);
        } else if (msg.type === 'OPPONENT_LEFT') {
          setOpponentLeft(true);
        } else if (msg.type === 'REMATCH_START') {
          setRole(msg.role);
          setRematchTrigger((prev) => prev + 1);
        } else if (msg.type === 'ERROR') {
          setErrorMessage(msg.message);
          setConnecting(false);
        }
      } catch (err) {
        console.error('[Multiplayer] Failed to parse message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[Multiplayer] WebSocket error:', err);
      setErrorMessage('Could not connect to backend server. If using Render free tier, it may be waking up (wait 20s).');
      setConnecting(false);
    };

    ws.onclose = () => {
      console.log('[Multiplayer] WebSocket closed');
      setConnected(false);
      setConnecting(false);
    };

    return ws;
  }, []);

  const createRoom = useCallback(() => {
    setErrorMessage(null);
    setOpponentLeft(false);
    setConnecting(true);
    const ws = initSocket();

    const sendCreate = () => {
      ws.send(JSON.stringify({ type: 'CREATE_ROOM' }));
    };

    if (ws.readyState === WebSocket.OPEN) {
      sendCreate();
    } else {
      ws.addEventListener('open', sendCreate, { once: true });
    }
  }, [initSocket]);

  const joinRoom = useCallback((code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a room code.');
      return;
    }
    setErrorMessage(null);
    setOpponentLeft(false);
    setConnecting(true);
    const ws = initSocket();

    const sendJoin = () => {
      ws.send(JSON.stringify({ type: 'JOIN_ROOM', room_code: cleanCode }));
    };

    if (ws.readyState === WebSocket.OPEN) {
      sendJoin();
    } else {
      ws.addEventListener('open', sendJoin, { once: true });
    }
  }, [initSocket]);

  const sendAim = useCallback((aim) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'AIM_UPDATE', aim }));
    }
  }, []);

  const sendFlick = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'FLICK_PEN', ...data }));
    }
  }, []);

  const sendSync = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SYNC_STATE', ...data }));
    }
  }, []);

  const sendRematch = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REMATCH' }));
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setRoomCode(null);
    setRole(null);
    setOpponentJoined(false);
    setOpponentAim(null);
    setOpponentFlick(null);
    setSyncedState(null);
    setOpponentLeft(false);
    setErrorMessage(null);
    setConnecting(false);
  }, []);

  return {
    connecting,
    connected,
    roomCode,
    role,
    opponentJoined,
    errorMessage,
    opponentAim,
    opponentFlick,
    syncedState,
    opponentLeft,
    rematchTrigger,
    createRoom,
    joinRoom,
    sendAim,
    sendFlick,
    sendSync,
    sendRematch,
    leaveRoom,
  };
}
