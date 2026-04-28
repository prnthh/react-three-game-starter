/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Joystick, Button } from './TouchscreenControls';
import KeyboardInput from './KeyboardControls';
import PointerLockControls from './PointerLockControls';

type FullscreenElement = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
};

type LookHandler = (dx: number, dy: number) => void;

type ControlsContextValue = {
    setLookHandler: (handler: LookHandler | null) => void;
    setEnabled: (enabled: boolean) => void;
};

const ControlsContext = createContext<ControlsContextValue | null>(null);

export function useControls() {
    const context = useContext(ControlsContext);
    if (!context) {
        throw new Error('useControls must be used within Controls');
    }
    return context;
}

function isMobileDevice() {
    if (typeof navigator === 'undefined') return false;

    // Check for touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Check user agent
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

    // Return true if either touch is supported OR it's a mobile user agent
    return hasTouch || isMobileUA;
}

function Controls({ children }: { children: React.ReactNode }) {
    const [isMobile, setIsMobile] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const lookHandlerRef = useRef<LookHandler | null>(null);

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

    const handleTap = useCallback(() => {
        // Check if we're on mobile and not already in fullscreen
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const elem = document.documentElement as FullscreenElement;
            if (!document.fullscreenElement) {
                elem.requestFullscreen?.() ||
                    elem.webkitRequestFullscreen?.() ||
                    elem.mozRequestFullScreen?.() ||
                    elem.msRequestFullscreen?.();
            }
        }
    }, []);

    useEffect(() => {
        if (!isMobile) {
            return;
        }

        const handleFirstInteraction = () => {
            handleTap();
            document.removeEventListener('pointerdown', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
        };

        document.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
        document.addEventListener('touchstart', handleFirstInteraction, { passive: true });

        return () => {
            document.removeEventListener('pointerdown', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
        };
    }, [handleTap, isMobile]);

    const setLookHandler = useCallback((handler: LookHandler | null) => {
        lookHandlerRef.current = handler;
    }, []);

    const handleSetEnabled = useCallback((nextEnabled: boolean) => {
        setEnabled(nextEnabled);
    }, []);

    const controlsContextValue = useMemo<ControlsContextValue>(() => ({
        setLookHandler,
        setEnabled: handleSetEnabled,
    }), [handleSetEnabled, setLookHandler]);

    return (
        <ControlsContext.Provider value={controlsContextValue}>
            <div
                style={{ width: '100%', height: '100%', position: 'relative' }}
            >
                {children}
                {enabled && <>
                    <KeyboardInput />
                    <PointerLockControls onLook={(dx, dy) => lookHandlerRef.current?.(dx, dy)} />
                    {isMobile && (<>
                        <div style={{ position: 'absolute', bottom: 40, left: 40, zIndex: 50, color: 'white', userSelect: 'none' }}>
                            <Joystick horizontalAxis='horizontal' verticalAxis='vertical' />
                        </div>
                        <div style={{ position: 'absolute', bottom: 40, right: 40, zIndex: 50, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, color: 'white', userSelect: 'none' }}>
                            {/* twin stick */}
                            {/* <Joystick horizontalAxis='lookHorizontal' verticalAxis='lookVertical' /> */}
                            <Button button="use" />
                            <Button button="altUse" />
                            <Button button="aim" />
                            <Button button="fire" />
                            <Button button="jump" />
                        </div>
                    </>)}
                </>}
            </div>
        </ControlsContext.Provider>
    );
}

export default Controls;
