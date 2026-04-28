
"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Prefab } from "react-three-game";

// Import default maps
import nuketown from "../levels/lobby.json";
import killbox from "../levels/killbox.json";

const defaultMaps = {
    killbox: killbox as Prefab,
    nuketown: nuketown as Prefab,
};

type MapList = Record<string, Prefab>;

function MapPicker({ onMapChange, maps = defaultMaps }: { onMapChange: (map: Prefab) => void; maps?: MapList }) {
    const [selectedMap, setSelectedMap] = useState<keyof typeof maps | 'custom'>("killbox");
    const [customMap, setCustomMap] = useState<Prefab | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    setCustomMap(json as Prefab);
                    setSelectedMap('custom');
                    onMapChange(json as Prefab);
                } catch (error) {
                    console.error('Failed to parse JSON:', error);
                    alert('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        }
    };

    return <div style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        gap: 8,
        color: 'white',
        alignItems: 'center',
    }}>
        <select
            value={selectedMap}
            onChange={(e) => {
                const mapKey = e.target.value as keyof typeof maps | 'custom';
                setSelectedMap(mapKey);
                if (mapKey !== 'custom') {
                    onMapChange(maps[mapKey]);
                } else if (customMap) {
                    onMapChange(customMap);
                }
            }}
            style={{ padding: '6px 10px', background: 'rgba(0, 0, 0, 0.75)', color: 'white', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
        >
            {Object.keys(maps).map((key) => (
                <option key={key} value={key}>{key}</option>
            ))}
            {customMap && <option value="custom">Custom</option>}
        </select>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            style={{ display: 'none' }}
        />
        <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '6px 10px', background: 'rgba(0, 0, 0, 0.75)', color: 'white', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
        >
            Upload JSON
        </button>
    </div>;
}

export default MapPicker;