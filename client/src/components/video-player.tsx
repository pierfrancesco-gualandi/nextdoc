import React, { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  format?: string;
  title?: string;
  poster?: string;
  caption?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  format,
  title,
  poster,
  caption,
  width = '100%',
  height = 'auto',
  autoplay = false,
  controls = true,
  loop = false,
  muted = false,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Gestione degli eventi di caricamento del video
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setError('Errore nel caricamento del video');
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    // Aggiungi event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // Cleanup degli event listeners
    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Determina il tipo MIME
  const getMimeType = (src: string | undefined, format?: string): string => {
    if (format) {
      return `video/${format}`;
    }
    
    if (!src) {
      return 'video/mp4'; // Formato predefinito
    }
    
    try {
      const extension = src.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'mp4': return 'video/mp4';
        case 'webm': return 'video/webm';
        case 'ogg': return 'video/ogg';
        case 'mov': return 'video/quicktime';
        case 'avi': return 'video/x-msvideo';
        case 'wmv': return 'video/x-ms-wmv';
        case 'flv': return 'video/x-flv';
        case 'mkv': return 'video/x-matroska';
        default: return 'video/mp4'; // Formato predefinito
      }
    } catch (error) {
      console.warn('Errore nell\'analisi dell\'estensione del video', error);
      return 'video/mp4'; // Formato predefinito in caso di errore
    }
  };

  const handleCustomPlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const containerStyle: React.CSSProperties = {
    width: width,
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: caption ? '8px' : '0',
  };

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: height,
    display: 'block',
    backgroundColor: '#000',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isLoading ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
    transition: 'background-color 0.3s ease',
    cursor: 'pointer',
  };

  const titleStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'opacity 0.3s ease',
    opacity: isPlaying ? 0 : 1,
  };

  const playButtonStyle: React.CSSProperties = {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, opacity 0.3s ease',
    opacity: isPlaying ? 0 : 0.8,
    transform: isPlaying ? 'scale(0.8)' : 'scale(1)',
  };

  const captionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#555',
    textAlign: 'center',
    marginTop: '8px',
    fontStyle: 'italic',
  };

  const loadingSpinnerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTop: '4px solid white',
    animation: 'spin 1s linear infinite',
  };

  const errorStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '20px',
    textAlign: 'center',
  };

  // Define keyframes for spinning animation
  const spinKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <div>
      <style>{spinKeyframes}</style>
      <div style={containerStyle} className={className}>
        <video
          ref={videoRef}
          style={videoStyle}
          poster={poster}
          controls={controls}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          playsInline
        >
          <source src={src} type={getMimeType(src, format)} />
          Il tuo browser non supporta il tag video.
        </video>

        {!controls && (
          <div style={overlayStyle} onClick={handleCustomPlay}>
            {title && <div style={titleStyle}>{title}</div>}
            <div style={playButtonStyle}>
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div style={overlayStyle}>
            <div style={loadingSpinnerStyle}></div>
          </div>
        )}

        {error && (
          <div style={errorStyle}>
            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>Errore di caricamento</div>
            <div>{error}</div>
          </div>
        )}
      </div>
      {caption && <div style={captionStyle}>{caption}</div>}
    </div>
  );
};

export default VideoPlayer;