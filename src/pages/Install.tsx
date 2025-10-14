import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Monitor, Download, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setShowIOSInstructions(isIOS);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>App Installed!</CardTitle>
            <CardDescription>
              MaintenancePro has been installed on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              You can now access MaintenancePro from your home screen or app launcher.
            </p>
            <Button className="w-full" onClick={() => window.location.href = "/"}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Install MaintenancePro</h1>
          <p className="text-lg text-muted-foreground">
            Get the full app experience on your device
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Mobile Experience</CardTitle>
              <CardDescription>
                Install on your phone or tablet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Works offline with cached data</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Home screen icon for quick access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Full-screen app experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Faster loading times</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Monitor className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Desktop Experience</CardTitle>
              <CardDescription>
                Install on your computer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Standalone app window</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Launch from Start Menu or Dock</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>No browser tabs needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Automatic updates</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {showIOSInstructions ? (
          <Alert className="mb-6">
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong className="font-semibold">iOS Installation:</strong>
              <ol className="mt-2 space-y-1 text-sm">
                <li>1. Tap the Share button <span className="inline-block px-1">⎘</span> at the bottom of Safari</li>
                <li>2. Scroll down and tap "Add to Home Screen"</li>
                <li>3. Tap "Add" in the top right corner</li>
                <li>4. MaintenancePro will appear on your home screen</li>
              </ol>
            </AlertDescription>
          </Alert>
        ) : deferredPrompt ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <Download className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ready to Install</h3>
                <p className="text-muted-foreground mb-6">
                  Click the button below to install MaintenancePro on your device
                </p>
                <Button size="lg" onClick={handleInstallClick} className="w-full md:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Install MaintenancePro
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert className="mb-6">
            <Monitor className="h-4 w-4" />
            <AlertDescription>
              <strong className="font-semibold">Chrome/Edge Installation:</strong>
              <p className="mt-2 text-sm">
                Look for the install icon <span className="inline-block px-1">⊕</span> in your browser's address bar, 
                or open the menu and select "Install MaintenancePro".
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Installation Instructions by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Android (Chrome)</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Open MaintenancePro in Chrome</li>
                  <li>Tap the menu (three dots) in the top right</li>
                  <li>Select "Install app" or "Add to Home screen"</li>
                  <li>Follow the on-screen prompts</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Windows/Mac (Chrome/Edge)</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Open MaintenancePro in Chrome or Edge</li>
                  <li>Click the install icon in the address bar</li>
                  <li>Or go to Menu → "Install MaintenancePro"</li>
                  <li>The app will be added to your applications</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;