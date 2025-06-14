import React, { useEffect, useState } from 'react';

interface SimpleAvatarProps {
  isSpeaking: boolean;
  isListening?: boolean;
  className?: string;
}

export const SimpleAvatar: React.FC<SimpleAvatarProps> = ({ 
  isSpeaking, 
  isListening = false, 
  className = "" 
}) => {
  const [mouthShape, setMouthShape] = useState<'closed' | 'small' | 'medium' | 'open'>('closed');
  const [blinkState, setBlinkState] = useState(false);
  const [headBob, setHeadBob] = useState(0);

  // Mouth animation when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthShape('closed');
      return;
    }

    // More natural speech patterns with varied timing and randomness
    const speechPatterns = [
      { shapes: ['small', 'medium', 'small', 'closed'], timings: [120, 180, 100, 150] },
      { shapes: ['medium', 'open', 'medium', 'small'], timings: [150, 200, 120, 180] },
      { shapes: ['open', 'medium', 'open', 'closed'], timings: [180, 140, 160, 200] },
      { shapes: ['small', 'open', 'small', 'medium'], timings: [100, 220, 130, 170] }
    ] as const;

    let patternIndex = 0;
    let shapeIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const animateNextShape = () => {
      const currentPattern = speechPatterns[patternIndex];
      setMouthShape(currentPattern.shapes[shapeIndex] as any);
      
      const nextTiming = currentPattern.timings[shapeIndex] + (Math.random() * 50 - 25); // Add some randomness
      
      shapeIndex++;
      if (shapeIndex >= currentPattern.shapes.length) {
        shapeIndex = 0;
        patternIndex = (patternIndex + 1) % speechPatterns.length;
      }
      
      timeoutId = setTimeout(animateNextShape, nextTiming);
    };

    animateNextShape();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSpeaking]);

  // Random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    }, 2000 + Math.random() * 3000); // Blink every 2-5 seconds

    return () => clearInterval(blinkInterval);
  }, []);

  // Subtle head bob when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setHeadBob(0);
      return;
    }

    const bobInterval = setInterval(() => {
      setHeadBob(prev => (prev + 1) % 4); // Cycle through 4 positions
    }, 400); // Change every 400ms for subtle movement

    return () => clearInterval(bobInterval);
  }, [isSpeaking]);

  // Get mouth path based on current shape - Always friendly!
  const getMouthPath = () => {
    switch (mouthShape) {
      case 'closed':
        return 'M 70 95 Q 80 102 90 95'; // Natural friendly smile
      case 'small':
        return 'M 72 93 Q 80 105 88 93'; // Small opening with smile
      case 'medium':
        return 'M 70 90 Q 80 110 90 90'; // Medium opening with smile
      case 'open':
        return 'M 68 88 Q 80 115 92 88'; // Wide opening with smile
      default:
        return 'M 70 95 Q 80 102 90 95';
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {/* Beautiful colorful pulse when speaking */}
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Outer rainbow ring */}
          <div className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-20 animate-ping" />
          {/* Middle colorful ring */}
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-green-500 opacity-25 animate-ping" style={{ animationDelay: '0.3s' }} />
          {/* Inner warm ring */}
          <div className="absolute w-64 h-64 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 opacity-30 animate-ping" style={{ animationDelay: '0.6s' }} />
          {/* Core glow */}
          <div className="absolute w-56 h-56 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-15 animate-pulse" />
        </div>
      )}
      
      {/* Gentle glow background */}
      <div className={`absolute w-48 h-48 rounded-full transition-all duration-700 ${
        isSpeaking 
          ? 'bg-gradient-to-br from-purple-400/30 via-blue-400/25 to-cyan-400/30 blur-2xl scale-125' 
          : isListening 
          ? 'bg-gradient-to-br from-green-400/20 via-emerald-400/15 to-blue-400/20 blur-xl scale-110'
          : 'bg-gradient-to-br from-gray-400/10 via-slate-400/8 to-gray-500/10 blur-lg scale-100'
      }`} />
      
      <div className={`relative transition-all duration-300 ${
        isSpeaking ? 'scale-110' : isListening ? 'scale-105' : 'scale-100'
      }`}>
        <div className="relative">
          {/* Fun floating elements around avatar */}
          {isSpeaking && (
            <>
              <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="absolute top-12 right-6 w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              <div className="absolute bottom-16 left-4 w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
              <div className="absolute bottom-8 right-8 w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.9s' }} />
            </>
          )}
          
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            className="drop-shadow-xl relative z-10"
            style={{ 
              transform: isSpeaking ? `translateY(${[-3, 0, 3, 0][headBob]}px) rotate(${[-1, 0, 1, 0][headBob]}deg)` : 'translateY(0px) rotate(0deg)',
              transition: 'transform 0.3s ease-in-out'
            }}
          >
            {/* Main face - modern UI style */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="url(#modernFaceGradient)"
              stroke="url(#borderGradient)"
              strokeWidth="3"
              className="transition-all duration-300"
            />
            
            {/* Inner glow */}
            <circle
              cx="80"
              cy="75"
              r="55"
              fill="url(#innerGlow)"
              opacity="0.4"
            />
            
            {/* Cute hair/top decoration */}
            <path
              d="M 20 65 Q 25 20 80 15 Q 135 20 140 65 Q 135 45 120 35 Q 100 10 80 10 Q 60 10 40 35 Q 25 45 20 65"
              fill="url(#playfulHairGradient)"
              className="drop-shadow-md"
            />
            
            {/* Hair shine */}
            <ellipse
              cx="80"
              cy="40"
              rx="25"
              ry="8"
              fill="url(#hairShine)"
              opacity="0.6"
            />
            
            {/* Super cute eyes */}
            <g className="transition-all duration-200">
              {/* Eye whites */}
              <ellipse
                cx="65"
                cy="75"
                rx="12"
                ry={blinkState ? "2" : "10"}
                fill="white"
                className="drop-shadow-sm"
              />
              <ellipse
                cx="95"
                cy="75"
                rx="12"
                ry={blinkState ? "2" : "10"}
                fill="white"
                className="drop-shadow-sm"
              />
              
              {/* Colorful iris */}
              {!blinkState && (
                <>
                  <circle cx="65" cy="75" r="7" fill="url(#eyeGradient)" />
                  <circle cx="95" cy="75" r="7" fill="url(#eyeGradient)" />
                  <circle cx="65" cy="75" r="3" fill="#1E293B" />
                  <circle cx="95" cy="75" r="3" fill="#1E293B" />
                  {/* Sparkly highlights */}
                  <circle cx="67" cy="72" r="2" fill="white" />
                  <circle cx="97" cy="72" r="2" fill="white" />
                  <circle cx="63" cy="77" r="1" fill="white" opacity="0.8" />
                  <circle cx="93" cy="77" r="1" fill="white" opacity="0.8" />
                </>
              )}
            </g>
            
            {/* Adorable blush */}
            <circle
              cx="45"
              cy="85"
              r="6"
              fill="#FF6B9D"
              opacity="0.5"
              className="animate-pulse"
            />
            <circle
              cx="115"
              cy="85"
              r="6"
              fill="#FF6B9D"
              opacity="0.5"
              className="animate-pulse"
            />
            
            {/* Tiny cute nose */}
            <circle
              cx="80"
              cy="85"
              r="2"
              fill="#F97316"
              opacity="0.7"
            />
            
            {/* Happy mouth */}
            <path
              d={getMouthPath()}
              stroke="url(#mouthGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              fill={mouthShape === 'open' || mouthShape === 'medium' ? '#FCA5A5' : 'none'}
              className="transition-all duration-200"
            />
            
            {/* Cute teeth when talking */}
            {(mouthShape === 'open' || mouthShape === 'medium') && (
              <ellipse
                cx="80"
                cy="105"
                rx="8"
                ry="4"
                fill="white"
                opacity="0.95"
                className="drop-shadow-sm"
              />
            )}
            
            {/* Fun decorative elements */}
            <g opacity="0.6">
              {/* Cute cheek highlights */}
              <ellipse cx="50" cy="80" rx="8" ry="4" fill="url(#cheekHighlight)" opacity="0.3" />
              <ellipse cx="110" cy="80" rx="8" ry="4" fill="url(#cheekHighlight)" opacity="0.3" />
            </g>
          
          {/* Listening indicator */}
          {isListening && (
            <g>
              <circle
                cx="80"
                cy="140"
                r="3"
                fill="#10B981"
                className="animate-pulse"
              />
              <circle
                cx="72"
                cy="140"
                r="2"
                fill="#10B981"
                className="animate-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <circle
                cx="88"
                cy="140"
                r="2"
                fill="#10B981"
                className="animate-pulse"
                style={{ animationDelay: '0.4s' }}
              />
            </g>
          )}
          
          {/* Speaking sound waves */}
          {isSpeaking && (
            <g>
              <path
                d="M 125 80 Q 135 80 125 80"
                stroke="#60A5FA"
                strokeWidth="2"
                fill="none"
                opacity="0.7"
                className="animate-pulse"
              />
              <path
                d="M 130 75 Q 145 80 130 85"
                stroke="#60A5FA"
                strokeWidth="2"
                fill="none"
                opacity="0.5"
                className="animate-pulse"
                style={{ animationDelay: '0.3s' }}
              />
              <path
                d="M 135 70 Q 155 80 135 90"
                stroke="#60A5FA"
                strokeWidth="2"
                fill="none"
                opacity="0.3"
                className="animate-pulse"
                style={{ animationDelay: '0.6s' }}
              />
            </g>
          )}
          
          {/* Beautiful modern gradients */}
          <defs>
            <radialGradient id="modernFaceGradient" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="50%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </radialGradient>
            <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <radialGradient id="innerGlow" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <linearGradient id="playfulHairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="hairShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <radialGradient id="eyeGradient" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </radialGradient>
            <linearGradient id="mouthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
            <radialGradient id="cheekHighlight" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
        </svg>
      </div>
        
        {/* Status text */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            isSpeaking 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : isListening 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready'}
          </div>
        </div>
      </div>
    </div>
  );
}; 