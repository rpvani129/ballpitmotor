"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
        theme: "auto";
      }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export default function TurnstileField({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      callback: (token) => { if (tokenRef.current) tokenRef.current.value = token; },
      "expired-callback": () => { if (tokenRef.current) tokenRef.current.value = ""; },
      "error-callback": () => { if (tokenRef.current) tokenRef.current.value = ""; },
    });
  }, [siteKey]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [renderWidget]);

  return <div className="span-2 signup-verification">
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={renderWidget} />
    <input ref={tokenRef} type="hidden" name="cf-turnstile-response" />
    <div ref={containerRef} />
    <small>Verification protects account confirmation email delivery from automated abuse.</small>
  </div>;
}
