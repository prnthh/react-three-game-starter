# Runtime Integrations

Runtime systems are mounted inside `<PrefabEditor>` / `<PrefabRoot>` and use the same scene API as normal R3F children.

Use this pattern for systems such as interaction zones, AI directors, navmesh helpers, quest state, analytics markers, debug overlays, and custom simulation. For advanced physics, use `rules/ADVANCED_PHYSICS.md`.

## Pattern

- Store authored config in a first-class component, not `Data`, when the config owns behavior.
- Let each component `View` register and unregister itself in `useEffect`.
- Put shared runtime state in a small provider component mounted as a child of the editor/root.
- Use `useScene()` for cross-node lookup and `useNode()` for current-node access.
- Use `gameEvents` for broadcasts and `Scene.getHandle(id, kind)` for direct runtime handles.

## Minimal example: proximity zones

Prefab data:

```json
{
  "id": "door-zone",
  "components": {
    "transform": { "type": "Transform", "properties": { "position": [0, 0, -3] } },
    "proximityZone": {
      "type": "ProximityZone",
      "properties": {
        "radius": 2,
        "eventName": "door:near"
      }
    }
  }
}
```

Component view:

```tsx
import { useEffect } from 'react';
import {
  FieldRenderer,
  useNode,
  type Component,
  type ComponentViewProps,
  type FieldDefinition,
} from 'react-three-game';
import { proximityRuntime } from './proximityRuntime';

type ProximityZoneProps = { radius?: number; eventName?: string };

const fields: FieldDefinition[] = [
  { name: 'radius', type: 'number', label: 'Radius', step: 0.25 },
  { name: 'eventName', type: 'string', label: 'Event' },
];

function ProximityZoneView({ properties, children }: ComponentViewProps<ProximityZoneProps>) {
  const { nodeId } = useNode();

  useEffect(() => {
    proximityRuntime.register(nodeId, {
      radius: properties.radius ?? 1,
      eventName: properties.eventName,
    });
    return () => proximityRuntime.unregister(nodeId);
  }, [nodeId, properties.radius, properties.eventName]);

  return <>{children}</>;
}

export const ProximityZone: Component = {
  name: 'ProximityZone',
  Editor: ({ component, onUpdate }) => (
    <FieldRenderer fields={fields} values={component.properties} onChange={onUpdate} />
  ),
  View: ProximityZoneView,
  defaultProperties: { radius: 1, eventName: '' },
};
```

Runtime:

```tsx
import { useFrame } from '@react-three/fiber';
import { gameEvents, PrefabEditorMode, useScene } from 'react-three-game';
import { Vector3 } from 'three';

type Zone = { radius: number; eventName?: string };

const zones = new Map<string, Zone>();
const active = new Set<string>();

export const proximityRuntime = {
  register(id: string, zone: Zone) {
    zones.set(id, zone);
  },
  unregister(id: string) {
    zones.delete(id);
    active.delete(id);
  },
};

const playerPosition = new Vector3();
const zonePosition = new Vector3();

export function ProximityRuntime({ playerId = 'player' }: { playerId?: string }) {
  const scene = useScene();

  useFrame(() => {
    if (scene.mode !== PrefabEditorMode.Play) return;
    const player = scene.getObject(playerId);
    if (!player) return;

    player.getWorldPosition(playerPosition);

    for (const [zoneId, zone] of zones) {
      const object = scene.getObject(zoneId);
      if (!object) continue;

      object.getWorldPosition(zonePosition);
      const inside = playerPosition.distanceTo(zonePosition) <= zone.radius;
      const wasInside = active.has(zoneId);

      if (inside && !wasInside) {
        active.add(zoneId);
        if (zone.eventName) {
          gameEvents.emit(zone.eventName, { sourceNodeId: playerId, targetNodeId: zoneId });
        }
      } else if (!inside && wasInside) {
        active.delete(zoneId);
      }
    }
  });

  return null;
}
```

Mounting:

```tsx
import { PrefabEditor, registerComponent } from 'react-three-game';
import { ProximityRuntime, ProximityZone } from './proximity';

registerComponent(ProximityZone);

<PrefabEditor initialPrefab={prefab}>
  <ProximityRuntime playerId="player" />
</PrefabEditor>
```

## Guidance

- Keep serialized knobs in component `properties`.
- Keep live objects, caches, timers, and subscriptions outside prefab JSON.
- Read authored node transforms with `scene.getObject(id)` instead of traversing the Three.js scene.
- Gate play-only systems on `scene.mode === PrefabEditorMode.Play`.
- Clean up registrations in `useEffect` returns.
- Prefer a runtime handle when another system needs imperative access to one node; prefer `gameEvents` for broadcasts.
