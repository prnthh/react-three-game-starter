"use client";

import { useRef, useState } from "react";
import { GameCanvas, PrefabRoot, registerComponent, type Prefab } from "react-three-game";
import { CrashcatPhysicsComponent, CrashcatRuntime } from "react-three-game/plugins/crashcat";
import Controls from "../controls/ControlsProvider";

import ElevatorMover from "./components/ElevatorMover";
import OrbMover from "./components/OrbMover";
import MapPicker from "./MapPicker";

import FirstPersonPlayer, { type FirstPersonPlayerRef } from "./FirstPersonPlayer";

import killbox from "../levels/killbox.json";

registerComponent(CrashcatPhysicsComponent);
registerComponent(ElevatorMover);
registerComponent(OrbMover);

export default function Home() {
    const playerRef = useRef<FirstPersonPlayerRef>(null);
    const [scene, setScene] = useState({ key: 0, data: killbox as Prefab });

    return (
        <main style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#000", overflow: "hidden" }}>
            <Controls>
                <MapPicker onMapChange={(data) => setScene((scene) => ({ key: scene.key + 1, data }))} />
                <GameCanvas>
                    <PrefabRoot key={scene.key} data={scene.data}>
                        <CrashcatRuntime>
                            <FirstPersonPlayer ref={playerRef} />
                        </CrashcatRuntime>
                        {/* <RenderPipeline /> */}
                    </PrefabRoot>
                </GameCanvas>
            </Controls>
        </main>
    );
}
