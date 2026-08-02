import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (isInStandaloneMode) return;
    if (sessionStorage.getItem("installDismissed")) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Show iOS prompt after delay
    if (isIOS) setTimeout(() => setShow(true), 3000);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("installDismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-foreground text-background rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-fade-in">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 text-white font-bold text-sm">
        NS
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">Add NaijaStays to your home screen</p>
        <p className="text-xs opacity-70 mt-0.5">
          {isIOS
            ? 'Tap the share button below then "Add to Home Screen"'
            : "Get the full app experience — faster and offline-ready"}
        </p>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-2 flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full"
          >
            <Download size={12} /> Install App
          </button>
        )}
      </div>
      <button onClick={handleDismiss} className="opacity-50 hover:opacity-100 shrink-0 mt-0.5">
        <X size={16} />
      </button>
    </div>
  );
}