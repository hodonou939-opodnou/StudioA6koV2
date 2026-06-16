import React, { useState } from 'react';
import type { Asset } from '../types';
import { Icon } from './Icon';
import { LoadingSpinner } from './LoadingSpinner';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface VariantCardProps {
  asset: Asset;
  T: any;
  onAnimate?: (asset: Asset) => void;
  onRegenerate?: (asset: Asset) => void;
  onReset?: (asset: Asset) => void;
  onFeedback: (assetId: string, feedback: 'like' | 'dislike') => void;
  onEdit?: (asset: Asset, prompt: string) => Promise<void>;
}

const MetadataRow: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div className="group">
    <h4 className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.2em] mb-1.5 group-hover:text-brand-primary transition-colors">{label}</h4>
    <div className="text-sm">{children}</div>
  </div>
);

export const VariantCard: React.FC<VariantCardProps> = ({ asset, T, onAnimate, onRegenerate, onReset, onFeedback, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(asset.metadata.prompt);
  
  // Editing state
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editRequestPrompt, setEditRequestPrompt] = useState('');
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Mobile Download & Share Help Assist Dialog elements
  const [isDownloadAssistOpen, setIsDownloadAssistOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState('');
  const [downloadAssistUrl, setDownloadAssistUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isShareAssistOpen, setIsShareAssistOpen] = useState(false);
  const [activeShareChannel, setActiveShareChannel] = useState<'instagram' | 'tiktok' | 'facebook' | 'whatsapp' | null>(null);

  // Persist a learning signal to the server (fire-and-forget; never blocks UX).
  // Tied to the exact generation via metadata.generationId set by /api/gemini.
  const sendFeedback = (action: 'RATE' | 'DOWNLOAD' | 'SHARE' | 'REGENERATE' | 'EDIT', extra: Record<string, unknown> = {}) => {
    const generationId = asset.metadata?.generationId;
    if (!generationId) return; // assets created before this feature have no id
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generationId, assetRef: asset.id, action, ...extra }),
    }).catch(() => {});
  };

  // Free-tier creations the user downloads are featured (anonymously) in the
  // public community gallery for social proof. Server enforces free-only.
  const publishToGallery = () => {
    const generationId = asset.metadata?.generationId;
    const b64 = asset.base64 || (asset.url?.startsWith('data:') ? asset.url : '');
    if (!generationId || !b64 || asset.type !== 'image') return;
    fetch('/api/gallery/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generationId, base64: b64 }),
    }).catch(() => {});
  };

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isFRlang = T.language === 'fr' || T.directorId === 'ID Directeur';

  // Fetch the asset bytes once as a File + object URL (reused by download & share).
  const buildFile = async (): Promise<{ file: File; objectUrl: string } | null> => {
    const isImage = asset.type === 'image';
    const fetchUrl = asset.url.startsWith('data:')
      ? asset.url
      : asset.base64 ? `data:image/png;base64,${asset.base64}` : asset.url;
    const resp = await fetch(fetchUrl);
    const blob = await resp.blob();
    const name = `Studio_a6ko_${asset.id || Date.now()}.${isImage ? 'png' : 'mp4'}`;
    const file = new File([blob], name, { type: blob.type || (isImage ? 'image/png' : 'video/mp4') });
    return { file, objectUrl: URL.createObjectURL(blob) };
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadSuccess('');
    const successText = isFRlang ? "Téléchargé avec succès !" : "Downloaded successfully!";
    try {
      const built = await buildFile();
      if (!built) throw new Error('no-asset');
      const { file, objectUrl } = built;

      // Mobile: the system share sheet exposes "Save Image"/save-to-Photos — the only
      // reliable way to save on iOS Safari (the <a download> attribute is ignored there).
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          sendFeedback('DOWNLOAD'); publishToGallery();
          URL.revokeObjectURL(objectUrl);
          setIsDownloading(false);
          return;
        } catch {
          /* user dismissed → fall through to open/anchor */
        }
      }

      if (isMobile) {
        // Open full-size in a new tab so the user can long-press → Save Image.
        window.open(objectUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setDownloadSuccess(successText);
      setTimeout(() => setDownloadSuccess(''), 4000);
      sendFeedback('DOWNLOAD');
      publishToGallery();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch (e) {
      console.error("Download failed:", e);
      try {
        window.open(asset.url, '_blank');
        setDownloadSuccess(successText);
        setTimeout(() => setDownloadSuccess(''), 4000);
      } catch {}
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLike = () => {
    sendFeedback('RATE', { rating: asset.feedback === 'like' ? 0 : 1 });
    onFeedback(asset.id, 'like');
  };
  const handleDislike = () => {
    sendFeedback('RATE', { rating: asset.feedback === 'dislike' ? 0 : -1 });
    onFeedback(asset.id, 'dislike');
  };
  
  const submitEdit = async () => {
      if (!onEdit || !editRequestPrompt.trim()) return;
      setIsProcessingEdit(true);
      try {
          await onEdit(asset, editRequestPrompt);
          setIsEditingMode(false);
          setEditRequestPrompt('');
      } catch (e) {
          console.error(e);
          alert('Failed to edit image');
      } finally {
          setIsProcessingEdit(false);
      }
  };

  // Short, engaging default share message + the canonical link.
  const shareMessage = isFRlang
    ? "Regarde ma création réalisée avec Studio A6ko ✨ https://studio.a6ko.com"
    : "Check out what I made with Studio A6ko ✨ https://studio.a6ko.com";
  const shareLink = "https://studio.a6ko.com";

  const handleShare = async () => {
    sendFeedback('SHARE');
    // Mobile: open the system share sheet directly with the real image + message.
    // It lists every installed app (Instagram, TikTok, WhatsApp…) and shares the
    // actual picture — the natural path, no extra instructions needed.
    if (isMobile && navigator.share) {
      try {
        const built = await buildFile();
        if (built && navigator.canShare && navigator.canShare({ files: [built.file] })) {
          await navigator.share({ title: 'Studio A6ko', text: shareMessage, files: [built.file] });
          URL.revokeObjectURL(built.objectUrl);
          return;
        }
        await navigator.share({ title: 'Studio A6ko', text: shareMessage, url: shareLink });
        return;
      } catch {
        /* dismissed/unsupported → fall back to the on-screen buttons */
      }
    }
    setIsShareAssistOpen(true);
    setActiveShareChannel(null);
  };

  const executeNativeShareSheet = async () => {
    try {
      const built = await buildFile();
      if (built && navigator.canShare && navigator.canShare({ files: [built.file] })) {
        await navigator.share({ title: 'Studio A6ko', text: shareMessage, files: [built.file] });
        URL.revokeObjectURL(built.objectUrl);
        return;
      }
      if (navigator.share) await navigator.share({ title: 'Studio A6ko', text: shareMessage, url: shareLink });
    } catch (err) {
      console.warn("Native share failed", err);
    }
  };

  const getAspectRatioClass = () => {
    switch (asset.metadata.aspectRatio) {
      case '1:1': return 'aspect-square';
      case '16:9': return 'aspect-video';
      case '4:5': return 'aspect-[4/5]';
      case '5:4': return 'aspect-[5/4]';
      case '3:4': return 'aspect-[3/4]';
      case '4:3': return 'aspect-[4/3]';
      case '9:16':
      default: return 'aspect-[9/16]';
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-brand-text/5 overflow-hidden group transition-all duration-700 ease-out hover:shadow-brand-primary/10 hover:-translate-y-2 border border-white">
      <div 
        className={`relative ${getAspectRatioClass()} bg-brand-bg overflow-hidden`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {asset.type === 'image' ? (
          <img src={asset.url} alt={asset.metadata.prompt} className="w-full h-full object-cover transition-transform duration-1000 ease-in-out group-hover:scale-110" />
        ) : (
          <video src={asset.url} loop muted autoPlay playsInline className="w-full h-full object-cover transition-transform duration-1000 ease-in-out group-hover:scale-110" />
        )}
        
        {asset.type === 'video' && isHovered && !asset.isAnimating && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[2px] transition-all duration-500">
            <div className="bg-white/30 backdrop-blur-xl p-5 rounded-full border border-white/50 shadow-2xl scale-110">
                <Icon name="play" className="w-10 h-10 text-white fill-current" />
            </div>
          </div>
        )}

         {(asset.isAnimating || isProcessingEdit) && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center transition-opacity z-20">
                <LoadingSpinner />
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-brand-primary animate-pulse">{isProcessingEdit ? T.editing : T.animating}</p>
            </div>
        )}
      </div>

      <div className="p-7 space-y-6">
        {isEditingMode ? (
             <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                 <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">{T.editImage}</h4>
                 <textarea
                    rows={4}
                    value={editRequestPrompt}
                    onChange={(e) => setEditRequestPrompt(e.target.value)}
                    placeholder={T.describeChanges}
                    className="w-full bg-brand-bg/50 border border-brand-primary/20 text-sm text-brand-text rounded-2xl shadow-inner p-4 focus:ring-4 focus:ring-brand-primary/5 outline-none resize-none transition-all"
                    autoFocus
                 />
                 <div className="flex gap-3">
                      <button
                        onClick={submitEdit}
                        disabled={isProcessingEdit || !editRequestPrompt.trim()}
                        className="flex-1 bg-brand-primary text-white font-black uppercase tracking-widest py-4 rounded-2xl text-[11px] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-brand-primary/20"
                      >
                        {T.applyEdit}
                      </button>
                      <button
                        onClick={() => setIsEditingMode(false)}
                        disabled={isProcessingEdit}
                        className="flex-1 bg-brand-bg text-brand-text/60 font-black uppercase tracking-widest py-4 rounded-2xl text-[11px] hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-all active:scale-95"
                      >
                        {T.cancel}
                      </button>
                 </div>
             </div>
        ) : (
            <>
                <MetadataRow label={T.prompt}>
                   <textarea
                    rows={2}
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    aria-label="Technical prompt"
                    className="w-full bg-transparent border-b border-brand-secondary/30 text-[11px] font-medium text-brand-text/60 py-2 focus:border-brand-primary focus:text-brand-text focus:outline-none transition-all resize-none leading-relaxed"
                   />
                </MetadataRow>

                {asset.metadata.marketingCopy && (
                  <MetadataRow label={T.marketingCopy}>
                    <div className="w-full bg-brand-bg/50 border border-brand-secondary/30 text-[11px] font-medium text-brand-text/80 p-3 rounded-xl leading-relaxed whitespace-pre-wrap markdown-body">
                      <Markdown>{asset.metadata.marketingCopy}</Markdown>
                    </div>
                  </MetadataRow>
                )}

                <div className="flex items-center justify-between">
                    {/* Color palette removed */}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        onClick={handleDownload}
                        disabled={asset.isAnimating || isDownloading}
                        className="col-span-1 bg-brand-bg/80 text-brand-text font-black uppercase tracking-widest py-3.5 px-3 rounded-2xl hover:bg-brand-text hover:text-white transition-all duration-300 flex items-center justify-center disabled:opacity-50 text-[10px] active:scale-95 shadow-sm"
                    >
                        {isDownloading ? (
                            <Icon name="spinner" className="w-4 h-4 mr-2 animate-spin"/>
                        ) : (
                            <Icon name="download" className="w-4 h-4 mr-2"/>
                        )}
                        {asset.type === 'image' ? '4K PNG' : '4K MP4'}
                    </button>

                    <button
                        onClick={handleShare}
                        disabled={asset.isAnimating}
                        className="col-span-1 bg-brand-primary/10 text-brand-primary font-black uppercase tracking-widest py-3.5 px-3 rounded-2xl hover:bg-brand-primary hover:text-white transition-all duration-300 flex items-center justify-center disabled:opacity-50 text-[10px] active:scale-95 shadow-sm cursor-pointer"
                    >
                        <Icon name="share-2" className="w-4 h-4 mr-2"/>
                        {T.language === 'fr' ? 'Partager' : 'Share'}
                    </button>

                     {asset.type === 'image' && onEdit && (
                         <button
                            onClick={() => setIsEditingMode(true)}
                            disabled={asset.isAnimating}
                            className="col-span-2 bg-brand-bg/80 text-brand-text font-black uppercase tracking-widest py-3.5 px-3 rounded-2xl hover:bg-brand-primary hover:text-white transition-all duration-300 flex items-center justify-center disabled:opacity-50 text-[10px] active:scale-95 shadow-sm"
                         >
                             <Icon name="wand" className="w-4 h-4 mr-2"/>
                             {T.editImage}
                         </button>
                     )}
                     
                    {asset.type === 'image' && onAnimate && (
                            <button
                            onClick={() => onAnimate(asset)}
                            disabled={asset.isAnimating}
                            className="col-span-2 bg-gradient-to-br from-brand-text to-gray-700 text-white font-black uppercase tracking-[0.2em] py-4 px-4 rounded-2xl hover:shadow-2xl shadow-brand-text/20 transition-all duration-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-[11px] active:scale-[0.98]"
                        >
                            <Icon name="film" className="w-4 h-4 mr-2.5"/>
                            {T.animate}
                        </button>
                    )}

                    {asset.type === 'video' && onRegenerate && onReset && (
                        <>
                        <button
                            onClick={() => onRegenerate(asset)}
                            disabled={asset.isAnimating}
                            title={T.regenerate}
                            className="col-span-1 bg-brand-bg/80 text-brand-text/60 font-black py-3.5 rounded-2xl hover:bg-brand-primary hover:text-white transition-all active:scale-95"
                        >
                            <Icon name="reload" className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                            onClick={() => onReset(asset)}
                            disabled={asset.isAnimating}
                            title={T.resetToImage}
                            className="col-span-1 bg-brand-bg/80 text-brand-text/60 font-black py-3.5 rounded-2xl hover:bg-brand-primary hover:text-white transition-all active:scale-95"
                        >
                            <Icon name="image" className="w-4 h-4 mx-auto" />
                        </button>
                        </>
                    )}
                </div>
            </>
        )}
        
        <div className="border-t border-brand-secondary/30 pt-5 flex justify-between items-center">
            <span className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.2em]">{T.satisfaction}</span>
            <div className="flex gap-3">
                <button
                onClick={handleLike}
                disabled={asset.isAnimating}
                className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 ${
                    asset.feedback === 'like'
                    ? 'bg-green-100 text-green-600 shadow-inner'
                    : 'bg-brand-bg text-brand-text/30 hover:bg-green-50 hover:text-green-500'
                }`}
                >
                <Icon name="thumb-up" className="w-4 h-4" />
                </button>
                <button
                onClick={handleDislike}
                disabled={asset.isAnimating}
                className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 ${
                    asset.feedback === 'dislike'
                    ? 'bg-red-100 text-red-600 shadow-inner'
                    : 'bg-brand-bg text-brand-text/30 hover:bg-red-50 hover:text-red-500'
                }`}
                >
                <Icon name="thumb-down" className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
            {/* Download Success Notification Toast */}
      <AnimatePresence>
        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 bg-green-500/95 backdrop-blur text-white font-extrabold text-xs uppercase tracking-wider px-6 py-4 rounded-2xl shadow-xl flex items-center gap-2.5 min-w-[280px] justify-center"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>✅ {downloadSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Scale Social Media Redirection and Assist Overlay */}
      <AnimatePresence>
        {isShareAssistOpen && (
          <div className="fixed inset-0 bg-brand-text/95 backdrop-blur-md z-55 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[2.5rem] max-w-sm w-full p-6 text-center space-y-5 shadow-2xl relative border border-brand-secondary/30 select-none overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-2 border-b border-brand-secondary/15">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
                  {T.language === 'fr' ? 'Assistant de Partage' : 'Sharing Hub'}
                </span>
                <button 
                  onClick={() => {
                    setIsShareAssistOpen(false);
                    setActiveShareChannel(null);
                    setCopiedLink(false);
                  }}
                  className="w-8 h-8 rounded-full bg-brand-bg hover:bg-brand-primary/10 text-brand-text/50 hover:text-brand-primary transition-all flex items-center justify-center cursor-pointer"
                >
                  <Icon name="close" className="w-4 h-4" />
                </button>
              </div>

              {activeShareChannel === null ? (
                <>
                  <div className="text-left space-y-1">
                    <p className="text-xs font-black text-brand-text uppercase tracking-wider">
                      {T.language === 'fr' ? "🚀 Partager sur les réseaux" : "🚀 Choose Platform"}
                    </p>
                    <p className="text-[10px] font-medium text-brand-text-secondary leading-relaxed">
                      {T.language === 'fr' ? "Sélectionnez une application pour ouvrir directement votre création." : "Select an app to post your high-res design natively."}
                    </p>
                  </div>

                  {/* Core Social Buttons Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* WhatsApp */}
                    <button
                      onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank')}
                      className="aspect-square bg-green-500 hover:bg-green-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md shadow-green-500/10 cursor-pointer text-[9px] font-black uppercase tracking-wider py-2"
                    >
                      <svg className="w-5 h-5 fill-current mb-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.371a9.936 9.936 0 0 0 4.777 1.22c5.507 0 9.99-4.478 9.99-9.985C22.001 6.478 17.518 2 12.012 2zm6.136 14.156c-.252.712-1.461 1.304-2.01 1.402-.497.09-1.15.163-3.32-.737-2.774-1.15-4.568-3.974-4.707-4.159-.138-.184-1.12-1.49-1.119-2.842.001-1.352.708-2.015.96-2.277.251-.262.55-.328.733-.328.184 0 .368.002.527.01.163.007.382-.062.598.459.222.535.759 1.854.825 1.986.066.13.111.285.022.46-.089.175-.133.284-.265.438-.133.153-.277.34-.397.459-.133.13-.273.272-.118.537.155.263.684 1.127 1.465 1.821.996.883 1.836 1.157 2.094 1.288.258.13.407.11.558-.06.151-.175.648-.755.823-1.01.175-.251.349-.208.59-.12.24.088 1.524.718 1.786.85.263.13.438.196.505.31.066.11.066.652-.187 1.365z"/>
                      </svg>
                      WA
                    </button>

                    {/* Facebook */}
                    <button
                      onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`, '_blank')}
                      className="aspect-square bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md shadow-blue-600/10 cursor-pointer text-[9px] font-black uppercase tracking-wider py-2"
                    >
                      <svg className="w-5 h-5 fill-current mb-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
                      </svg>
                      FB
                    </button>

                    {/* X (Twitter) */}
                    <button
                      onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`, '_blank')}
                      className="aspect-square bg-black hover:bg-neutral-800 text-white rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer text-[9px] font-black uppercase tracking-wider py-2"
                    >
                      <svg className="w-5 h-5 fill-current mb-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X
                    </button>
                  </div>

                  {/* Copy link or native share sheet options */}
                  <div className="space-y-3 pt-2">
                    {navigator.share && (
                      <button
                        onClick={executeNativeShareSheet}
                        className="w-full bg-brand-primary h-12 text-white font-black uppercase tracking-widest rounded-2xl text-[10px] hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-brand-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Icon name="share-2" className="w-4 h-4" />
                        {T.language === 'fr' ? 'Partager via le Système 📲' : 'Open Native Share Panel 📲'}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const shareUrl = shareLink;
                        navigator.clipboard.writeText(shareUrl).then(() => {
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        });
                      }}
                      className="w-full bg-brand-bg h-12 text-brand-text font-black uppercase tracking-widest rounded-2xl text-[10px] hover:bg-brand-secondary/20 active:scale-[0.98] transition-all border border-brand-secondary/35 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Icon name={copiedLink ? "check" : "copy"} className="w-4 h-4" />
                      {copiedLink ? (T.language === 'fr' ? 'Copié !' : 'Copied!') : (T.language === 'fr' ? 'Copier le lien' : 'Copy Shareable Link')}
                    </button>
                  </div>
                </>
              ) : (
                /* Detail Instructions view for specific channel */
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-brand-secondary/15 pb-2">
                    <span className="flex items-center gap-1.5 font-black text-xs uppercase tracking-widest text-brand-primary">
                      {activeShareChannel === 'instagram' ? '📸 Instagram' : '🎵 TikTok'}
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        setActiveShareChannel(null);
                        setCopiedLink(false);
                      }}
                      className="text-[9px] uppercase font-bold text-brand-text/50 hover:text-brand-text px-2 py-1 bg-brand-bg/55 rounded-lg border border-brand-secondary/10 cursor-pointer"
                    >
                      ← {T.language === 'fr' ? 'Retour' : 'Back'}
                    </button>
                  </div>

                  <div className="text-[11px] leading-relaxed text-brand-text-secondary bg-brand-bg/60 p-4 rounded-2xl border border-brand-secondary/25 space-y-2 font-medium">
                    {activeShareChannel === 'instagram' ? (
                      T.language === 'fr' ? (
                        <>
                          <p>1. <span className="font-extrabold text-brand-text">Téléchargez</span> votre modèle d'image d'abord.</p>
                          <p>2. Ouvrez <span className="font-extrabold text-brand-text">Instagram</span> pour l'importer en Story ou publication !</p>
                          <p>3. Identifiez <span className="font-extrabold text-brand-primary">@studio.a6ko</span> pour qu'on vous repartage ! ✨</p>
                        </>
                      ) : (
                        <>
                          <p>1. <span className="font-extrabold text-brand-text">Download</span> your 4K representation first.</p>
                          <p>2. Open <span className="font-extrabold text-brand-text">Instagram</span> and import it as a Post or Story!</p>
                          <p>3. Tag us <span className="font-extrabold text-brand-primary">@studio.a6ko</span> to get featured on our brand page! ✨</p>
                        </>
                      )
                    ) : (
                      T.language === 'fr' ? (
                        <>
                          <p>1. <span className="font-extrabold text-brand-text">Téléchargez</span> votre rendu depuis la galerie.</p>
                          <p>2. Ouvrez <span className="font-extrabold text-brand-text">TikTok</span> pour créer un diaporama ou une vidéo tendance ! 🚀</p>
                        </>
                      ) : (
                        <>
                          <p>1. <span className="font-extrabold text-brand-text">Download</span> your designer creation to your device.</p>
                          <p>2. Open <span className="font-extrabold text-brand-text">TikTok</span> and upload it with your soundtrack! 🚀</p>
                        </>
                      )
                    )}
                  </div>

                  {/* Direct Native App Redirection triggers */}
                  <button 
                    onClick={() => {
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      if (isMobile) {
                        if (activeShareChannel === 'instagram') {
                          window.location.href = "instagram://app";
                          setTimeout(() => {
                            window.open("https://instagram.com", '_blank');
                          }, 800);
                        } else {
                          window.location.href = "tiktok://";
                          setTimeout(() => {
                            window.open("https://tiktok.com", '_blank');
                          }, 800);
                        }
                      } else {
                        window.open(activeShareChannel === 'instagram' ? "https://instagram.com" : "https://tiktok.com", '_blank');
                      }
                      setIsShareAssistOpen(false);
                    }}
                    className="w-full text-center bg-brand-primary text-white text-[10px] font-black uppercase tracking-wider py-3.5 rounded-2xl block transition-all shadow hover:opacity-90 active:scale-[0.98] cursor-pointer"
                  >
                    {activeShareChannel === 'instagram' 
                      ? (T.language === 'fr' ? 'Ouvrir Instagram Nativement 📸' : 'Open Instagram App 📸')
                      : (T.language === 'fr' ? 'Ouvrir TikTok Nativement 🎵' : 'Open TikTok App 🎵')}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsShareAssistOpen(false);
                  setActiveShareChannel(null);
                  setCopiedLink(false);
                }}
                className="w-full bg-brand-bg/55 hover:bg-neutral-100 text-brand-text/60 font-black uppercase tracking-widest py-3.5 rounded-xl text-[10px] transition-all cursor-pointer border border-brand-secondary/20"
              >
                {T.language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};