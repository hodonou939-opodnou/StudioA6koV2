
import React, { useState } from 'react';
import { Icon } from './Icon';
import { verifyPaymentScreenshot } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { WHATSAPP_SUPPORT_LINK } from '../constants';

interface PaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  onManualVerify: (code: string) => boolean;
  T: any;
  currentApiKey?: string;
  userId: string;
}

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({ isOpen, onClose, onVerified, onManualVerify, T, currentApiKey, userId }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVerifying(true);
    setError(null);
    setManualError(null);
    
    try {
        const image = await fileToBase64(file);
        // Use the base64 string directly. fileUtils returns { base64, mimeType }
        const verificationResult = await verifyPaymentScreenshot(image.base64, currentApiKey);

        if (verificationResult.valid) {
            setSuccess(true);
            setTimeout(() => {
                onVerified();
                onClose();
            }, 2000);
        } else {
            setError(T.verificationFailed);
        }

    } catch (err) {
        console.error(err);
        setError(T.verificationFailed);
    } finally {
        setIsVerifying(false);
    }
  };

  const handleCopyId = () => {
      navigator.clipboard.writeText(userId).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      });
  };

  const handleManualSubmit = () => {
      if (onManualVerify(manualCode)) {
          setSuccess(true);
          setTimeout(() => {
                onVerified();
                onClose();
          }, 2000);
      } else {
          setManualError(T.invalidCode);
      }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-brand-bg/90 backdrop-blur-md z-[60] flex items-center justify-center p-4"
      aria-modal="true" 
      role="dialog"
    >
      <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-md border border-brand-primary/20 overflow-hidden">
        <div className="p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Icon name="check" className="w-8 h-8 text-brand-primary" />
             </div>
             <h2 className="text-2xl font-bold text-brand-text">{T.verifyPayment}</h2>
             
             {success ? (
                <p className="text-green-600 font-bold text-lg animate-pulse">{T.verificationSuccess}</p>
             ) : (
                <>
                     <p className="text-brand-text-secondary">{T.paymentInstructions}</p>
                     
                     <div className="bg-brand-bg p-3 rounded-lg border border-brand-secondary/50 text-left">
                         <label className="text-xs text-brand-text-secondary uppercase font-bold block mb-1">{T.yourUserId}</label>
                         <div className="flex items-center gap-2">
                             <code className="flex-1 bg-brand-surface p-2 rounded text-xs font-mono border border-brand-secondary break-all">
                                 {userId}
                             </code>
                             <button 
                                onClick={handleCopyId}
                                className="p-2 bg-brand-secondary rounded hover:bg-brand-primary hover:text-brand-bg transition-colors"
                                title={T.copyId}
                             >
                                 {isCopied ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                             </button>
                         </div>
                     </div>
                     
                     {error && (
                        <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm text-left">
                            <p className="font-bold mb-1">{T.verificationFailed}</p>
                            <p>{T.pleaseSendId}</p>
                            <a href={WHATSAPP_SUPPORT_LINK} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-green-700 font-bold hover:underline">
                                <span className="mr-1">💬</span> {T.contactSupport}
                            </a>
                        </div>
                     )}

                     <div className="mt-4">
                        <label className={`w-full cursor-pointer bg-brand-primary text-brand-bg font-bold py-3 px-6 rounded-xl shadow-lg hover:opacity-90 flex items-center justify-center transition-all ${isVerifying ? 'opacity-50 pointer-events-none' : ''}`}>
                             {isVerifying ? (
                                <>
                                    <Icon name="spinner" className="animate-spin w-5 h-5 mr-2" />
                                    <span>{T.verifying}</span>
                                </>
                             ) : (
                                <>
                                    <Icon name="upload" className="w-5 h-5 mr-2" />
                                    <span>{T.uploadScreenshot}</span>
                                </>
                             )}
                             <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isVerifying} />
                        </label>
                     </div>

                     {/* Manual Override Section */}
                     <div className="border-t border-brand-secondary pt-4 mt-4">
                         <p className="text-xs text-brand-text-secondary mb-2">{T.manualSupportCode}</p>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder={T.enterCodePlaceholder}
                                className="flex-1 bg-brand-bg border border-brand-secondary rounded-lg px-3 py-2 text-sm"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                             />
                             <button 
                                onClick={handleManualSubmit}
                                className="bg-brand-secondary text-brand-text-secondary font-bold px-4 py-2 rounded-lg text-sm hover:bg-brand-primary hover:text-brand-bg transition-colors"
                             >
                                {T.apply}
                             </button>
                         </div>
                         {manualError && <p className="text-red-500 text-xs mt-1 text-left">{manualError}</p>}
                     </div>
                </>
             )}
        </div>
        <div className="p-4 border-t border-brand-secondary bg-brand-bg/50 text-center">
            <button onClick={onClose} className="text-brand-text-secondary hover:text-brand-text text-sm underline">
                {T.close}
            </button>
        </div>
      </div>
    </div>
  );
};
