/* FIX: Click Debug Mode - Visual diagnostic tool for button clickability issues
 * Helps identify z-index conflicts, pointer-events blocks, and overlay issues
 * Toggle with Ctrl+Shift+D or window.toggleClickDebug()
 */

interface ClickDebugConfig {
  enabled: boolean;
  highlightClickable: boolean;
  showZIndex: boolean;
  logClicks: boolean;
  detectOverlays: boolean;
}

class ClickDebugger {
  private config: ClickDebugConfig = {
    enabled: false,
    highlightClickable: true,
    showZIndex: true,
    logClicks: true,
    detectOverlays: true,
  };

  private styleElement: HTMLStyleElement | null = null;
  private overlayElement: HTMLDivElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Expose toggle function globally for console access
      (window as any).toggleClickDebug = this.toggle.bind(this);
      
      // Keyboard shortcut: Ctrl+Shift+D
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          this.toggle();
        }
      });
    }
  }

  public toggle(): void {
    this.config.enabled = !this.config.enabled;
    
    if (this.config.enabled) {
      this.enable();
      console.log('🔍 Click Debug Mode ENABLED - Press Ctrl+Shift+D to disable');
    } else {
      this.disable();
      console.log('✅ Click Debug Mode DISABLED');
    }
  }

  private enable(): void {
    this.injectDebugStyles();
    this.attachClickListener();
    this.detectOverlayIssues();
    this.showDebugPanel();
  }

  private disable(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  /* FIX: Inject visual debug styles to highlight interactive elements */
  private injectDebugStyles(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      /* FIX: Highlight all clickable elements with colored outlines */
      [data-click-debug] button:not([disabled]),
      [data-click-debug] a,
      [data-click-debug] [role="button"],
      [data-click-debug] [onclick],
      [data-click-debug] input[type="submit"],
      [data-click-debug] input[type="button"] {
        outline: 2px dashed lime !important;
        outline-offset: 2px !important;
        position: relative !important;
      }

      /* FIX: Show disabled elements in red */
      [data-click-debug] button[disabled],
      [data-click-debug] [aria-disabled="true"] {
        outline: 2px dashed red !important;
        outline-offset: 2px !important;
      }

      /* FIX: Highlight elements with pointer-events: none in orange */
      [data-click-debug] *[style*="pointer-events: none"],
      [data-click-debug] .pointer-events-none {
        outline: 3px dashed orange !important;
        outline-offset: 2px !important;
      }

      /* FIX: Show z-index values on hover */
      [data-click-debug] button:hover::before,
      [data-click-debug] [role="button"]:hover::before {
        content: "z:" attr(data-z-index) " | " attr(data-pointer-events);
        position: absolute;
        top: -25px;
        left: 0;
        background: rgba(0, 0, 0, 0.9);
        color: lime;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-family: monospace;
        white-space: nowrap;
        z-index: 999999;
        pointer-events: none;
      }
    `;
    document.head.appendChild(this.styleElement);
    document.body.setAttribute('data-click-debug', 'true');

    // Add z-index and pointer-events data attributes
    this.annotateElements();
  }

  /* FIX: Add diagnostic data attributes to elements */
  private annotateElements(): void {
    const elements = document.querySelectorAll('button, [role="button"], a, input[type="submit"], input[type="button"]');
    elements.forEach((el) => {
      const computed = window.getComputedStyle(el as HTMLElement);
      const zIndex = computed.zIndex;
      const pointerEvents = computed.pointerEvents;
      
      (el as HTMLElement).setAttribute('data-z-index', zIndex !== 'auto' ? zIndex : '0');
      (el as HTMLElement).setAttribute('data-pointer-events', pointerEvents);
    });
  }

  /* FIX: Log all clicks with element details */
  private attachClickListener(): void {
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const computed = window.getComputedStyle(target);
      
      console.group('🖱️ Click Debug Info');
      console.log('Element:', target);
      console.log('Tag:', target.tagName);
      console.log('Classes:', target.className);
      console.log('Z-Index:', computed.zIndex);
      console.log('Pointer Events:', computed.pointerEvents);
      console.log('Position:', computed.position);
      console.log('Disabled:', (target as HTMLButtonElement).disabled);
      console.log('Coordinates:', { x: e.clientX, y: e.clientY });
      
      // Check for overlapping elements
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      if (elementsAtPoint.length > 1) {
        console.warn('⚠️ Multiple elements at click point:', elementsAtPoint);
      }
      
      console.groupEnd();
    };

    document.addEventListener('click', clickHandler, true);
  }

  /* FIX: Detect common overlay issues that block clicks */
  private detectOverlayIssues(): void {
    const issues: string[] = [];

    // Check for invisible overlays with high z-index
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      const computed = window.getComputedStyle(el as HTMLElement);
      const zIndex = parseInt(computed.zIndex);
      const pointerEvents = computed.pointerEvents;
      const opacity = parseFloat(computed.opacity);
      
      // FIX: Detect invisible blocking overlays
      if (zIndex > 100 && opacity < 0.1 && pointerEvents !== 'none') {
        issues.push(`Invisible high z-index element detected: ${el.tagName}.${(el as HTMLElement).className}`);
      }

      // FIX: Detect fixed/absolute positioned elements that might block content
      if ((computed.position === 'fixed' || computed.position === 'absolute') && 
          zIndex > 50 && 
          pointerEvents !== 'none') {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.8 || rect.height > window.innerHeight * 0.8) {
          issues.push(`Large overlay detected: ${el.tagName}.${(el as HTMLElement).className} (z-index: ${zIndex})`);
        }
      }
    });

    if (issues.length > 0) {
      console.warn('⚠️ Potential Clickability Issues Detected:');
      issues.forEach(issue => console.warn('  -', issue));
    } else {
      console.log('✅ No obvious overlay issues detected');
    }
  }

  /* FIX: Show floating debug panel with current issues */
  private showDebugPanel(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.95);
      color: lime;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 999999;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      border: 2px solid lime;
    `;
    
    this.overlayElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; color: lime;">
        🔍 CLICK DEBUG MODE ACTIVE
      </div>
      <div style="margin-bottom: 8px;">
        <span style="color: lime;">●</span> Green outline = Clickable<br>
        <span style="color: red;">●</span> Red outline = Disabled<br>
        <span style="color: orange;">●</span> Orange outline = pointer-events: none
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333; font-size: 11px;">
        <strong>Shortcuts:</strong><br>
        Ctrl+Shift+D = Toggle<br>
        Hover buttons = Show z-index
      </div>
      <button 
        onclick="window.toggleClickDebug()" 
        style="
          margin-top: 10px;
          padding: 6px 12px;
          background: #222;
          color: lime;
          border: 1px solid lime;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
          font-family: monospace;
        "
      >
        Close Debug Mode
      </button>
    `;
    
    document.body.appendChild(this.overlayElement);
  }
}

// Initialize debugger
export const clickDebugger = new ClickDebugger();

// Auto-enable in development if query param present
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') === 'clicks') {
    setTimeout(() => clickDebugger.toggle(), 100);
  }
}
