import { GameCanvas, PrefabRoot } from "react-three-game";
import train from "./levels/train.json";
import MyRenderPipeline from "./shared/PostProcessingEffects";
import { BASE_PATH } from "./shared/basePath";

export default function MainMenu({ setGameState }: { setGameState: React.Dispatch<React.SetStateAction<'menu' | 'singleplayer' | 'editor'>> }) {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: 'black' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', zIndex: 1 }}>
                <div style={{ color: 'white', fontSize: '32px', marginBottom: '20px' }}>trainriding</div>
                <button type="button" onClick={() => setGameState('singleplayer')}>Singleplayer</button>
                <button type="button" onClick={() => setGameState('editor')}>Prefab Editor</button>
            </div>
            <GameCanvas camera={{ position: [0, 2, 6] }}>
                <PrefabRoot data={train} basePath={BASE_PATH}>
                    <MyRenderPipeline />
                </PrefabRoot>
            </GameCanvas>
        </div>
    )
}
