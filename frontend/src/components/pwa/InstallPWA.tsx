'use client';
import { useEffect, useState } from 'react';
import { Download, X, Share2, SmartphoneNfc } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mode, setMode]         = useState<'hidden' | 'android-auto' | 'android-manual' | 'ios'>('hidden');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as any).standalone === true) return;

    const ua = navigator.userAgent;

    // ── iOS Safari ───────────────────────────────────────────────────────────
    const isIosSafari = /iphone|ipad|ipod/i.test(ua) &&
                        /safari/i.test(ua) &&
                        !/chrome|crios|fxios/i.test(ua);
    if (isIosSafari) {
      if (!localStorage.getItem('pwa_ios_dismissed')) setMode('ios');
      return;
    }

    // ── Android / Chrome / Brave ──────────────────────────────────────────────
    const isAndroid = /android/i.test(ua);
    if (!isAndroid) return;

    // Wait for the native install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMode('android-auto');
    };
    window.addEventListener('beforeinstallprompt', handler);

    // If after 4 seconds no prompt arrived (HTTP/IP restriction), show manual guide
    const timer = setTimeout(() => {
      setMode(prev => prev === 'hidden' ? 'android-manual' : prev);
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setMode('hidden');
    setDeferredPrompt(null);
  };

  const dismiss = (key?: string) => {
    if (key) localStorage.setItem(key, '1');
    setDismissed(true);
  };

  if (dismissed || mode === 'hidden') return null;

  // ── Native Android install prompt ─────────────────────────────────────────
  if (mode === 'android-auto') return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 shadow-xl flex items-center gap-3">
      <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-none">
        <SmartphoneNfc size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">Instalar Sistema POS</p>
        <p className="text-xs text-slate-500">Agrega a tu pantalla de inicio</p>
      </div>
      <button onClick={handleInstall}
        className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 flex-none">
        <Download size={14} />Instalar
      </button>
      <button onClick={() => dismiss()} className="text-slate-400 flex-none p-1">
        <X size={18} />
      </button>
    </div>
  );

  // ── Manual Android guide (HTTP/IP restriction) ────────────────────────────
  if (mode === 'android-manual') return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white rounded-t-2xl shadow-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SmartphoneNfc size={20} className="text-primary-400" />
          <p className="font-semibold">Instalar app en Android</p>
        </div>
        <button onClick={() => dismiss()} className="text-slate-400 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>
      <div className="space-y-3 text-sm text-slate-300">
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-none mt-0.5">1</span>
          <p>Toca el menú <strong className="text-white">⋮</strong> (tres puntos) en la parte superior del navegador</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-none mt-0.5">2</span>
          <p>Selecciona <strong className="text-white">"Agregar a pantalla de inicio"</strong> o <strong className="text-white">"Instalar app"</strong></p>
        </div>
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-none mt-0.5">3</span>
          <p>Toca <strong className="text-white">Agregar</strong> para confirmar</p>
        </div>
        <div className="mt-3 p-3 bg-slate-800 rounded-xl text-xs text-slate-400">
          💡 <strong className="text-slate-300">Tip:</strong> Para el botón automático, accede vía <code className="text-primary-400">https://</code> o desde <code className="text-primary-400">localhost</code>
        </div>
      </div>
    </div>
  );

  // ── iOS Safari instructions ───────────────────────────────────────────────
  if (mode === 'ios') return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white rounded-t-2xl shadow-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SmartphoneNfc size={20} className="text-primary-400" />
          <p className="font-semibold">Instalar en iPhone / iPad</p>
        </div>
        <button onClick={() => dismiss('pwa_ios_dismissed')} className="text-slate-400 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>
      <div className="space-y-3 text-sm text-slate-300">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-none">1</span>
          <p>Toca <Share2 size={13} className="inline text-blue-400 mx-1" /> <strong className="text-white">Compartir</strong> en Safari</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-none">2</span>
          <p>Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong></p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-none">3</span>
          <p>Toca <strong className="text-white">"Añadir"</strong> para confirmar</p>
        </div>
      </div>
    </div>
  );

  return null;
}
