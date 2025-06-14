'use client';

import { Suspense, lazy, useEffect, useRef } from 'react';
const Spline = lazy(() => import('@splinetool/react-spline'));

interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
  disableFollow?: boolean;
  isSpeaking?: boolean;
}

export function InteractiveRobotSpline({ scene, className, disableFollow = false, isSpeaking = false }: InteractiveRobotSplineProps) {
  const appRef = useRef<any>(null);
  const headRef = useRef<any>(null);
  const frameRef = useRef<number>();

  function handleLoad(app: any) {
    appRef.current = app;
    if (!disableFollow) return;

    try {
      // iterate children and remove follow & lookAt events recursively
      const stripEventsRecursively = (node: any) => {
        if (!node) return;
        if (node.follow) node.follow = null;
        if (node.lookAt) node.lookAt = null;
        if (Array.isArray(node.events)) {
          node.events = node.events.filter((ev: any) => ev?.type !== 'follow' && ev?.eventType !== 'follow' && ev?.type !== 'lookAt' && ev?.eventType !== 'lookAt');
        }
        if (Array.isArray(node.children)) {
          node.children.forEach(stripEventsRecursively);
        }
      };

      stripEventsRecursively(app?.scene);

      // Try to find the first object whose name includes "head" (case-insensitive)
      const stack: any[] = [app?.scene];
      while (stack.length) {
        const node = stack.pop();
        if (!node) continue;
        if (typeof node.name === 'string' && /head/i.test(node.name)) {
          headRef.current = node;
          break;
        }
        if (Array.isArray(node.children)) stack.push(...node.children);
      }
    } catch (e) {
      console.warn('Could not strip follow events:', e);
    }
  }

  // Speaking head nod animation
  useEffect(() => {
    if (!headRef.current) return; // no head reference

    const head = headRef.current;
    let t = 0;

    const animate = () => {
      if (!head) return;
      t += 0.15;
      // nodding rotation on X axis small degrees
      head.rotation.x = Math.sin(t) * 0.1;
      frameRef.current = requestAnimationFrame(animate);
    };

    if (isSpeaking) {
      animate();
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
      // reset head rotation
      if (head) head.rotation.x = 0;
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isSpeaking]);

  // Block global pointermove when disableFollow to prevent Spline cursor tracking even if events are global
  useEffect(() => {
    if (!disableFollow) return;

    const stopEvent = (e: PointerEvent) => {
      e.stopImmediatePropagation();
    };

    window.addEventListener('pointermove', stopEvent, true);
    window.addEventListener('mousemove', stopEvent, true);

    return () => {
      window.removeEventListener('pointermove', stopEvent, true);
      window.removeEventListener('mousemove', stopEvent, true);
    };
  }, [disableFollow]);

  return (
    <Suspense
      fallback={
        <div className={`w-full h-full flex items-center justify-center bg-gray-900 text-white ${className}`}>
          <svg className="animate-spin h-5 w-5 text-white mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"></path>
          </svg>
          <span>Loading 3D Robot...</span>
        </div>
      }
    >
      <Spline
        scene={scene}
        className={className}
        onLoad={handleLoad}
        renderOnDemand={false}
      />
    </Suspense>
  );
} 