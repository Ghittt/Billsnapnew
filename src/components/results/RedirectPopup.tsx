import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, Search, Clock } from 'lucide-react';

interface RedirectPopupProps {
    isOpen: boolean;
    provider: string;
    offerName: string;
    providerUrl: string;
    onClose: () => void;
}

const RedirectPopup: React.FC<RedirectPopupProps> = ({
    isOpen,
    provider,
    offerName,
    providerUrl,
    onClose
}) => {
    const [countdown, setCountdown] = useState(10);
    const hasRedirected = useRef(false);
    const linkRef = useRef<HTMLAnchorElement>(null);

    // Reset state when popup opens
    useEffect(() => {
        if (isOpen) {
            setCountdown(10);
            hasRedirected.current = false;
        }
    }, [isOpen]);

    // Handle countdown timer
    useEffect(() => {
        if (!isOpen || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, countdown]);

    // Trigger redirect when countdown hits 0 - ALWAYS new tab via link click
    useEffect(() => {
        if (isOpen && countdown === 0 && !hasRedirected.current && providerUrl) {
            hasRedirected.current = true;
            // Click the hidden link to open in new tab (most reliable)
            if (linkRef.current) {
                linkRef.current.click();
            }
            setTimeout(onClose, 300);
        }
    }, [countdown, isOpen, providerUrl, onClose]);

    const handleGoNow = () => {
        if (!hasRedirected.current && providerUrl) {
            hasRedirected.current = true;
            // Click the hidden link to open in new tab
            if (linkRef.current) {
                linkRef.current.click();
            }
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {/* Hidden anchor for reliable new tab redirect */}
            <a
                ref={linkRef}
                href={providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden"
                aria-hidden="true"
            >
                Redirect
            </a>

            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Stai per essere reindirizzato</h3>
                        <p className="text-sm text-gray-500">verso {provider}</p>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <Search className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-purple-900 mb-1">Come procedere:</p>
                            <ol className="text-sm text-purple-800 space-y-1">
                                <li>1. Cerca l'offerta "<strong><span className="truncate inline-block align-bottom max-w-[200px]">{offerName}</span></strong>"</li>
                                <li>2. Verifica i dettagli e le condizioni</li>
                                <li>3. Procedi con l'attivazione online</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Offer reminder */}
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4">
                    <p className="text-sm text-green-800 truncate">
                        💡 <strong>Ricorda:</strong> L'offerta che hai scelto è "{offerName}" di {provider}
                    </p>
                </div>

                {/* Countdown */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                            {countdown > 0
                                ? `Reindirizzamento in ${countdown} secondi...`
                                : 'Apertura in corso...'
                            }
                        </span>
                    </div>
                    <button
                        onClick={handleGoNow}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Vai ora →
                    </button>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-purple-600 transition-all duration-1000 ease-linear"
                        style={{ width: `${(countdown / 10) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default RedirectPopup;
