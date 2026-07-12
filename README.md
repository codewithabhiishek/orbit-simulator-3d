import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Car, Gauge, AlertTriangle, Activity, Loader2, Camera } from 'lucide-react';
import { LiveCameraFeed } from './LiveCameraFeed';
import { ErrorBoundary } from './ErrorBoundary';
import { DashboardSkeleton } from './Skeleton';
import type { TelemetryData } from '../hooks/useLiveTelemetry';
import type { DashboardContext } from './AppShell';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store';
import { API_BASE } from '../utils/api';
import type { Video } from '../types';

interface DashboardTabProps {
  data: TelemetryData | null;
  history: TelemetryData[];
  isConnected: boolean;
  context: DashboardContext;
  setContext: (ctx: DashboardContext) => void;
}

export function DashboardTab({ data, history, context }: DashboardTabProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const token = useAuthStore(state => state.token);

  const handleScreenshot = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl || videoEl.readyState < 2) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw current video frame to canvas
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      // Draw timestamp overlay if present
      const timestampText = `T+ ${videoEl.currentTime.toFixed(3)}s`;
      ctx.font = '16px "JetBrains Mono", monospace';
      
      const textMetrics = ctx.measureText(timestampText);
      const textWidth = textMetrics.width;
      const textHeight = 16;
      
      const paddingX = 12;
      const paddingY = 8;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = textHeight + paddingY * 2;
      
      const posX = 16;
      const posY = 16;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(posX, posY, boxWidth, boxHeight);
      
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(posX, posY, boxWidth, boxHeight);
      
      ctx.fillStyle = '#00ff00';
      ctx.textBaseline = 'top';
      ctx.fillText(timestampText, posX + paddingX, posY + paddingY);

      // Generate filename: traffic-analysis_YYYY-MM-DD_HH-MM-SS.png
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const filename = `traffic-analysis_${dateStr}_${timeStr}.png`;

      // Download
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setToast('✓ Screenshot saved as PNG');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
    }
  }, []);

  const downloadJSON = useCallback(() => {
    if (!video || !video.vehicle_stats_json) return;
    const blob = new Blob([video.vehicle_stats_json as string], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-stats_${video.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [video]);

  const downloadCSV = useCallback(() => {
    if (!video || !video.vehicle_stats_json) return;
    try {
      const stats = JSON.parse(video.vehicle_stats_json as string);
      const csvContent = "Metric,Value\n" + Object.entries(stats).map(([k, v]) => `${k},${v}`).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traffic-stats_${video.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  }, [video]);

  const congestionBg   = { 
    LOW: 'bg-background border-success text-success', 
    MEDIUM: 'bg-background border-warning text-warning', 
    HIGH: 'bg-background border-danger text-danger' 
  };

  useEffect(() => {
    if (context.type !== 'video') {
      setVideo(null);
      return;
    }

    let isSubscribed = true;
    const fetchVideo = async () => {
      try {
        const res = await fetch(`${API_BASE}/videos/${context.videoId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && isSubscribed) {
          const data = await res.json();
          setVideo(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchVideo();
    // Poll to keep checking status while waiting or processing
    const interval = setInterval(fetchVideo, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [context, token]);

  const handleScreenshotRef = useRef(handleScreenshot);
  useEffect(() => {
    handleScreenshotRef.current = handleScreenshot;
  }, [handleScreenshot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.hasAttribute('contenteditable') ||
          activeEl.getAttribute('contenteditable') === 'true' ||
          (activeEl as HTMLElement).isContentEditable
        )
      ) {
        return;
      }

      const videoEl = videoRef.current;
      if (!videoEl) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (videoEl.paused) {
            videoEl.play();
          } else {
            videoEl.pause();
          }
          break;
        case 'f':
          e.preventDefault();
          if (!document.fullscreenElement) {
            videoEl.requestFullscreen?.().catch(err => console.error(err));
          } else {
            document.exitFullscreen?.().catch(err => console.error(err));
          }
          break;
        case 'm':
          e.preventDefault();
          videoEl.muted = !videoEl.muted;
          break;
        case 's':
          e.preventDefault();
          handleScreenshotRef.current();
          break;
        case 'arrowleft':
          e.preventDefault();
          videoEl.currentTime = Math.max(0, videoEl.currentTime - 5);
          break;
        case 'arrowright':
          e.preventDefault();
          videoEl.currentTime = Math.min(videoEl.duration, videoEl.currentTime + 5);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getPipelineStage = (status: string, progress: number) => {
    if (status === 'WAITING') return 'Queued';
    if (status === 'FAILED') return 'Failed';
    if (status === 'COMPLETED') return 'Completed';
    if (progress <= 10) return 'Initializing';
    if (progress <= 35) return 'Detecting';
    if (progress <= 55) return 'Tracking';
    if (progress <= 70) return 'Speed Estimation';
    if (progress <= 85) return 'Violation Detection';
    return 'Analytics';
  };

  const getETA = (createdAt: string, progress: number) => {
    if (progress <= 0 || progress >= 100) return 'Calculating...';
    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
    const totalEst = elapsed / (progress / 100);
    const remaining = Math.max(0, totalEst - elapsed);
    if (remaining < 60) return `~${Math.round(remaining)}s`;
    const m = Math.floor(remaining / 60);
    const s = Math.round(remaining % 60);
    return `~${m}m ${s}s`;
  };

  const renderProgressBar = (percent: number) => {
    const totalBlocks = 15;
    const filledBlocks = Math.round((percent / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  };

  if (context.type === 'video' && video && video.processing_status !== 'COMPLETED') {
    const stage = getPipelineStage(video.processing_status, video.processing_progress);
    const eta = getETA(video.created_at, video.processing_progress);
    const progress = video.processing_progress;
    return (
      <div className="min-h-[65vh] bg-background border border-secondary flex flex-col items-center justify-center font-mono p-8 text-center space-y-6 animate-fade-in">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <div className="space-y-2">
          <h3 className="text-xl font-bold uppercase tracking-widest text-primary crt-text-glow">Analysis in progress...</h3>
          <p className="text-zinc-500 uppercase tracking-wider text-xs">
            Analyzing: {video.original_filename}
          </p>
        </div>
        
        <div className="max-w-md w-full border border-secondary bg-[#070d07] p-6 space-y-4 text-left">
          <div className="flex justify-between text-xs font-bold text-primary uppercase">
            <span>Stage: {stage}</span>
            <span>{progress}%</span>
          </div>
          <div className="text-sm font-bold text-primary tracking-tighter">
            {renderProgressBar(progress)}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
            <span>Time Remaining: {eta}</span>
            <span>Status: {video.processing_status}</span>
          </div>
        </div>
      </div>
    );
  }

  let parsedStats: Record<string, any> = {};
  if (video?.vehicle_stats_json) {
    try {
      parsedStats = JSON.parse(video.vehicle_stats_json as string);
    } catch {}
  }

  const avgSpeedVal = history.length > 0
    ? (history.reduce((sum, item) => sum + item.average_speed, 0) / history.length).toFixed(1)
    : (data?.average_speed || 0).toFixed(1);

  const maxSpeedVal = parsedStats.max_speed ? parsedStats.max_speed.toFixed(1) : '0.0';
  const minSpeedVal = parsedStats.min_speed ? parsedStats.min_speed.toFixed(1) : '0.0';
  const uniqueTracksVal = parsedStats.unique_tracks || video?.vehicle_count || 0;
  const avgConfVal = parsedStats.average_confidence ? parsedStats.average_confidence.toFixed(2) : '0.00';

  const inferenceFps = parsedStats.inference_fps 
    ? parsedStats.inference_fps.toFixed(2) 
    : (video && video.processing_time_seconds && video.processing_time_seconds > 0
      ? (video.total_frames / video.processing_time_seconds).toFixed(2)
      : 'N/A');

  if (context.type === 'live') {
    return (
      <div className="min-h-[65vh] bg-background border border-secondary flex flex-col items-center justify-center font-mono p-8 text-center">
        <Activity className="w-16 h-16 text-zinc-700 mb-6 animate-pulse" />
        <h3 className="text-xl font-bold uppercase tracking-widest text-secondary mb-2 text-yellow-500">No completed analysis selected</h3>
        <p className="text-zinc-500 max-w-md uppercase tracking-wider text-xs leading-relaxed">
          Upload a video or wait for processing to finish.
        </p>
      </div>
    );
  }

  if (!data && context.type === 'video') {
    // Show skeleton while waiting for first telemetry frame of the video
    return <DashboardSkeleton />;
  }

  const isCompleted = video?.processing_status === 'COMPLETED';

  const currentTelemetry = isCompleted && history.length > 0 && video?.duration_seconds
    ? history[Math.min(history.length - 1, Math.floor((currentTime / video.duration_seconds) * history.length))]
    : data;

  const displaySpeed = !currentTelemetry || isNaN(currentTelemetry.average_speed) ? '0.0' : currentTelemetry.average_speed.toFixed(1);
  const vehicleCount = currentTelemetry ? currentTelemetry.vehicle_count : 0;
  const congestionLevel = currentTelemetry ? currentTelemetry.congestion_level : 'LOW';
  const streamUrl = context.type === 'video' ? `${API_BASE}/video/stream?token=${token}&camera_id=${context.videoId}` : undefined;
  const feedTitle = context.type === 'video' 
    ? `ANALYZING: ${video?.original_filename || 'Video'} ${!isCompleted ? `(${video?.processing_progress || 0}%)` : '(COMPLETED)'}` 
    : 'LIVE TELEMETRY FEED';

  return (
    <>
      <div className="flex justify-end mb-4 font-mono">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 uppercase tracking-widest">Source:</span>
          <span className="px-3 py-1 border border-primary text-primary">
            {context.type === 'video' ? 'UPLOADED VIDEO' : 'LIVE CAMERA'}
          </span>
        </div>
      </div>

      <ErrorBoundary>
        {isCompleted && video ? (
          <div className="mb-8">
            <div className="bg-surface border border-[#1a2e1a] overflow-hidden relative">
              <div className="px-6 py-3.5 border-b border-[#1a2e1a] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold tracking-widest text-primary uppercase crt-text-glow">{feedTitle}</span>
                </div>
                <button 
                  onClick={handleScreenshot}
                  className="px-3 py-1 border border-primary text-primary hover:bg-primary hover:text-background transition-colors text-[10px] uppercase tracking-wider font-mono flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Capture Screenshot
                </button>
              </div>
              <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
                <div className="absolute top-4 left-4 bg-black/80 border border-primary/30 px-3 py-1.5 text-xs text-primary font-mono pointer-events-none z-10 crt-text-glow">
                  T+ {currentTime.toFixed(3)}s
                </div>
                <video 
                  ref={videoRef}
                  crossOrigin="anonymous"
                  src={`${API_BASE}/processed/${video.processed_video_path || video.stored_filename.replace(/\.[^/.]+$/, "") + ".mp4"}?token=${token}`}
                  controls
                  autoPlay
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
            
            <div className="bg-[#0a110a] border border-[#1a2e1a] border-t-0 px-6 py-3 flex flex-wrap items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 uppercase">Speed:</span>
                  <select 
                    onChange={(e) => {
                      if (videoRef.current) videoRef.current.playbackRate = parseFloat(e.target.value);
                    }}
                    defaultValue="1"
                    className="bg-black border border-[#1a2e1a] text-primary px-2 py-1 outline-none focus:border-primary"
                  >
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1">1.0x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - (1/30)); } }} 
                    className="px-2 py-1 border border-[#1a2e1a] hover:border-primary text-primary transition-colors uppercase"
                  >
                    -1 Frame
                  </button>
                  <button 
                    onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + (1/30)); } }} 
                    className="px-2 py-1 border border-[#1a2e1a] hover:border-primary text-primary transition-colors uppercase"
                  >
                    +1 Frame
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-4 sm:mt-0">
                <span className="text-zinc-500 uppercase">Export:</span>
                <a 
                  href={`${API_BASE}/processed/${video.processed_video_path || video.stored_filename.replace(/\.[^/.]+$/, "") + ".mp4"}?token=${token}`}
                  download={`traffic-analysis_${video.id}.mp4`}
                  className="px-3 py-1 border border-[#1a2e1a] hover:border-primary text-primary transition-colors uppercase"
                >
                  Video
                </a>
                <button 
                  onClick={downloadCSV}
                  className="px-3 py-1 border border-[#1a2e1a] hover:border-primary text-primary transition-colors uppercase"
                >
                  CSV
                </button>
                <button 
                  onClick={downloadJSON}
                  className="px-3 py-1 border border-[#1a2e1a] hover:border-primary text-primary transition-colors uppercase"
                >
                  JSON
                </button>
              </div>
            </div>

            {/* Analysis Summary Panel */}
            <div className="mt-6 border border-[#1a2e1a] bg-[#070d07] p-6 font-mono">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 border-b border-[#1a2e1a] pb-2 crt-text-glow">
                Analysis Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block">Total / Unique Tracks</span>
                  <span className="text-primary font-bold text-lg mt-1 block">{video.vehicle_count} / {uniqueTracksVal}</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block">Speeds (Min/Avg/Max)</span>
                  <span className="text-primary font-bold text-lg mt-1 block">{minSpeedVal} / {avgSpeedVal} / {maxSpeedVal} <span className="text-xs text-primary/70">km/h</span></span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block">Average Confidence</span>
                  <span className="text-primary font-bold text-lg mt-1 block">{avgConfVal}</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block">Violations</span>
                  <span className="text-danger font-bold text-lg mt-1 block">{video.violation_count}</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block">Duration</span>
                  <span className="text-primary font-bold text-lg mt-1 block">{video.duration_seconds?.toFixed(1) || '0.0'} s</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block">Frames Processed</span>
                  <span className="text-primary font-bold text-lg mt-1 block">{video.total_frames || '0'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block">Inference FPS</span>
                  <span className="text-primary font-bold text-lg mt-1 block">{inferenceFps}</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block">Processing Time</span>
                  <span className="text-primary font-bold text-lg mt-1 block">{video.processing_time_seconds ? `${Math.round(video.processing_time_seconds)} s` : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <LiveCameraFeed key={streamUrl || 'default-live'} title={feedTitle} streamUrl={streamUrl} />
        )}
      </ErrorBoundary>

      {/* Success Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-background border border-primary text-primary px-4 py-2 text-xs uppercase tracking-widest font-mono shadow-[4px_4px_0px_0px_rgba(0,255,0,0.3)] animate-fade-in">
          {toast}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 font-mono">
        <div className="bg-background border border-secondary p-6 flex items-center gap-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(0,255,0,0.15)] hover:-translate-y-[2px]">
          <div className="p-3 border border-secondary"><Car className="w-6 h-6 text-primary" /></div>
          <div>
            <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">ACTIVE VEHICLES</p>
            <p className="text-3xl font-bold font-mono mt-1 text-primary">{vehicleCount}</p>
          </div>
        </div>
        <div className="bg-background border border-secondary p-6 flex items-center gap-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(0,255,0,0.15)] hover:-translate-y-[2px]">
          <div className="p-3 border border-secondary"><Gauge className="w-6 h-6 text-primary" /></div>
          <div>
            <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">AVERAGE SPEED</p>
            <p className="text-3xl font-bold font-mono mt-1 text-primary">
              {displaySpeed} <span className="text-xs text-zinc-500 font-normal font-mono tracking-widest">KM/H</span>
            </p>
          </div>
        </div>
        <div className={`border p-6 flex items-center gap-4 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,255,0,0.15)] hover:-translate-y-[2px] ${congestionBg[congestionLevel]}`}>
          <div className="p-3 border"><AlertTriangle className={`w-6 h-6`} /></div>
          <div>
            <p className="opacity-70 text-xs font-bold tracking-widest uppercase">CONGESTION LEVEL</p>
            <p className={`text-3xl font-bold mt-1 tracking-widest uppercase`}>{congestionLevel}</p>
          </div>
        </div>
      </div>
      <div className="bg-background border border-secondary p-6 h-[400px] flex flex-col font-mono">
        <h2 className="text-sm font-bold text-primary flex items-center gap-2 mb-6 uppercase tracking-widest">
          <Activity className="w-4 h-4 text-primary" /> Live Traffic Density (Last 60s)
        </h2>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111111" vertical={false} />
              <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })} stroke="#FFFFFF" fontSize={10} tickLine={false} axisLine={false} className="font-mono" />
              <YAxis stroke="#FFFFFF" fontSize={10} tickLine={false} axisLine={false} domain={[0, 'auto']} className="font-mono" />
              <Tooltip contentStyle={{ backgroundColor: '#000000', borderColor: '#00ff00', borderRadius: '0px', color: '#00FF00', fontFamily: 'monospace', fontSize: '11px' }} labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
              <Line type="stepAfter" dataKey="vehicle_count" stroke="#00FF00" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#00FF00', stroke: '#000000', strokeWidth: 1.5 }} animationDuration={0} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
