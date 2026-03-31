'use client';
import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showAndroid, setShowAndroid] = useState(false);
    const [showIOS, setShowIOS] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Detect iOS
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIOS) {
            const dismissed = localStorage.getItem('pwa_ios_dismissed');
            if (!dismissed) setShowIOS(true);
            return;
        }

        // Android/Chrome
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowAndroid(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowAndroid(false);
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
    };

    const dismissIOS = () => {
        localStorage.setItem('pwa_ios_dismissed', '1');
        setShowIOS(false);
    };

    if (isInstalled || dismissed) return null;

    // Android install banner
    if (showAndroid) return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 shadow-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-none">
                <span className="text-white font-bold text-lg">P</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">Instalar POS SaaS</p>
                <p className="text-xs text-slate-500">Agrega a tu pantalla de inicio</p>
            </div>
            <button onClick={handleInstall}
                className="btn-primary text-sm px-4 py-2 flex-none">
                <Download size={14} className="inline mr-1" />
                Instalar
            </button>
            <button onClick={() => setShowAndroid(false)} className="text-slate-400 flex-none">
                <X size={18} />
            </button>
        </div>
    );

    // iOS install instructions
    if (showIOS) return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900 text-white shadow-xl rounded-t-2xl">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center font-bold flex-none">P</div>
                    <p className="font-semibold">Instalar POS SaaS</p>
                </div>
                <button onClick={dismissIOS} className="text-slate-400"><X size={18} /></button>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold flex-none">1</span>
                    <p>Toca el botón <Share size={14} className="inline text-blue-400" /> <strong className="text-white">Compartir</strong> en Safari</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold flex-none">2</span>
                    <p>Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong></p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold flex-none">3</span>
                    <p>Toca <strong className="text-white">"Añadir"</strong> para confirmar</p>
                </div>
            </div>
        </div>
    );

    return null;
}