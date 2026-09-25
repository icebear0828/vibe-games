import { Stage, useGame } from './ui/common';
import { TopBar } from './ui/TopBar';
import { CombatScreen } from './ui/Combat';
import { MapScreen } from './ui/MapScreen';
import { TitleScreen, NeowScreen, RewardScreen, RestScreen, ShopScreen, EventScreen, TreasureScreen, BossRelicScreen, EndScreen, LibraryScreen } from './ui/Screens';
import { CardSelectOverlay, PileOverlay, MapOverlay, Toasts } from './ui/Overlays';

export default function App() {
  const g = useGame();
  const s = g.screen;
  const showTop = g.run && !['title', 'library', 'gameover', 'victory'].includes(s);
  return (
    <Stage>
      {s === 'title' && <TitleScreen />}
      {s === 'library' && <LibraryScreen />}
      {s === 'neow' && <NeowScreen />}
      {s === 'map' && <MapScreen />}
      {s === 'combat' && g.c && <CombatScreen />}
      {s === 'reward' && <RewardScreen />}
      {s === 'rest' && <RestScreen />}
      {s === 'shop' && g.shop && <ShopScreen />}
      {s === 'event' && <EventScreen />}
      {s === 'treasure' && <TreasureScreen />}
      {s === 'bossRelic' && <BossRelicScreen />}
      {s === 'gameover' && g.run && <EndScreen win={false} />}
      {s === 'victory' && g.run && <EndScreen win />}
      {showTop && <TopBar />}
      <MapOverlay />
      <PileOverlay />
      <CardSelectOverlay />
      {s !== 'gameover' && s !== 'victory' && <Toasts />}
    </Stage>
  );
}
