import { useState } from 'react';
import { RoleProvider, useRole } from './context/RoleContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtoBar from './components/ProtoBar/ProtoBar';
import BottomNav from './components/BottomNav/BottomNav';
import DayBackbone from './screens/DayBackbone';
import Capture from './screens/Capture';
import Intelligence from './screens/Intelligence';
import TeamDebrief from './screens/TeamDebrief';
import type { ScreenId } from './types';

function AppInner() {
  const { role } = useRole();
  const [activeScreen, setActiveScreen] = useState<ScreenId>('backbone');

  function navigate(s: ScreenId) {
    if (role.screens.includes(s)) setActiveScreen(s);
  }

  return (
    <>
      <ProtoBar activeScreen={activeScreen} onNavigate={navigate} />
      <div className="screen-wrap">
        {activeScreen === 'backbone' && <DayBackbone activeScreen={activeScreen} onNavigate={navigate} />}
        {activeScreen === 'capture'  && <Capture activeScreen={activeScreen} onNavigate={navigate} />}
        {activeScreen === 'intel'    && <Intelligence activeScreen={activeScreen} onNavigate={navigate} />}
        {activeScreen === 'debrief'  && <TeamDebrief activeScreen={activeScreen} onNavigate={navigate} />}
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
