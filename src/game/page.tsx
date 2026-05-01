"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { cylinder, MotionType, rigidBody, type RigidBody } from "crashcat";
import { GameCanvas, PrefabRoot, registerComponent, useGameEvent, useScene, type ContactEventPayload, type Prefab } from "react-three-game";
import { CrashcatPhysicsComponent, CrashcatRuntime, useCrashcat } from "react-three-game/plugins/crashcat";
import { CatmullRomCurve3, Group, Quaternion, Vector3 } from "three";
import Controls from "../controls/ControlsProvider";

import ElevatorMover from "./components/ElevatorMover";

import FirstPersonPlayer, { type FirstPersonPlayerRef } from "./FirstPersonPlayer";

import train from "../levels/train.json";
import SkinnedMesh, { type SkinnedMeshRef } from "./components/SkinnedMesh";
import AnimationMixer from "./components/AnimationMixer";
import { Html } from "@react-three/drei";

registerComponent(CrashcatPhysicsComponent);
registerComponent(ElevatorMover);

const TRAIN_NODE_ID = "b2193878-4d20-46c3-800c-4c9bc7a781ff";
const PLAYER_NODE_ID = "player";
const NPC_SENSOR_NODE_ID = "npc-sensor";
const NPC_SENSOR_ENTER_EVENT = "npc:sensor:enter";
const NPC_SENSOR_EXIT_EVENT = "npc:sensor:exit";
const TRAIN_SPEED = 7;
const TRAIN_PATH_SAMPLES = 200;
const TRAIN_FORWARD = new Vector3(0, 0, 1);
const TRAIN_CURVE_POINTS = [
    [7, 0, 20],
    [7, 0, 10],
    [7, 0, 0],
    [7, 0, -10],
    [7, 0, -30],
    [7, 0, -40],
    [11, 0, -50],
    [15, 0, -60],
    [0, 0, -60],
    [-7, 0, -60],
    [-7, 0, -50],
    [-7, 0, 20],
] as const;

function useTrainCurve() {
    const curvePoints = useMemo(
        () => TRAIN_CURVE_POINTS.map(([x, y, z]) => new Vector3(x, y, z)),
        [],
    );

    return useMemo(() => new CatmullRomCurve3(curvePoints), [curvePoints]);
}

export default function Home() {
    return (
        <main style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#000", overflow: "hidden" }}>
            <Controls>
                <GameCanvas>
                    <PrefabRoot data={train as Prefab}>
                        <CrashcatRuntime>
                            <TrainScene />
                        </CrashcatRuntime>
                        {/* <RenderPipeline /> */}
                    </PrefabRoot>
                </GameCanvas>
            </Controls>
        </main>
    );
}

const ONIMILIO_MODEL = "/models/human/onimilio.glb";

const TrainScene = () => {
    const playerRef = useRef<FirstPersonPlayerRef>(null);

    return <>
        <FirstPersonPlayer ref={playerRef} />

        <NPC playerRef={playerRef} />


        <Train />

        <SplinePath />
    </>
}

const NPC = ({ playerRef }: { playerRef: React.RefObject<FirstPersonPlayerRef | null> }) => {
    const crashcat = useCrashcat();
    const onimilioRef = useRef<SkinnedMeshRef>(null);
    const groupRef = useRef<Group>(null);
    const [npcState, setNpcState] = useState({
        active: false,
        triggerCount: 0,
        targetNodeId: null as string | null,
    });

    useEffect(() => {
        const world = crashcat?.world;
        const npcGroup = groupRef.current;

        if (!world || !crashcat || !npcGroup) {
            return;
        }

        const position = new Vector3();
        npcGroup.updateWorldMatrix(true, true);
        npcGroup.getWorldPosition(position);

        const sensorBody = rigidBody.create(world, {
            shape: cylinder.create({
                halfHeight: 1.25,
                radius: 2.25,
            }),
            motionType: MotionType.STATIC,
            objectLayer: crashcat.staticObjectLayer,
            position: [position.x, position.y + 1.25, position.z],
            quaternion: [0, 0, 0, 1],
            sensor: true,
            userData: { nodeId: NPC_SENSOR_NODE_ID },
        });

        crashcat.register(NPC_SENSOR_NODE_ID, sensorBody, {
            motionType: MotionType.STATIC,
            sensor: true,
            events: {
                sensorEnter: NPC_SENSOR_ENTER_EVENT,
                sensorExit: NPC_SENSOR_EXIT_EVENT,
            },
        });

        return () => {
            crashcat.unregister(NPC_SENSOR_NODE_ID);
        };
    }, [crashcat]);

    useGameEvent(NPC_SENSOR_ENTER_EVENT, (payload) => {
        const contact = payload as ContactEventPayload;

        if (contact.targetNodeId !== PLAYER_NODE_ID) {
            return;
        }

        setNpcState((state) => ({
            ...state,
            active: true,
            triggerCount: state.triggerCount + 1,
            targetNodeId: contact.targetNodeId ?? null,
        }));
    }, []);

    useGameEvent(NPC_SENSOR_EXIT_EVENT, (payload) => {
        const contact = payload as ContactEventPayload;

        if (contact.targetNodeId !== PLAYER_NODE_ID) {
            return;
        }

        setNpcState((state) => ({
            ...state,
            active: false,
            targetNodeId: null,
        }));
    }, []);

    return <group ref={groupRef} position={[-2, 0, 0]}>
        <Html distanceFactor={8} center position={[0, 2, 0]}>
            <div style={{
                minWidth: 160,
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 6,
                background: "rgba(10,12,16,0.82)",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.35,
                padding: "8px 10px",
                whiteSpace: "pre",
            }}>
                {JSON.stringify(npcState, null, 2)}
            </div>
        </Html>
        <SkinnedMesh ref={onimilioRef} model={ONIMILIO_MODEL} />
        <AnimationMixer skinnedMeshRef={onimilioRef} lookTarget={npcState.active ? playerRef : undefined} />
    </group>

}

const Train = () => {
    const scene = useScene();
    const crashcat = useCrashcat();
    const curve = useTrainCurve();
    const pathLength = useMemo(() => curve.getLength(), [curve]);
    const trainBodyRef = useRef<RigidBody | null>(null);
    const distanceRef = useRef(0);
    const heightOffsetRef = useRef<number | null>(null);
    const initializedRef = useRef(false);
    const pathTangentRef = useRef(new Vector3());
    const worldQuaternionRef = useRef(new Quaternion());

    useFrame((_, delta) => {
        const trainObject = scene.getObject(TRAIN_NODE_ID);
        if (!trainObject || !crashcat || pathLength <= 0) {
            return;
        }

        const trainBody = crashcat.getBody(TRAIN_NODE_ID);
        trainBodyRef.current = trainBody;

        if (!initializedRef.current) {
            const trainPosition = trainObject.position;
            let closestDistance = 0;
            let closestDistanceSq = Infinity;
            const sampledPoint = new Vector3();

            for (let index = 0; index <= TRAIN_PATH_SAMPLES; index += 1) {
                const sampleDistance = (index / TRAIN_PATH_SAMPLES) * pathLength;
                curve.getPointAt(sampleDistance / pathLength, sampledPoint);

                const distanceSq = sampledPoint.distanceToSquared(trainPosition);
                if (distanceSq < closestDistanceSq) {
                    closestDistanceSq = distanceSq;
                    closestDistance = sampleDistance;
                }
            }

            distanceRef.current = closestDistance;
            const initialPoint = curve.getPointAt(closestDistance / pathLength);
            heightOffsetRef.current = trainPosition.y - initialPoint.y;
            initializedRef.current = true;
        }

        distanceRef.current = (distanceRef.current + TRAIN_SPEED * delta) % pathLength;

        const pathU = distanceRef.current / pathLength;
        const pathPoint = curve.getPointAt(pathU);
        const pathTangent = curve.getTangentAt(pathU, pathTangentRef.current).normalize();
        const nextPosition = [
            pathPoint.x,
            pathPoint.y + (heightOffsetRef.current ?? 0),
            pathPoint.z,
        ] as [number, number, number];

        trainObject.position.set(nextPosition[0], nextPosition[1], nextPosition[2]);
        trainObject.quaternion.setFromUnitVectors(TRAIN_FORWARD, pathTangent);
        trainObject.updateMatrixWorld(true);

        if (trainBody) {
            const quaternion = trainObject.getWorldQuaternion(worldQuaternionRef.current);
            rigidBody.moveKinematic(
                trainBody,
                nextPosition,
                [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
                Math.min(delta, 1 / 30),
            );
        }
    }, -3);

    return null;
}

const SplinePath = () => {
    const curve = useTrainCurve();
    const linePoints = useMemo(() => curve.getPoints(64), [curve]);

    return (
        <line>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[new Float32Array(linePoints.flatMap((point) => point.toArray())), 3]}
                />
            </bufferGeometry>
            <lineBasicMaterial color="#ff2a2a" linewidth={2} />
        </line>
    );
}
