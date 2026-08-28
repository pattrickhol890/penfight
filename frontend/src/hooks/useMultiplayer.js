import { useState, useRef, useEffect, useCallback } from 'react';

function getWsUrl() {
  const backend = process.env.REACT_APP_BACKEND_URL || window.location.origin;
  const wsProto = backend.startsWith('https') ? 'wss' : 'ws';
  const cleanHost = backend.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `${wsProto}://${cleanHost}/ws`;
}

export function useMultiplayer() {
  const wsRef = useRef(null);
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

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }
    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setErrorMessage(null);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error:', err);
      setErrorMessage('Failed to connect to multiplayer server.');
    };

    return ws;
  }, []);

  const createRoom = useCallback(() => {
    setErrorMessage(null);
    setOpponentLeft(false);
    const ws = connect();
    const send = () => {
      ws.send(JSON.stringify({ type: 'CREATE_ROOM' }));
    };
    if (ws.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws.addEventListener('open', send, { once: true });
    }
  }, [connect]);

  const joinRoom = useCallback((code) => {
    setErrorMessage(null);
    setOpponentLeft(false);
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a room code.');
      return;
    }
    const ws = connect();
    const send = () => {
      ws.send(JSON.stringify({ type: 'JOIN_ROOM', room_code: cleanCode }));
    };
    if (ws.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws.addEventListener('open', send, { once: true });
    }
  }, [connect]);

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
  }, []);

  useEffect(() => {
    const handleMessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ROOM_CREATED') {
          setRoomCode(msg.room_code);
          setRole('p1');
          setOpponentJoined(false);
        } else if (msg.type === 'GAME_START') {
          setRoomCode(msg.room_code);
          setRole(msg.role);
          setOpponentJoined(true);
          setOpponentLeft(false);
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
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    const ws = wsRef.current;
    if (ws) {
      ws.addEventListener('message', handleMessage);
      return () => {
        ws.removeEventListener('message', handleMessage);
      };
    }
  }, [connected]);

  // Keep message listener active on connection
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.onmessage === null) {
        wsRef.current.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'ROOM_CREATED') {
              setRoomCode(msg.room_code);
              setRole('p1');
              setOpponentJoined(false);
            } else if (msg.type === 'GAME_START') {
              setRoomCode(msg.room_code);
              setRole(msg.role);
              setOpponentJoined(true);
              setOpponentLeft(false);
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
            }
          } catch (err) {
            console.error(err);
          }
        };
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return {
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
