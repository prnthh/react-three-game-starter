# Advanced Physics

Use the CrashCat plugin for rigid bodies, sensors, collision events, and character-controller integrations.

## Import path

```tsx
import { registerComponent } from 'react-three-game';
import {
  CrashcatPhysicsComponent,
  CrashcatRuntime,
  useCrashcat,
} from 'react-three-game/plugins/crashcat';
```

## Setup

Register the component once before mounting a prefab that uses `CrashcatPhysics`:

```tsx
registerComponent(CrashcatPhysicsComponent);
```

Mount the runtime as a child of the editor or root renderer:

```tsx
<PrefabEditor initialPrefab={prefab}>
  <CrashcatRuntime debug>
    <FirstPersonPlayer nodeId="player" />
  </CrashcatRuntime>
</PrefabEditor>
```

Use `debug` when authoring or inspecting colliders. Leave it off for normal play builds.

## Authored component

Add `CrashcatPhysics` to the same node as the rendered geometry or model.

```json
{
  "id": "crate",
  "components": {
    "transform": { "type": "Transform", "properties": { "position": [0, 3, 0] } },
    "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [1, 1, 1] } },
    "material": { "type": "Material", "properties": { "color": "#c97316" } },
    "crashcatPhysics": {
      "type": "CrashcatPhysics",
      "properties": {
        "type": "dynamic",
        "colliders": "cuboid",
        "friction": 0.6,
        "restitution": 0.1
      }
    }
  }
}
```

Common properties:

- `type`: `fixed`, `dynamic`, `kinematicPosition`, or `kinematicVelocity`.
- `colliders`: `cuboid`, `ball`, `capsule`, `hull`, or `trimesh`.
- `sensor`: true for trigger-style bodies.
- `linearVelocity` / `angularVelocity`: initial motion for dynamic bodies.
- `collisionEnterEventName`, `collisionExitEventName`, `sensorEnterEventName`, `sensorExitEventName`: event names emitted through `gameEvents`.

## Controllers

Controllers usually use one of two shapes:

- **Composed R3F controller**: the controller is mounted as normal R3F/React children inside `<PrefabEditor>` / `<PrefabRoot>`. Keep a React ref to its group and sync the physics body from that ref.
- **Prefab-node component**: the controller is an r3g `Component` attached to an authored prefab node. Read/write that node with `useNode()` or `scene.getObject(playerId)`.

Composed R3F controller:

```tsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';
import { PrefabEditorMode, useScene } from 'react-three-game';
import { useCrashcat } from 'react-three-game/plugins/crashcat';

function FirstPersonRig() {
  const scene = useScene();
  const crashcat = useCrashcat();
  const rigRef = useRef<Group>(null);

  useFrame((_, dt) => {
    if (scene.mode !== PrefabEditorMode.Play || !crashcat || !rigRef.current) return;
    // Read input, query crashcat.world, then write to rigRef.current and its body.
  }, -2);

  return <group ref={rigRef}>{/* camera, controls, viewmodel */}</group>;
}
```

Prefab-node component:

```tsx
import { useFrame } from '@react-three/fiber';
import { PrefabEditorMode, useScene } from 'react-three-game';
import { useCrashcat } from 'react-three-game/plugins/crashcat';

function PlayerController({ playerId = 'player' }: { playerId?: string }) {
  const scene = useScene();
  const crashcat = useCrashcat();

  useFrame((_, dt) => {
    if (scene.mode !== PrefabEditorMode.Play || !crashcat) return;
    const player = scene.getObject(playerId);
    if (!player) return;
    // Read input, query crashcat.world, then write to the authored player object.
  }, -2);

  return null;
}
```

Keep transient controller state in refs. Serialize only authoring knobs into prefab JSON. For self-mounted camera rigs, use `useRef<Group>()` instead of `scene.getObject(playerId)`.

## Events

`CrashcatPhysics` can emit collision and sensor events through `gameEvents`. A collision payload includes the source node id, target node id when known, and collision normal for contact-enter events.

Pair physics events with `Sound` components by setting a Sound `eventName` to the same value. Omit routing fields for broadcast sounds; include `nodeId` / `sourceNodeId` / `targetNodeId` only when a listener should be targeted directly.
