import { useEffect, useMemo, useState, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { useShallow } from "zustand/shallow";
import { Globe, Loader2 } from "lucide-react";
import type { CreateBusinessThemeDto } from "@shared/dtos/business-dtos/business-theme.dto";
import logo from "@/assets/logos/logo.png";
import type { IFileUpload } from "@shared/interfaces/file-upload.interface";
import type { TFormHandlerStore } from "@/stores";
import { buildSentence } from "@/locales/translations";
import { useI18n } from "@/hooks/use-i18n";
import { FONT_OPTIONS } from "@/config/fonts.config";

interface ICustomizationPreviewProps {
  store?: TFormHandlerStore<CreateBusinessThemeDto, any, { activeTab?: 'light' | 'dark' }>;
}

export function CustomizationPreview({ store }: ICustomizationPreviewProps) {
  const { watch } = useFormContext<CreateBusinessThemeDto>();
  const { t } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Get active tab from store extra
  const activeTab = store 
    ? store(useShallow((state) => state.extra?.activeTab)) || 'light'
    : 'light';

  // Watch form values for live preview
  const formValues = watch();

  
  const logoLight = formValues.logoLight as IFileUpload | File | null;
  const logoDark = formValues.logoDark as IFileUpload | File | null;
  const favicon = formValues.favicon as IFileUpload | File | null;
  const primaryColorLight = formValues.primaryColorLight || formValues.primaryColorDark || '#3b82f6';
  const primaryColorDark = formValues.primaryColorDark || formValues.primaryColorLight || '#60a5fa';
  const fontFamily = formValues.fontFamily || 'Inter';
  // Get fontUrl from form or find it from FONT_OPTIONS if not set - memoized
  const fontUrl = useMemo(() => {
    if (formValues.fontUrl) return formValues.fontUrl;
    if (!fontFamily || fontFamily === 'Inter') return '';
    const fontOption = FONT_OPTIONS.find(f => f.family === fontFamily);
    return fontOption?.url || '';
  }, [formValues.fontUrl, fontFamily]);
  const title = formValues.title || 'Template';

  // Use activeTab to determine main content theme (sidebar is always dark)
  const isDark = activeTab === 'dark';
  
  // Memoized logo URLs to prevent infinite loops
  const logoLightUrl = useMemo(() => {
    if (!logoLight) return null;
    if (logoLight instanceof File) {
  
      
      // Create new blob URL and store it
      const blobUrl = URL.createObjectURL(logoLight);
      return blobUrl;
    }
    return (logoLight as IFileUpload)?.url || null;
  }, [logoLight]);

  const logoDarkUrl = useMemo(() => {
    if (!logoDark) return null;
    if (logoDark instanceof File) {
     
      
      // Create new blob URL and store it
      const blobUrl = URL.createObjectURL(logoDark);
      return blobUrl;
    }
    return (logoDark as IFileUpload)?.url || null;
  }, [logoDark]);

  const faviconUrlMemo = useMemo(() => {
    if (!favicon) return '/favicon.ico';
    if (favicon instanceof File) {
    
      // Create new blob URL and store it
      const blobUrl = URL.createObjectURL(favicon);
      return blobUrl;
    }
    return (favicon as IFileUpload)?.url || '/favicon.ico';
  }, [favicon]);


  // For sidebar, always use dark logo - memoized to prevent infinite loops
  const sidebarLogo = useMemo(() => {
    return (isDark ? logoDarkUrl || logoLightUrl : logoLightUrl || logoDarkUrl) || logo;
  }, [logoDarkUrl, logoLightUrl, isDark, logo]);
  
  const faviconUrl = faviconUrlMemo;

  const primaryColor = isDark ? primaryColorDark : primaryColorLight;

  // Generate HTML content for iframe
  const iframeContent = useMemo(() => {
    // Ensure font is properly loaded in iframe
    const fontLink = fontUrl ? `<link rel="stylesheet" href="${fontUrl}" />` : '';
    const fontFamilyValue = fontFamily && fontFamily !== 'Inter' ? `'${fontFamily}', sans-serif` : 'Inter, sans-serif';
    
    return `<!DOCTYPE html>
<html lang="en" class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${fontLink}
  <style>
    :root {
      --primary: ${primaryColor};
      --background: ${isDark ? 'oklch(0.14 0 285.86)' : 'oklch(0.9846 0.0017 247.84)'};
      --foreground: ${isDark ? 'oklch(0.99 0 0)' : 'oklch(0.14 0 285.86)'};
      --card: ${isDark ? 'oklch(0.21 0.01 285.93)' : 'oklch(1 0 0)'};
      --card-foreground: ${isDark ? 'oklch(0.99 0 0)' : 'oklch(0.14 0 285.86)'};
      --muted: ${isDark ? 'oklch(0.27 0.01 286.1)' : 'oklch(0.97 0 0)'};
      --muted-foreground: ${isDark ? 'oklch(0.71 0.01 286.09)' : 'oklch(0.55 0.02 285.93)'};
      --border: ${isDark ? 'oklch(1 0 0 / 10%)' : 'oklch(1 0 0)'};
      --input: ${isDark ? 'oklch(1 0 0 / 15%)' : 'oklch(0.92 0 286.61)'};
      --sidebar: oklch(0.21 0.01 285.93);
      --sidebar-foreground: oklch(0.99 0 0);
      --sidebar-accent: oklch(0.27 0.01 286.1);
      --sidebar-accent-foreground: oklch(0.99 0 0);
      --sidebar-border: oklch(1 0 0 / 10%);
    }
    
    * {
      font-family: ${fontFamilyValue} !important;
    }
    
    body {
      font-family: ${fontFamilyValue};
      margin: 0;
      padding: 0;
      background: var(--background);
      color: var(--foreground);
    }
    
    .sidebar {
      background-color: var(--sidebar);
      color: var(--sidebar-foreground);
      border-color: var(--sidebar-border);
    }
    
    .btn-primary {
      background-color: var(--primary);
      color: #ffffff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    
    .btn-primary:hover {
      opacity: 0.9;
    }
    
    
    .nav-item-active {
      background-color: var(--sidebar-accent);
      color: var(--sidebar-accent-foreground);
      font-weight: 500;
    }
    
    .nav-item {
      color: var(--sidebar-foreground);
      transition: background-color 0.2s, color 0.2s;
    }
    
    .nav-item:hover {
      background-color: var(--sidebar-accent);
      color: var(--sidebar-accent-foreground);
    }
  </style>
</head>
<body>
  <div style="display: flex; height: 100vh; font-family: ${fontFamilyValue};">
    <!-- Sidebar - Always Dark -->
    <div class="sidebar" style="width: 10rem; border-right: 1px solid var(--sidebar-border); padding: 1rem; display: flex; flex-direction: column;">
      <!-- Sidebar Header -->
      <div style="margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
          <img src="${sidebarLogo}" alt="Logo" style="height: 2rem; width: 2rem; object-fit: contain;" onerror="this.src='${logo}'" crossOrigin="anonymous" />
          <span style="font-size: 1.125rem; font-weight: 500; color: var(--sidebar-foreground); text-transform: uppercase;">${title}</span>
        </div>
      </div>

      <!-- Sidebar Navigation -->
      <nav style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; overflow-y: auto;">
        <!-- Home Group -->
        <div style="margin-bottom: 0.5rem;">
          <div style="padding: 0.5rem 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground);">Home</div>
          <div class="nav-item-active" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border-radius: 0.75rem; cursor: pointer;">
            <svg style="height: 1rem; width: 1rem; color: var(--sidebar-accent-foreground);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span style="font-size: 0.875rem; font-weight: 600; color: oklab(0.99 0 0 / 0.8);">Dashboard</span>
          </div>
        </div>
        
        <!-- Schedule Group -->
        <div style="margin-bottom: 0.5rem;">
          <div style="padding: 0.5rem 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground);">Schedule</div>
          <div class="nav-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border-radius: 0.75rem; cursor: pointer;">
            <svg style="height: 1rem; width: 1rem; color: oklab(0.99 0 0 / 0.8);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span style="font-size: 0.875rem; font-weight: 600; color: oklab(0.99 0 0 / 0.8);">Sessions</span>
          </div>
        </div>
        
        
        <!-- My Settings Group -->
        <div style="margin-bottom: 0.5rem;">
          <div style="padding: 0.5rem 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground);">My Settings</div>
          <div class="nav-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border-radius: 0.75rem; cursor: pointer;">
            <svg style="height: 1rem; width: 1rem; color: oklab(0.99 0 0 / 0.8);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span style="font-size: 0.875rem; font-weight: 600; color: oklab(0.99 0 0 / 0.8);">Settings</span>
          </div>
        </div>
      </nav>
    </div>

    <!-- Main Content Preview -->
    <div style="flex: 1; padding: 1.5rem; overflow: auto; background-color: var(--background); color: var(--foreground);">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
        <h2 style="font-size: 1.25rem; font-weight: 600; color: var(--foreground);">Dashboard</h2>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn-primary">Primary Button</button>
        </div>
      </div>

      <!-- Dashboard Cards -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
        <div style="padding: 1rem; border-radius: 0.375rem; border: 1px solid var(--border); background-color: var(--card);">
          <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--muted-foreground);">Total Members</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">1,234</div>
        </div>
        
        <div style="padding: 1rem; border-radius: 0.375rem; border: 1px solid var(--border); background-color: var(--card);">
          <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--muted-foreground);">Revenue</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">$12,345</div>
        </div>
      </div>

      <!-- Sample Table -->
      <div>
        <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--foreground);">Recent Activity</h3>
        <div style="border: 1px solid var(--border); border-radius: 0.375rem; overflow: hidden; background-color: var(--card);">
          <table style="width: 100%;">
            <thead>
              <tr style="background-color: var(--muted);">
                <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; font-weight: 500; color: var(--foreground);">Name</th>
                <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; font-weight: 500; color: var(--foreground);">Email</th>
                <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; font-weight: 500; color: var(--foreground);">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-top: 1px solid var(--border);">
                <td style="padding: 0.75rem; font-size: 0.875rem; color: var(--foreground);">John Doe 1</td>
                <td style="padding: 0.75rem; font-size: 0.875rem; color: var(--muted-foreground);">john1@example.com</td>
                <td style="padding: 0.75rem;">
                  <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500; background-color: ${primaryColor}20; color: ${primaryColor};">Active</span>
                </td>
              </tr>
              <tr style="border-top: 1px solid var(--border);">
                <td style="padding: 0.75rem; font-size: 0.875rem; color: var(--foreground);">John Doe 2</td>
                <td style="padding: 0.75rem; font-size: 0.875rem; color: var(--muted-foreground);">john2@example.com</td>
                <td style="padding: 0.75rem;">
                  <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500; background-color: ${primaryColor}20; color: ${primaryColor};">Active</span>
                </td>
              </tr>
              <tr style="border-top: 1px solid var(--border);">
                <td style="padding: 0.75rem; font-size: 0.875rem; color: var(--foreground);">John Doe 3</td>
                <td style="padding: 0.75rem; font-size: 0.875rem; color: var(--muted-foreground);">john3@example.com</td>
                <td style="padding: 0.75rem;">
                  <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500; background-color: ${primaryColor}20; color: ${primaryColor};">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }, [
    isDark,
    primaryColor,
    fontFamily,
    fontUrl,
    title,
    sidebarLogo,
    logo,
    logoLightUrl,
    logoDarkUrl,
  ]);

  // Watch for changes and update iframe with debounce
  useEffect(() => {
    // Clear previous timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Set loading state
    setIsLoading(true);

    // Debounce iframe update to avoid flickering - increased delay for smoother updates
    updateTimeoutRef.current = setTimeout(() => {
      if (iframeRef.current) {
        const iframe = iframeRef.current;
        
        // Set iframe content
        iframe.srcdoc = iframeContent;
        
        // Wait for iframe to load
        iframe.onload = () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              if (fontUrl) {
                // Check if font link already exists in iframe (it should be in the HTML)
                const existingLink = iframeDoc.querySelector(`link[href="${fontUrl}"]`) as HTMLLinkElement;
                if (existingLink) {
                  // Wait for the font to load if it hasn't already
                  if (existingLink.sheet) {
                    // Font stylesheet is already loaded
                    setIsLoading(false);
                  } else {
                    // Wait for font to load
                    existingLink.onload = () => setIsLoading(false);
                    existingLink.onerror = () => setIsLoading(false);
                    // Fallback timeout
                    setTimeout(() => setIsLoading(false), 2000);
                  }
                } else {
                  // Font link not found, add it manually
                  const fontLink = iframeDoc.createElement('link');
                  fontLink.rel = 'stylesheet';
                  fontLink.href = fontUrl;
                  
                  fontLink.onload = () => setIsLoading(false);
                  fontLink.onerror = () => setIsLoading(false);
                  
                  iframeDoc.head.appendChild(fontLink);
                  // Fallback timeout
                  setTimeout(() => setIsLoading(false), 2000);
                }
              } else {
                // No font URL
                setIsLoading(false);
              }
            } else {
              setIsLoading(false);
            }
          } catch (error) {
            // If we can't access iframe document (cross-origin), just hide loading
            setIsLoading(false);
          }
        };
        
        // Fallback: if onload doesn't fire, hide loading after a delay
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      }
    }, 600); // 600ms debounce - increased delay for smoother preview updates

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [iframeContent, fontUrl]);

  return (
    <div className="h-full flex flex-col">
      {/* Browser-like header */}
      <div className="flex items-center gap-2 bg-muted/50 border-b rounded-t-lg p-2">
        <div className="flex items-center gap-2 bg-background rounded-full px-3 py-1 text-sm border">
          <img 
            src={faviconUrl} 
            alt="Favicon" 
            className="h-4 w-4 object-contain" 
            
            crossOrigin="anonymous"
          />
          <span className="text-muted-foreground">{title}</span>
        </div>
        <div className="flex-1 text-center text-sm text-muted-foreground">
          <Globe className="h-4 w-4 inline-block mr-1" />
          {window.location.hostname}
        </div>
      </div>

      {/* Preview Content in iframe */}
      <div className="flex-1 overflow-hidden border rounded-b-lg bg-background relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{buildSentence(t, "loading", "preview")}</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          title="Theme Preview"
          className="w-full h-[100vh] border-0"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
