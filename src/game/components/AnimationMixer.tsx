import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
    AnimationMixer as ThreeAnimationMixer,
    Bone,
    LoopRepeat,
    Quaternion,
    Vector3,
    type AnimationAction,
    type AnimationClip,
    type Object3D,
    type Object3DEventMap,
} from "three";
import { FBXLoader } from "three/examples/jsm/Addons.js";
import type { SkinnedMeshRef } from "./SkinnedMesh";

const REVERSE_ANIMATION_MAP: Record<string, string> = {
    walkRight: "walkLeft",
    walkBack: "walk",
    runBack: "run",
};
const DEFAULT_LOOK_AT_TWEEN_SPEED = 7;
const DEFAULT_LOOK_AT_REST_TWEEN_SPEED = 5;
const LOOK_AT_TARGET_HEIGHT_OFFSET = 0.5;
const LOOK_AT_SNAP_EPSILON = 0.0001;
const REST_POSE_EPSILON = 0.001;

type PlayerTarget = Object3D<Object3DEventMap> | {
    getBody: () => {
        position?: ArrayLike<number>;
    } | null;
};

type AnimationMixerProps = {
    skinnedMeshRef: RefObject<SkinnedMeshRef | null>;
    animation?: string;
    animationOverrides?: Record<string, string>;
    lookTarget?: RefObject<PlayerTarget | null>;
    lookAtTweenSpeed?: number;
    lookAtRestTweenSpeed?: number;
    neckBoneName?: string;
    onActions?: (actions: Record<string, AnimationAction>) => void;
};

function filterNeckAnimations(animation: AnimationClip, neckBoneName: string) {
    const filteredAnimation = animation.clone();
    filteredAnimation.tracks = animation.tracks.filter((track) => !track.name.includes(neckBoneName));
    return filteredAnimation;
}

function getTrackNodeName(trackName: string) {
    return trackName.split(".")[0];
}

function filterClipForObject(clip: AnimationClip, object?: Object3D<Object3DEventMap>) {
    if (!object) return clip;

    const nodeNames = new Set<string>();
    object.traverse((node) => {
        if (node.name) nodeNames.add(node.name);
    });

    const filteredClip = clip.clone();
    filteredClip.tracks = clip.tracks.filter((track) => nodeNames.has(getTrackNodeName(track.name)));
    return filteredClip;
}

function loadFbxAnimation(path: string) {
    const loader = new FBXLoader();

    return new Promise<AnimationClip | null>((resolve) => {
        loader.load(
            path,
            (fbx) => resolve(fbx.animations[0] ?? null),
            undefined,
            () => resolve(null),
        );
    });
}

function useExternalAnimations(animationOverrides?: Record<string, string>) {
    const [clips, setClips] = useState<Record<string, AnimationClip>>({});

    useEffect(() => {
        let cancelled = false;
        const entries = Object.entries(animationOverrides ?? {}).filter(([name, path]) => name.trim().length > 0 && path.trim().length > 0);

        if (entries.length === 0) {
            setClips({});
            return;
        }

        void Promise.all(entries.map(async ([name, path]) => [name, await loadFbxAnimation(path)] as const)).then((loaded) => {
            if (cancelled) return;

            setClips(loaded.reduce<Record<string, AnimationClip>>((result, [key, clip]) => {
                if (clip) result[key] = clip;
                return result;
            }, {}));
        });

        return () => {
            cancelled = true;
        };
    }, [animationOverrides]);

    return clips;
}

function useAnimationState(
    clone?: Object3D<Object3DEventMap> | null,
    animationOverrides?: Record<string, string>,
    onActions?: (actions: Record<string, AnimationAction>) => void,
    modelAnimations?: AnimationClip[],
    neckBoneName = "mixamorigNeck",
) {
    const [thisAnimation, setThisAnimation] = useState<string | string[] | undefined>(undefined);
    const prevActionRef = useRef<AnimationAction | null>(null);
    const lastKeyRef = useRef<string | undefined>(undefined);
    const externalAnimations = useExternalAnimations(animationOverrides);

    const mixer = useMemo(() => clone ? new ThreeAnimationMixer(clone) : null, [clone]);

    const modelAnimationMap = useMemo(() => {
        const map: Record<string, AnimationClip> = {};

        modelAnimations?.forEach((clip) => {
            if (!clip.name) return;

            const filteredClip = filterClipForObject(filterNeckAnimations(clip, neckBoneName), clone ?? undefined);
            if (filteredClip.tracks.length > 0) {
                map[clip.name] = filteredClip;
            }
        });

        return map;
    }, [clone, modelAnimations, neckBoneName]);

    const externalAnimationMap = useMemo(() => {
        const map: Record<string, AnimationClip> = {};

        Object.entries(externalAnimations).forEach(([key, clip]) => {
            const filteredClip = filterClipForObject(filterNeckAnimations(clip, neckBoneName), clone ?? undefined);
            if (filteredClip.tracks.length > 0) {
                map[key] = filteredClip;
            }
        });

        return map;
    }, [clone, externalAnimations, neckBoneName]);

    const actions = useMemo(() => {
        if (!mixer || !clone) return {};

        const map: Record<string, AnimationAction> = {};

        Object.entries(modelAnimationMap).forEach(([name, clip]) => {
            map[name] = mixer.clipAction(clip, clone);
        });

        Object.entries(externalAnimationMap).forEach(([name, clip]) => {
            map[name] = mixer.clipAction(clip, clone);
        });

        Object.entries(REVERSE_ANIMATION_MAP).forEach(([reverseKey, baseKey]) => {
            const baseAction = map[baseKey];
            if (!baseAction || map[reverseKey]) return;

            const reverseClip = baseAction.getClip().clone();
            reverseClip.name = reverseKey;
            const reverseAction = mixer.clipAction(reverseClip, clone);
            map[reverseKey] = reverseAction;
        });

        return map;
    }, [clone, externalAnimationMap, mixer, modelAnimationMap]);

    useEffect(() => {
        onActions?.(actions);
    }, [actions, onActions]);

    useEffect(() => {
        if (!mixer) return;

        return () => {
            try {
                mixer.stopAllAction();
            } catch { }

            prevActionRef.current = null;
            lastKeyRef.current = undefined;
        };
    }, [mixer]);

    useEffect(() => {
        if (!thisAnimation || !mixer) return;

        const animationKey = typeof thisAnimation === "string" ? thisAnimation : thisAnimation[0];
        if (!animationKey) return;

        const isReversed = animationKey in REVERSE_ANIMATION_MAP;
        const actionKeys = Object.keys(actions);
        if (actionKeys.length === 0) return;

        const next = actions[animationKey];
        if (!next) {
            console.warn(`Animation "${animationKey}" was not found. Available animations: ${actionKeys.join(", ")}`);
            return;
        }
        if (lastKeyRef.current === animationKey && prevActionRef.current === next) return;

        const prev = prevActionRef.current;
        next.clampWhenFinished = true;
        next.timeScale = isReversed ? -1 : (next.timeScale < 0 ? 1 : next.timeScale);

        try {
            if (prev && prev !== next) prev.fadeOut(0.2);
        } catch { }

        try {
            next.reset().setLoop(LoopRepeat, 1000).fadeIn(0.2);
            next.time = isReversed ? next.getClip().duration : 0;
            next.play();
        } catch (error) {
            console.warn(`Could not play animation "${animationKey}".`, error);
            return;
        }

        prevActionRef.current = next;
        lastKeyRef.current = animationKey;
    }, [actions, mixer, thisAnimation]);

    return useMemo(() => ({
        thisAnimation,
        setThisAnimation,
        mixer,
        actions,
    }), [actions, mixer, thisAnimation]);
}

function getTargetWorldPosition(target: PlayerTarget, result: Vector3) {
    if ("getBody" in target) {
        const bodyPosition = target.getBody()?.position;

        if (!bodyPosition || bodyPosition.length < 3) {
            return null;
        }

        return result.set(bodyPosition[0], bodyPosition[1], bodyPosition[2]);
    }

    return target.getWorldPosition(result);
}

function useLookAtTarget(
    clone: Object3D<Object3DEventMap> | null,
    lookTarget: RefObject<PlayerTarget | null> | undefined,
    neckBoneName: string,
    tweenSpeed: number,
    restTweenSpeed: number,
) {
    const neckBoneRef = useRef<Bone | null>(null);
    const targetPositionRef = useRef(new Vector3());
    const previousQuaternionRef = useRef(new Quaternion());
    const desiredQuaternionRef = useRef(new Quaternion());
    const restQuaternionRef = useRef(new Quaternion());

    useEffect(() => {
        neckBoneRef.current = null;

        if (!clone) return;

        clone.traverse((object) => {
            if (object instanceof Bone && object.name === neckBoneName) {
                neckBoneRef.current = object;
                restQuaternionRef.current.copy(object.quaternion);
            }
        });
    }, [clone, neckBoneName]);

    useFrame((_, delta) => {
        const neck = neckBoneRef.current;
        if (!neck) return;

        const previousQuaternion = previousQuaternionRef.current.copy(neck.quaternion);
        const desiredQuaternion = desiredQuaternionRef.current;
        const target = lookTarget?.current;
        let speed = restTweenSpeed;

        if (target) {
            const targetPosition = getTargetWorldPosition(target, targetPositionRef.current);

            if (targetPosition) {
                targetPosition.y += LOOK_AT_TARGET_HEIGHT_OFFSET;
                neck.lookAt(targetPosition);
                desiredQuaternion.copy(neck.quaternion);
                neck.quaternion.copy(previousQuaternion);
                speed = tweenSpeed;
            } else {
                desiredQuaternion.copy(restQuaternionRef.current);
            }
        } else {
            desiredQuaternion.copy(restQuaternionRef.current);

            if (previousQuaternion.angleTo(desiredQuaternion) <= REST_POSE_EPSILON) {
                return;
            }
        }

        const alpha = 1 - Math.exp(-Math.max(0, speed) * delta);

        if (previousQuaternion.angleTo(desiredQuaternion) <= LOOK_AT_SNAP_EPSILON || alpha >= 1) {
            neck.quaternion.copy(desiredQuaternion);
        } else {
            neck.quaternion.slerpQuaternions(previousQuaternion, desiredQuaternion, alpha);
        }
    });
}

function useSkinnedMeshHandle(skinnedMeshRef: RefObject<SkinnedMeshRef | null>) {
    const [handle, setHandle] = useState<SkinnedMeshRef | null>(skinnedMeshRef.current);
    const handleRef = useRef<SkinnedMeshRef | null>(skinnedMeshRef.current);

    useEffect(() => {
        handleRef.current = skinnedMeshRef.current;
        setHandle(skinnedMeshRef.current);
    }, [skinnedMeshRef]);

    useFrame(() => {
        const nextHandle = skinnedMeshRef.current;
        if (handleRef.current === nextHandle) {
            return;
        }

        handleRef.current = nextHandle;
        setHandle(nextHandle);
    });

    return handle;
}

export default function AnimationMixer({
    skinnedMeshRef,
    animation,
    animationOverrides,
    lookTarget,
    lookAtTweenSpeed = DEFAULT_LOOK_AT_TWEEN_SPEED,
    lookAtRestTweenSpeed = DEFAULT_LOOK_AT_REST_TWEEN_SPEED,
    neckBoneName = "mixamorigNeck",
    onActions,
}: AnimationMixerProps) {
    const skinnedMesh = useSkinnedMeshHandle(skinnedMeshRef);
    const model = skinnedMesh?.model ?? null;
    const animations = skinnedMesh?.animations ?? [];
    const activeAnimation = animation ?? animations[0]?.name;
    const { mixer, setThisAnimation } = useAnimationState(model, animationOverrides, onActions, animations, neckBoneName);

    useEffect(() => {
        if (activeAnimation && mixer) {
            setThisAnimation(activeAnimation);
        }
    }, [activeAnimation, mixer, setThisAnimation]);

    useFrame((_, delta) => {
        mixer?.update(delta);
    });

    useLookAtTarget(model, lookTarget, neckBoneName, lookAtTweenSpeed, lookAtRestTweenSpeed);

    return null;
}
