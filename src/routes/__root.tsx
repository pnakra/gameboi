import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "gameboi" },
      { name: "description", content: "homeboi needs your hlep" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "gameboi" },
      { property: "og:description", content: "homeboi needs your hlep" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "gameboi" },
      { name: "twitter:description", content: "homeboi needs your hlep" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/879f4c80-35b0-4210-b383-e2bcd9ed944c/id-preview-44c48116--c85e2aa9-6bd3-4f20-81e6-e24c34277695.lovable.app-1777335886960.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/879f4c80-35b0-4210-b383-e2bcd9ed944c/id-preview-44c48116--c85e2aa9-6bd3-4f20-81e6-e24c34277695.lovable.app-1777335886960.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  // Pre-hydration beacon: fires from raw HTML before React/Vite bundle loads,
  // so we can compare landing_viewed vs friend_select_viewed to detect bundle
  // load failures (in-app webviews, slow networks, JS errors).
  const supabaseUrl = "https://wwhjcrdpjtmdrlonhmam.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aGpjcmRwanRtZHJsb25obWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjMzMzAsImV4cCI6MjA5Mjg5OTMzMH0.eWFprVxbg-6gwEsC2f--A0YylJ4wB9Rrj8L0X7wIwWA";
  const beacon = `(function(){try{var SK='gameboi_session_id';var sid=sessionStorage.getItem(SK);if(!sid){sid=(crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2,10));sessionStorage.setItem(SK,sid);}var u=new URL(location.href);var p=u.searchParams;var ua=navigator.userAgent||'';var rx=/(FBAN|FBAV|FB_IAB|Instagram|Twitter|TikTok|musical_ly|Bytedance|Snapchat|Line|Pinterest|RedditAndroid|Reddit\\/|Threads|LinkedInApp|GSA\\/|wv\\))/i;var props={utm_source:p.get('utm_source')||undefined,utm_medium:p.get('utm_medium')||undefined,utm_campaign:p.get('utm_campaign')||undefined,utm_content:p.get('utm_content')||undefined,utm_term:p.get('utm_term')||undefined,referrer:document.referrer||undefined,landing_path:u.pathname,landing_search:u.search||undefined,is_deep_link:!!p.get('friend'),deep_link_friend:p.get('friend')||undefined,user_agent:ua,is_in_app_browser:rx.test(ua),viewport_w:window.innerWidth,viewport_h:window.innerHeight,pre_hydration:true};fetch('${supabaseUrl}/rest/v1/analytics_events',{method:'POST',headers:{'Content-Type':'application/json','apikey':'${supabaseKey}','Authorization':'Bearer ${supabaseKey}'},body:JSON.stringify({session_id:sid,event_name:'landing_viewed',properties:props}),keepalive:true}).catch(function(){});}catch(e){}})();`;
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: beacon }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
