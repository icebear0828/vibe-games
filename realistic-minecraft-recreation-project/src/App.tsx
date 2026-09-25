import { useCallback, useEffect, useRef, useState } from 'react';
import { Engine, UIState, GameMode } from './game/engine';
import { Sound } from './game/audio';
import { seedFromString } from './game/noise';
import { listWorlds, upsertWorld, saveWorldData, loadWorldData, deleteWorld, loadSettings, saveSettings, WorldMeta } from './game/storage';
import { Hud, ChatMsg } from './ui/Hud';
import { Inventory } from './ui/Inventory';
import { TitleScreen, WorldSelect, CreateWorld, OptionsScreen, PauseMenu, DeathScreen, LoadingScreen, ChatInput } from './ui/Menus';

type Screen = 'title' | 'worlds' | 'create' | 'options' | 'game';
type Overlay = null | 'pause' | 'inventory' | 'chat' | 'options';

const MENU_SEED = Math.floor(Math.random() * 1e9);

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [settings, setSettingsState] = useState(loadSettings);
  const [worlds, setWorlds] = useState<WorldMeta[]>(listWorlds);
  const [current, setCurrent] = useState<WorldMeta | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [chatPrefix, setChatPrefix] = useState('');
  const [ui, setUi] = useState<UIState | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [locked, setLocked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const menuEngine = useRef<Engine | null>(null);
  const game = useRef<Engine | null>(null);

  useEffect(() => {
    const unlock = () => Sound.ensure();
    window.addEventListener('pointerdown', unlock);
    const plc = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', plc);
    return () => { window.removeEventListener('pointerdown', unlock); document.removeEventListener('pointerlockchange', plc); };
  }, []);

  // menu panorama engine
  useEffect(() => {
    if (screen === 'game') {
      menuEngine.current?.dispose(); menuEngine.current = null;
      return;
    }
    if (!menuEngine.current && menuRef.current) {
      menuEngine.current = new Engine(menuRef.current, { seed: MENU_SEED, mode: 'menu', settings: { ...settings, renderDistance: 5 } });
    }
  }, [screen]);
  useEffect(() => () => { menuEngine.current?.dispose(); game.current?.dispose(); }, []);

  const addMsg = useCallback((text: string) => setMessages((m) => [...m.slice(-50), { text, time: Date.now() }]), []);

  const saveCurrent = useCallback(() => {
    const e = game.current;
    if (!e || !current || !e.ready) return;
    const ok = saveWorldData(current.id, e.getSaveData());
    const meta = { ...current, lastPlayed: Date.now(), mode: e.mode };
    upsertWorld(meta);
    if (!ok) addMsg('§ 保存失败：浏览器存储空间不足');
  }, [current, addMsg]);

  // game engine
  useEffect(() => {
    if (screen !== 'game' || !current || !gameRef.current) return;
    const save = loadWorldData(current.id);
    const e = new Engine(gameRef.current, {
      seed: current.seed, mode: save?.mode || current.mode, save, settings,
      onUI: (s) => setUi({ ...s, inventory: [...s.inventory] }),
      onPause: () => setOverlay((o) => (o === null ? 'pause' : o)),
      onInventory: () => setOverlay('inventory'),
      onChat: (p) => { setChatPrefix(p); setOverlay('chat'); },
    });
    game.current = e;
    (window as any).__mc = e;
    setMessages([]);
    return () => { e.dispose(); game.current = null; };
  }, [screen, current]);

  useEffect(() => {
    if (screen !== 'game') return;
    const i = setInterval(saveCurrent, 30000);
    return () => clearInterval(i);
  }, [screen, saveCurrent]);

  const setSettings = (s: typeof settings) => {
    setSettingsState(s); saveSettings(s);
    game.current?.setSettings(s);
    Sound.musicEnabled = s.music; Sound.setVolume(s.volume / 100);
  };

  const play = (w: WorldMeta) => {
    const meta = { ...w, lastPlayed: Date.now() };
    upsertWorld(meta);
    setCurrent(meta); setUi(null); setOverlay(null); setScreen('game');
  };

  const create = (name: string, seedStr: string, mode: GameMode) => {
    const seed = seedStr.trim() ? seedFromString(seedStr) : Math.floor(Math.random() * 2 ** 31) * (Math.random() < 0.5 ? -1 : 1);
    const w: WorldMeta = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, seed, mode, created: Date.now(), lastPlayed: Date.now() };
    play(w);
  };

  const quit = () => {
    saveCurrent();
    setOverlay(null); setUi(null); setCurrent(null);
    setWorlds(listWorlds());
    setScreen('title');
  };

  const resume = () => { setOverlay(null); game.current?.lock(); };

  const loading = screen === 'game' && (!ui || ui.loading < 1);
  const dead = !!ui?.dead;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none">
      {screen !== 'game' && (
        <>
          <div ref={menuRef} className="absolute inset-0" style={{ filter: 'blur(2px) brightness(0.9)', transform: 'scale(1.02)' }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)' }} />
        </>
      )}
      {screen === 'title' && <TitleScreen onSingle={() => { setWorlds(listWorlds()); setScreen(listWorlds().length ? 'worlds' : 'create'); }} onOptions={() => setScreen('options')} />}
      {screen === 'worlds' && (
        <WorldSelect worlds={worlds} onPlay={play} onCreate={() => setScreen('create')} onBack={() => setScreen('title')}
          onDelete={(w) => { deleteWorld(w.id); setWorlds(listWorlds()); }} />
      )}
      {screen === 'create' && <CreateWorld onCreate={create} onBack={() => setScreen(worlds.length ? 'worlds' : 'title')} />}
      {screen === 'options' && <OptionsScreen settings={settings} onChange={setSettings} onBack={() => setScreen('title')} />}

      {screen === 'game' && (
        <>
          <div ref={gameRef} className="absolute inset-0" onClick={() => { if (!overlay && !dead && !loading) game.current?.lock(); }} />
          {ui && !loading && <Hud ui={ui} messages={messages} chatOpen={overlay === 'chat'} />}
          {!loading && !overlay && !dead && !locked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-4 py-2 text-[18px] mc-text" style={{ background: 'rgba(0,0,0,0.5)' }}>点击屏幕以继续游戏</div>
            </div>
          )}
          {overlay === 'inventory' && game.current && <Inventory engine={game.current} onClose={resume} />}
          {overlay === 'chat' && (
            <ChatInput initial={chatPrefix} history={messages} onClose={resume}
              onSend={(t) => {
                if (t.startsWith('/')) { addMsg(t); addMsg(game.current?.runCommand(t) || ''); }
                else addMsg(`<Steve> ${t}`);
              }} />
          )}
          {overlay === 'pause' && !dead && <PauseMenu onResume={resume} onOptions={() => setOverlay('options')} onQuit={quit} />}
          {overlay === 'options' && <OptionsScreen transparent settings={settings} onChange={setSettings} onBack={() => setOverlay('pause')} />}
          {dead && <DeathScreen onRespawn={() => { game.current?.respawn(); setOverlay(null); setTimeout(() => game.current?.lock(), 50); }} onQuit={quit} />}
          {loading && <LoadingScreen progress={ui?.loading ?? 0} />}
        </>
      )}
    </div>
  );
}
