# react-three-game starter

A small template project for building JSON-authored games with React, Three.js, and `react-three-game`.

## What is included

- A playable viewer/runtime built around `GameCanvas` and `PrefabRoot`.
- An in-app prefab editor built around `PrefabEditor`.
- Sample level JSON in `src/levels/`.
- A first-person player controller in `src/game/FirstPersonPlayer.tsx`.
- Example custom components registered with `react-three-game`.

The main idea: author levels as prefab JSON, open them in the editor, and load the same JSON in the runtime.

## Stack

- React
- Three.js
- `@react-three/fiber`
- `react-three-game`
- Vite

## Getting started

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually `http://localhost:5173`.

Useful scripts:

```bash
npm run build
npm run preview
npm run lint
```

## Project pointers

- `src/game/page.tsx` mounts the playable viewer.
- `src/game/editor/page.tsx` mounts the editor.
- `src/game/MapPicker.tsx` loads built-in or uploaded level JSON.
- `src/game/FirstPersonPlayer.tsx` contains the player controller.
- `src/game/components/` contains example runtime/editor components.
- `src/levels/` contains sample level JSON.
- `public/` contains static assets used by levels.

## Assets

Static assets live under `public/`.

- Models: `public/models`
- Textures: `public/textures`
- Sound: `public/sound`

If you add or remove assets, regenerate the manifests:

```bash
sh generate-manifests.sh
```
