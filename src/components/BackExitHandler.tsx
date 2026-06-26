import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter, useCanGoBack } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function BackExitHandler() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [exitOpen, setExitOpen] = useState(false);
  const canGoBackRef = useRef(canGoBack);
  const exitOpenRef = useRef(exitOpen);

  useEffect(() => {
    canGoBackRef.current = canGoBack;
  }, [canGoBack]);

  useEffect(() => {
    exitOpenRef.current = exitOpen;
  }, [exitOpen]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: { remove: () => Promise<void> } | undefined;

    void App.addListener("backButton", () => {
      if (exitOpenRef.current) {
        setExitOpen(false);
        return;
      }
      if (canGoBackRef.current) {
        router.history.back();
        return;
      }
      setExitOpen(true);
    }).then((handle) => {
      listener = handle;
    });

    return () => {
      void listener?.remove();
    };
  }, [router]);

  if (!Capacitor.isNativePlatform()) return null;

  return (
    <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit HERMS?</AlertDialogTitle>
          <AlertDialogDescription>
            Do you want to exit the app?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, stay</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void App.exitApp();
            }}
          >
            Yes, exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
