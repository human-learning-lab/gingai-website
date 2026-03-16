import { useState } from 'react';
import LeftNav from '../../components/LeftNav/LeftNav';
import Timeline from '../../components/Timeline/Timeline';
import Block1430 from './views/Block1430';
import Block1330 from './views/Block1330';
import Block1818 from './views/Block1818';
import BlockGeneric from './views/BlockGeneric';
import StatusRail from './StatusRail';
import type { ScreenId } from '../../types';
import { BLOCKS } from '../../data/blocks';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

export default function DayBackbone({ activeScreen, onNavigate }: Props) {
  const nowBlock = BLOCKS.find(b => b.status === 'now');
  const [selectedId, setSelectedId] = useState(nowBlock?.id ?? '1430');
  const [tlOpen, setTlOpen] = useState(false);

  const selected = BLOCKS.find(b => b.id === selectedId);
  const panel = selected?.panel ?? 'future';

  function handleSelect(id: string) {
    setSelectedId(id);
    setTlOpen(false);
  }

  const chevron = tlOpen
    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 9l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;

  return (
    <div className="s-backbone">
      <LeftNav activeScreen={activeScreen} onNavigate={onNavigate} />

      {/* Mobile schedule toggle + drawer */}
      <div className="mob-only">
        <div
          className="schedule-toggle"
          onClick={() => setTlOpen(o => !o)}
        >
          <span className="schedule-toggle-label">
            {selected ? `${selected.time} · ${selected.name}` : 'Schedule'}
          </span>
          {chevron}
        </div>
        <div className={`tl-drawer ${tlOpen ? 'open' : 'closed'}`}>
          <Timeline selectedId={selectedId} onSelect={handleSelect} />
        </div>
      </div>

      {/* Desktop timeline */}
      <Timeline selectedId={selectedId} onSelect={setSelectedId} />

      <div className="main">
        <div className="block-view on">
          {panel === '1430' && <Block1430 />}
          {panel === '1330' && <Block1330 />}
          {panel === '1818' && <Block1818 />}
          {(panel === 'past' || panel === 'future') && <BlockGeneric selectedId={selectedId} />}
        </div>
      </div>

      <StatusRail />
    </div>
  );
}
