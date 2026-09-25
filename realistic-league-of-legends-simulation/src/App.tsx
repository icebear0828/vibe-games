import { useState } from 'react';
import { MainMenu, ChampSelect } from './components/Lobby';
import { Loading } from './components/Loading';
import { GameView } from './components/GameView';
import type { GameConfig } from './game/engine';

type Phase = 'menu' | 'select' | 'loading' | 'game';

export default function App() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [cfg, setCfg] = useState<GameConfig | null>(null);
  const [gameKey, setGameKey] = useState(0);
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#010a13] font-[system-ui]">
      {phase === 'menu' && <MainMenu onPlay={() => setPhase('select')} />}
      {phase === 'select' && <ChampSelect onBack={() => setPhase('menu')} onStart={c => { setCfg(c); setPhase('loading'); }} />}
      {phase === 'loading' && cfg && <Loading cfg={cfg} onReady={() => { setGameKey(k => k + 1); setPhase('game'); }} />}
      {phase === 'game' && cfg && <GameView key={gameKey} cfg={cfg} onExit={() => { window.speechSynthesis?.cancel(); setPhase('menu'); }} />}
    </div>
  );
}
