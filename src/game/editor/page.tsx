"use client";

import { useEffect, useRef } from "react";
import { PrefabEditor, PrefabEditorMode, registerComponent, useScene } from "react-three-game";
import type { Prefab, PrefabEditorRef } from "react-three-game";
import Controls, { useControls } from "../../controls/ControlsProvider";

import { CrashcatRuntime } from "../CrashcatRuntime";
import CrashcatPhysics from "../components/CrashcatPhysics";
import ElevatorMover from "../components/ElevatorMover";
import OrbMover from "../components/OrbMover";

import FirstPersonPlayer, { type FirstPersonPlayerRef } from "../FirstPersonPlayer";

import initialWorld from "../../levels/killbox.json";

registerComponent(CrashcatPhysics);
registerComponent(ElevatorMover);
registerComponent(OrbMover);

function ControlModeSync() {
    const scene = useScene();
    const { setEnabled } = useControls();

    useEffect(() => {
        setEnabled(scene.mode === PrefabEditorMode.Play);
        return () => {
            setEnabled(true);
        };
    }, [scene.mode, setEnabled]);

    return null;
}

export default function Home() {
    const editorRef = useRef<PrefabEditorRef>(null);
    const playerRef = useRef<FirstPersonPlayerRef>(null);

    return (
        <main style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#000", overflow: "hidden" }}>
            <Controls>
                <PrefabEditor ref={editorRef} initialPrefab={initialWorld as Prefab}>
                    <ControlModeSync />
                    <CrashcatRuntime>
                        <FirstPersonPlayer ref={playerRef} />
                    </CrashcatRuntime>
                    {/* <RenderPipeline /> */}
                </PrefabEditor>
            </Controls>
        </main>
    );
}
