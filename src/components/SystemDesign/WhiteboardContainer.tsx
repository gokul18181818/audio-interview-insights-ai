import { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Excalidraw, exportToCanvas, exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';

interface WhiteboardContainerProps {
  onElementsChange?: (elements: ExcalidrawElement[], appState: AppState) => void;
  onSnapshot?: (imageData: string, elementsData: ExcalidrawElement[]) => void;
  className?: string;
}

export interface WhiteboardRef {
  captureSnapshot: () => Promise<string | null>;
  clearCanvas: () => void;
  getElements: () => ExcalidrawElement[];
}

const WhiteboardContainer = forwardRef<WhiteboardRef, WhiteboardContainerProps>(({
  onElementsChange,
  onSnapshot,
  className = ""
}, ref) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Debounced change handler to avoid too frequent updates
  const handleChange = useCallback((elements: ExcalidrawElement[], appState: AppState) => {
    setElements(elements);
    setAppState(appState);
    
    // Call parent handler if provided
    if (onElementsChange) {
      onElementsChange(elements, appState);
    }
  }, [onElementsChange]);

  // Capture whiteboard as image
  const captureSnapshot = useCallback(async (): Promise<string | null> => {
    if (!excalidrawAPI || !appState) {
      console.warn('Excalidraw API or app state not available');
      return null;
    }

    setIsCapturing(true);
    try {
      // Export to canvas
      const canvas = await exportToCanvas({
        elements: excalidrawAPI.getSceneElements(),
        appState: {
          ...appState,
          exportBackground: true,
          exportWithDarkMode: false,
          width: 1200,
          height: 800
        },
        files: excalidrawAPI.getFiles(),
      });

      // Convert to base64
      const imageData = canvas.toDataURL('image/png');
      
      // Call parent handler if provided
      if (onSnapshot) {
        onSnapshot(imageData, excalidrawAPI.getSceneElements());
      }

      toast.success('Whiteboard snapshot captured!');
      return imageData;

    } catch (error) {
      console.error('Failed to capture snapshot:', error);
      toast.error('Failed to capture snapshot');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [excalidrawAPI, appState, onSnapshot]);

  // Clear the canvas
  const clearCanvas = useCallback(() => {
    if (!excalidrawAPI) return;
    
    excalidrawAPI.updateScene({
      elements: [],
    });
    
    toast.success('Whiteboard cleared');
  }, [excalidrawAPI]);

  // Get current elements
  const getElements = useCallback((): ExcalidrawElement[] => {
    if (!excalidrawAPI) return [];
    return excalidrawAPI.getSceneElements();
  }, [excalidrawAPI]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    captureSnapshot,
    clearCanvas,
    getElements
  }), [captureSnapshot, clearCanvas, getElements]);

  // Auto-save every 30 seconds
  const autoSave = useCallback(async () => {
    if (elements.length > 0) {
      await captureSnapshot();
    }
  }, [elements, captureSnapshot]);

  return (
    <Card className={`relative h-full border-2 border-dashed border-gray-200 ${className}`}>
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-1 border shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={captureSnapshot}
          disabled={isCapturing}
          className="flex items-center gap-1"
        >
          <Camera className="h-4 w-4" />
          {isCapturing ? 'Capturing...' : 'Snapshot'}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCanvas}
          className="flex items-center gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Excalidraw Canvas */}
      <div className="h-full w-full">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleChange}
          initialData={{
            elements: [],
            appState: {
              viewBackgroundColor: "#ffffff",
              currentItemFontFamily: 1,
              currentItemFontSize: 16,
              currentItemStrokeColor: "#000000",
              currentItemBackgroundColor: "transparent",
              currentItemRoughness: 1,
              currentItemOpacity: 100,
              currentItemStrokeWidth: 1,
              currentItemStrokeStyle: "solid",
              currentItemLinearStrokeSharpness: "round",
              currentItemStartArrowhead: null,
              currentItemEndArrowhead: "arrow",
              gridSize: null,
              colorPalette: {}
            }
          }}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
              toggleTheme: false
            },
            tools: {
              image: false
            }
          }}
        />
      </div>

      {/* Instructions overlay for empty canvas */}
      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border shadow-sm text-center max-w-md">
            <h3 className="font-semibold text-lg mb-2">Start Your System Design</h3>
            <p className="text-gray-600 text-sm">
              Use the tools above to draw your architecture. Start with high-level components and add details as you go.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              💡 Tip: Use rectangles for services, arrows for data flow, and text for labels
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});

WhiteboardContainer.displayName = 'WhiteboardContainer';

export default WhiteboardContainer; 