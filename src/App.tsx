import './App.css'
import '@react-three/fiber'
import { useState } from 'react'
import MainMenu from './MainMenu'
import KillboxPage from './game/page'
import KillboxEditorPage from './game/editor/page'

function AppContent() {
  const [gameState, setGameState] = useState<'menu' | 'singleplayer' | 'editor'>('menu')
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
      {gameState === 'menu' && <MainMenu setGameState={setGameState} />}
      {gameState !== 'menu' && <button type="button" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1 }} onClick={() => setGameState('menu')}>⏸️</button>}

      {gameState === 'singleplayer' && <KillboxPage />}
      {gameState === 'editor' && <KillboxEditorPage />}
    </div>
  )
}

function App() {
  return (
    <AppContent />
  )
}

export default App
