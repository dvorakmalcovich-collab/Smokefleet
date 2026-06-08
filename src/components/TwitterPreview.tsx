import { Check } from 'lucide-react';

interface TwitterPreviewProps {
  imageSrc: string; // The generated dataURL or uploaded photo
  onSaveToTwitter?: () => void;
}

export default function TwitterPreview({ imageSrc }: TwitterPreviewProps) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative" id="twitter-preview-panel">
      {/* Header Bar */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs font-mono text-slate-400 font-medium">X Profile Live Simulator</span>
        <div className="w-8" /> {/* Spacer */}
      </div>

      {/* Twitter Cover Banner */}
      <div className="h-28 bg-gradient-to-r from-emerald-600 via-teal-900 to-indigo-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-300/10 via-transparent to-transparent" />
        <div className="absolute bottom-2 right-4 text-[10px] font-mono text-indigo-200/50 uppercase tracking-widest">
          #smokefleet
        </div>
      </div>

      {/* Avatar Container with Circle Crop */}
      <div className="px-4 pb-4 relative">
        <div className="absolute -top-12 left-4">
          <div className="relative w-24 h-24 rounded-full border-4 border-slate-950 bg-slate-900 overflow-hidden shadow-lg group">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Twitter Avatar Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-500 p-2 text-center text-[10px]">
                <span>No Face</span>
                <span>Uploaded</span>
              </div>
            )}
            
            {/* Real X Circular mask overlay */}
            <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
          </div>
        </div>

        {/* Edit Button Placeholder */}
        <div className="flex justify-end pt-3">
          <button className="bg-white text-black hover:bg-slate-200 transition-colors font-sans text-xs font-semibold px-4 py-1.5 rounded-full shadow">
            Edit profile
          </button>
        </div>

        {/* User Info */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5">
            <span className="font-sans font-bold text-slate-100 text-lg leading-tight tracking-tight">
              Smokefleet Cadet
            </span>
            <div className="bg-emerald-500 text-white rounded-full p-0.5" title="Verified Cadet">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>
          <p className="text-sm font-sans text-slate-400">@smokefleet_anon</p>

          {/* User Bio */}
          <p className="mt-3 text-sm font-sans text-slate-200 leading-relaxed">
            Floating through the metaverse with the <span className="text-emerald-400">#smokefleet</span> pilot crew. 💨 3D shades aligned, offline-capable starterkit avatar.
          </p>

          {/* Metadata */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
            <span>📍 Cosmic Orbit</span>
            <span>🔗 smokefleet.xyz</span>
            <span>📅 Joined June 2026</span>
          </div>

          {/* Stats */}
          <div className="mt-3 flex gap-4 text-xs font-sans">
            <span className="text-slate-200">
              <strong className="text-white font-bold">420</strong> <span className="text-slate-400">Following</span>
            </span>
            <span className="text-slate-200">
              <strong className="text-white font-bold">8.4K</strong> <span className="text-slate-400">Followers</span>
            </span>
          </div>
        </div>
      </div>

      {/* Simulated Post Card */}
      <div className="border-t border-slate-800 p-4 bg-slate-950/50">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 overflow-hidden shrink-0">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Simulated Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-slate-800" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-bold text-slate-200">Smokefleet Cadet</span>
              <span className="text-slate-400">@smokefleet_anon</span>
              <span className="text-slate-500">· 1m</span>
            </div>
            <p className="text-sm font-sans text-slate-200 mt-1 leading-relaxed">
              Just generated my official <strong className="text-emerald-400 font-semibold">#smokefleet</strong> starter kit PFP! Built-in 3D angles, full offline PWA action. Rate my drip! 👇🛸💨
            </p>
            
            {/* Simulated Action Stats */}
            <div className="flex justify-between items-center max-w-sm text-xs text-slate-500 mt-4 font-mono">
              <div className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer transition-colors">
                <span>💬</span> <span>42</span>
              </div>
              <div className="flex items-center gap-1 hover:text-emerald-400 cursor-pointer transition-colors">
                <span>🔁</span> <span>182</span>
              </div>
              <div className="flex items-center gap-1 hover:text-pink-500 cursor-pointer transition-colors">
                <span>❤️</span> <span>4.2K</span>
              </div>
              <div className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer transition-colors">
                <span>📊</span> <span>154K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
