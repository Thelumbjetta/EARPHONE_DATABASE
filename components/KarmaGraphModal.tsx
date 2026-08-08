'use client';

import { X, TrendingUp, Award, Eye, ThumbsUp } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  karma?: number;
};

export default function KarmaGraphModal({ isOpen, onClose, karma = 12400 }: Props) {
  if (!isOpen) return null;

  // Mock time series points for SVG line chart
  const points = [
    { day: 'Day 1', val: 8200 },
    { day: 'Day 7', val: 9400 },
    { day: 'Day 14', val: 10600 },
    { day: 'Day 21', val: 11800 },
    { day: 'Day 30', val: karma },
  ];

  // Map SVG coordinates (width 500, height 180)
  const minVal = 7000;
  const maxVal = 13500;
  const width = 500;
  const height = 180;

  const getX = (index: number) => (index / (points.length - 1)) * (width - 40) + 20;
  const getY = (val: number) => height - 30 - ((val - minVal) / (maxVal - minVal)) * (height - 50);

  const polylinePoints = points.map((p, i) => `${getX(i)},${getY(p.val)}`).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-xl bg-white border border-[#eaefec] rounded-2xl p-6 shadow-xl relative space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eaefec] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6f7f0] border border-[#a7f3d0] text-[#10b981] flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#111827]">Karma Growth Analytics</h2>
              <p className="text-xs text-gray-500 font-normal">30-Day Reputation Trajectory &amp; Community Contributions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#f8faf9] border border-gray-200 rounded-xl p-3 space-y-0.5">
            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#10b981]" /> Total Karma
            </span>
            <span className="text-lg font-black text-[#111827] block">
              {(karma / 1000).toFixed(1)}k
            </span>
          </div>

          <div className="bg-[#e6f7f0] border border-[#a7f3d0] rounded-xl p-3 space-y-0.5">
            <span className="text-[11px] text-[#059669] font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> 30-Day Gain
            </span>
            <span className="text-lg font-black text-[#10b981] block">
              +4.2k
            </span>
          </div>

          <div className="bg-[#f8faf9] border border-gray-200 rounded-xl p-3 space-y-0.5">
            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> Upvote Rate
            </span>
            <span className="text-lg font-black text-[#111827] block">
              98.4%
            </span>
          </div>
        </div>

        {/* SVG Line Chart */}
        <div className="bg-[#f8faf9] border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
            <span>Reputation Score (Last 30 Days)</span>
            <span className="text-[#10b981] text-[11px]">+51.2% growth rate</span>
          </div>

          <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
              {/* Gradient fill */}
              <defs>
                <linearGradient id="karmaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2={width} y2="30" stroke="#eaefec" strokeDasharray="3,3" />
              <line x1="0" y1="90" x2={width} y2="90" stroke="#eaefec" strokeDasharray="3,3" />
              <line x1="0" y1="150" x2={width} y2="150" stroke="#eaefec" strokeDasharray="3,3" />

              {/* Area fill */}
              <polygon
                points={`20,${height - 30} ${polylinePoints} ${width - 20},${height - 30}`}
                fill="url(#karmaGradient)"
              />

              {/* Line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {/* Data Dots & Labels */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={getX(i)}
                    cy={getY(p.val)}
                    r="5"
                    className="fill-white stroke-[#10b981] stroke-[3]"
                  />
                  <text
                    x={getX(i)}
                    y={getY(p.val) - 10}
                    textAnchor="middle"
                    className="text-[10px] font-extrabold fill-[#111827]"
                  >
                    {(p.val / 1000).toFixed(1)}k
                  </text>
                  <text
                    x={getX(i)}
                    y={height - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-gray-400"
                  >
                    {p.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm transition-all duration-200 ease-in-out cursor-pointer active:scale-95"
          >
            Close Analytics
          </button>
        </div>

      </div>
    </div>
  );
}
