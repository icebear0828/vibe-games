import { useEffect, useState } from 'react';
import GameView from './components/GameView';
import { MainMenu, LevelSelect, Options } from './components/Menu';
import Almanac from './components/Almanac';
import { LEVELS, ENDLESS_LEVEL, type LevelDef } from './game/data';
import { getProgress, completeLevel } from './game/save';
import { initAudio, playMusic } from './game/audio';

type Screen = 'menu' | 'levels' | 'game' | 'almanac' | 'options';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [progress, setProgress] = useState(getProgress());
  const [levelIndex, setLevelIndex] = useState(0);
  const [endless, setEndless] = useState(false);
  const [runId, setRunId] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started && screen !== 'game') playMusic('menu');
  }, [screen, started]);

  const level: LevelDef = endless ? ENDLESS_LEVEL : LEVELS[levelIndex];

  const startLevel = (i: number) => {
    setEndless(false);
    setLevelIndex(i);
    setRunId((r) => r + 1);
    setScreen('game');
  };

  if (!started) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center cursor-pointer select-none"
        onClick={() => { initAudio(); setStarted(true); playMusic('menu'); }}>
        <div className="text-6xl font-black mb-4">
          <span className="text-[#8be04e] [text-shadow:0_4px_0_#1f4a0a]">植物</span>
          <span className="text-[#ffe36b] text-4xl mx-2">大战</span>
          <span className="text-[#c9d6b8] [text-shadow:0_4px_0_#39402f]">僵尸</span>
        </div>
        <div className="w-72 h-6 rounded-full bg-[#3b2208] border-4 border-[#6b4a1a] overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-lime-400 to-green-600" />
        </div>
        <div className="mt-6 text-2xl font-black text-yellow-300 animate-pulse">点击此处开始！</div>
      </div>
    );
  }

  return (
    <>
      {screen === 'menu' && (
        <MainMenu
          progress={progress}
          onAdventure={() => startLevel(Math.min(progress, LEVELS.length - 1))}
          onLevels={() => setScreen('levels')}
          onEndless={() => { setEndless(true); setRunId((r) => r + 1); setScreen('game'); }}
          onAlmanac={() => setScreen('almanac')}
          onOptions={() => setScreen('options')}
        />
      )}
      {screen === 'levels' && <LevelSelect progress={progress} onPick={startLevel} onBack={() => setScreen('menu')} />}
      {screen === 'almanac' && <Almanac onBack={() => setScreen('menu')} />}
      {screen === 'options' && <Options onBack={() => setScreen('menu')} onReset={() => setProgress(0)} />}
      {screen === 'game' && (
        <GameView
          key={runId}
          level={level}
          hasNext={!endless && levelIndex < LEVELS.length - 1}
          onWin={() => { if (!endless) { completeLevel(levelIndex); setProgress(getProgress()); } }}
          onExit={() => setScreen('menu')}
          onRestart={() => setRunId((r) => r + 1)}
          onNext={() => startLevel(levelIndex + 1)}
        />
      )}
    </>
  );
}
