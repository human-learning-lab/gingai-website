import { useState, useCallback } from 'react';
import { RoleProvider, useRole } from './context/RoleContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtoBar from './components/ProtoBar/ProtoBar';
import BottomNav from './components/BottomNav/BottomNav';
import DayBackbone from './screens/DayBackbone';
import Capture from './screens/Capture';
import Intelligence from './screens/Intelligence';
import TeamDebrief from './screens/TeamDebrief';
import { useTranscript } from './hooks/useTranscript';
import type { ScreenId } from './types';

function AppInner() {
  const { role } = useRole();
  const [activeScreen, setActiveScreen] = useState<ScreenId>('backbone');
  const { lines, topics, connect, disconnect, reset } = useTranscript();

  function navigate(s: ScreenId) {
    if (role.screens.includes(s)) setActiveScreen(s);
  }

  const handleRecordingChange = useCallback((recording: boolean) => {
    if (recording) {
      reset();
      connect();
    } else {
      disconnect();
    }
  }, [connect, disconnect, reset]);

  return (
    <>
      <ProtoBar activeScreen={activeScreen} onNavigate={navigate} />
      <div className="screen-wrap">
        {activeScreen === 'backbone' && <DayBackbone activeScreen={activeScreen} onNavigate={navigate} />}
        {activeScreen === 'capture'  && <Capture activeScreen={activeScreen} onNavigate={navigate} />}
        {activeScreen === 'intel'    && <Intelligence activeScreen={activeScreen} onNavigate={navigate} />}
        {activeScreen === 'debrief'  && (
          <TeamDebrief
            activeScreen={activeScreen}
            onNavigate={navigate}
            transcriptLines={lines}
            topics={topics}
            onRecordingChange={handleRecordingChange}
          />
        )}
      </div>
      <BottomNav activeScreen={activeScreen} onNavigate={navigate} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <AppInner />
      </RoleProvider>
    </ThemeProvider>
  );
}
