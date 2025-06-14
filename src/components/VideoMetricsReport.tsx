import React from 'react';
import { User, Eye, Hand, BarChart3, Target, Zap, Shield, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface VideoMetricsReportProps {
  metrics: {
    averagePosture: number;
    averageEyeContact: number;
    averageConfidence: number;
    averageStability: number;
    averageEngagement: number;
    averageBlinkRate?: number;
    averageHeadTilt?: number;
    gestureBreakdown: {
      composed: number;
      natural: number;
      animated: number;
      restless: number;
    };
    overallInterviewScore: number;
    recommendations: string[];
    totalSamples: number;
  };
}

export const VideoMetricsReport: React.FC<VideoMetricsReportProps> = ({ metrics }) => {
  const { 
    averagePosture, 
    averageEyeContact, 
    averageConfidence,
    averageStability,
    averageEngagement,
    averageBlinkRate,
    averageHeadTilt,
    gestureBreakdown, 
    overallInterviewScore,
    recommendations,
    totalSamples 
  } = metrics;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Work';
  };

  const totalGestures = gestureBreakdown.composed + gestureBreakdown.natural + gestureBreakdown.animated + gestureBreakdown.restless;
  const gesturePercentages = {
    composed: totalGestures > 0 ? Math.round((gestureBreakdown.composed / totalGestures) * 100) : 0,
    natural: totalGestures > 0 ? Math.round((gestureBreakdown.natural / totalGestures) * 100) : 0,
    animated: totalGestures > 0 ? Math.round((gestureBreakdown.animated / totalGestures) * 100) : 0,
    restless: totalGestures > 0 ? Math.round((gestureBreakdown.restless / totalGestures) * 100) : 0,
  };

  if (totalSamples === 0) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Video Data</h3>
          <p className="text-gray-400">Video recording was not enabled during this interview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-semibold text-white">Interview Performance Analysis</h3>
      </div>

      {/* Overall Score */}
      <div className={`p-6 rounded-xl border mb-6 ${getScoreBackground(overallInterviewScore)}`}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-6 h-6 text-blue-400" />
            <span className="text-lg font-medium text-white">Overall Interview Score</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{overallInterviewScore}%</div>
          <div className={`text-lg font-medium ${getScoreColor(overallInterviewScore)}`}>
            {getScoreLabel(overallInterviewScore)}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 mt-4">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                overallInterviewScore >= 80 ? 'bg-green-400' : 
                overallInterviewScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${overallInterviewScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Posture */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">Posture</span>
          </div>
          <div className={`p-4 rounded-xl border ${getScoreBackground(averagePosture)}`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{averagePosture}%</div>
              <div className={`text-xs font-medium ${getScoreColor(averagePosture)} mt-1`}>
                {getScoreLabel(averagePosture)}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    averagePosture >= 80 ? 'bg-green-400' : 
                    averagePosture >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${averagePosture}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Eye Contact */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Eye Contact</span>
          </div>
          <div className={`p-4 rounded-xl border ${getScoreBackground(averageEyeContact)}`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{averageEyeContact}%</div>
              <div className={`text-xs font-medium ${getScoreColor(averageEyeContact)} mt-1`}>
                {getScoreLabel(averageEyeContact)}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    averageEyeContact >= 80 ? 'bg-green-400' : 
                    averageEyeContact >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${averageEyeContact}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-medium text-gray-300">Confidence</span>
          </div>
          <div className={`p-4 rounded-xl border ${getScoreBackground(averageConfidence)}`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{averageConfidence}%</div>
              <div className={`text-xs font-medium ${getScoreColor(averageConfidence)} mt-1`}>
                {getScoreLabel(averageConfidence)}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    averageConfidence >= 80 ? 'bg-green-400' : 
                    averageConfidence >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${averageConfidence}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stability */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-gray-300">Stability</span>
          </div>
          <div className={`p-4 rounded-xl border ${getScoreBackground(averageStability)}`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{averageStability}%</div>
              <div className={`text-xs font-medium ${getScoreColor(averageStability)} mt-1`}>
                {getScoreLabel(averageStability)}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    averageStability >= 80 ? 'bg-green-400' : 
                    averageStability >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${averageStability}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Engagement */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-medium text-gray-300">Engagement</span>
          </div>
          <div className={`p-4 rounded-xl border ${getScoreBackground(averageEngagement)}`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{averageEngagement}%</div>
              <div className={`text-xs font-medium ${getScoreColor(averageEngagement)} mt-1`}>
                {getScoreLabel(averageEngagement)}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    averageEngagement >= 80 ? 'bg-green-400' : 
                    averageEngagement >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${averageEngagement}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gesture Analysis */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <Hand className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium text-gray-300">Body Language Style</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-400">{gesturePercentages.composed}%</div>
            <div className="text-xs text-green-300 mt-1">Composed</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-blue-400">{gesturePercentages.natural}%</div>
            <div className="text-xs text-blue-300 mt-1">Natural</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">{gesturePercentages.animated}%</div>
            <div className="text-xs text-yellow-300 mt-1">Animated</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-red-400">{gesturePercentages.restless}%</div>
            <div className="text-xs text-red-300 mt-1">Restless</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium text-gray-300">Recommendations</span>
        </div>
        <div className="space-y-2">
          {recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-300">{recommendation}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-700/30 rounded-xl">
        <p className="text-sm text-gray-300">
          <span className="font-medium text-white">Analysis Summary:</span> Based on {totalSamples} samples 
          collected during your interview. This comprehensive analysis evaluates your interview presence, 
          body language, and professional demeanor to help you improve your performance.
        </p>
      </div>
    </div>
  );
}; 