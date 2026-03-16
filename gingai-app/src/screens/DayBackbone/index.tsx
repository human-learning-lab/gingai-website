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
  const [mobTab, setMobTab] = useState<'schedule' | 'now'>('schedule');

  const selected = BLOCKS.find(b => b.id === selectedId);
  const panel = selected?.panel ?? 'future';

  function handleMobSelect(id: string) {
    setSelectedId(id);
    setMobTab('now');
  }

  const blockContent = (
    <>
      {panel === '1430' && <Block1430 />}
      {panel === '1330' && <Block1330 />}
      {panel === '1818' && <Block1818 />}
      {(panel === 'past' || panel === 'future') && <BlockGeneric selectedId={selectedId} />}
    </>
  );

  return (
    <div className="s-backbone">
      <LeftNav activeScreen={activeScreen} onNavigate={onNavigate} />

      {/* ── Mobile layout: tab switcher ── */}
      <div className="mob-only mob-backbone">
        {/* Tab bar */}
        <div className="mob-bb-tabs">
          <button
            className={`mob-bb-tab${mobTab === 'schedule' ? ' on' : ''}`}
            onClick={() => setMobTab('schedule')}
          >
            Schedule
          </button>
          <button
            className={`mob-bb-tab${mobTab === 'now' ? ' on' : ''}`}
            onClick={() => setMobTab('now')}
          >
            {selected ? `${selected.time} · ${selected.name}` : 'Now'}
          </button>
        </div>

        {/* Schedule tab: full timeline */}
        {mobTab === 'schedule' && (
          <div className="mob-bb-tl">
            <Timeline selectedId={selectedId} onSelect={handleMobSelect} />
          </div>
        )}

        {/* Now tab: block detail */}
        {mobTab === 'now' && (
          <div className="mob-bb-detail">
            {blockContent}
          </div>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <Timeline selectedId={selectedId} onSelect={setSelectedId} />

      <div className="main">
        <div className="block-view on">
          {blockContent}
        </div>
      </div>

      <StatusRail />
    </div>
  );
}
