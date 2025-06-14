import React from 'react';
import { Camera, CameraOff } from 'lucide-react';

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isRecording: boolean;
  hasPermission: boolean;
  error: string | null;
  onToggleRecording: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoRef,
  canvasRef,
  isRecording,
  hasPermission,
  error,
  onToggleRecording
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
        {/* Video Container */}
        <div className="relative w-48 h-36">
          {hasPermission && isRecording ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  // Ensure video plays when metadata is loaded
                  console.log('📹 Video metadata loaded');
                  if (videoRef.current) {
                    console.log('📹 Playing video from metadata event');
                    videoRef.current.play().catch(err => {
                      console.error('❌ Video play failed in metadata event:', err);
                    });
                  }
                }}
                onCanPlay={() => {
                  console.log('📹 Video can play');
                }}
                onError={(e) => {
                  console.error('❌ Video error:', e);
                }}
              />
              {/* Recording indicator */}
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white font-medium">REC</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <div className="text-center">
                <CameraOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">
                  {error ? 'Camera Error' : 'Camera Off'}
                </p>
              </div>
            </div>
          )}
          
          {/* Hidden canvas for analysis */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>

        {/* Controls */}
        <div className="p-3 border-t border-gray-700/50">
          <button
            onClick={onToggleRecording}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              isRecording
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
            }`}
          >
            {isRecording ? (
              <>
                <CameraOff className="w-3 h-3" />
                Stop Video
              </>
            ) : (
              <>
                <Camera className="w-3 h-3" />
                Start Video
              </>
            )}
          </button>
          
          {error && (
            <p className="text-xs text-red-400 mt-2 text-center">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}; 