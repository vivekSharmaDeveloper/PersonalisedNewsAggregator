class KeyboardNavigationService {
  private focusableElements: HTMLElement[] = [];
  private currentFocusIndex = -1;
  private isNavigationActive = false;
  private shortcuts: Map<string, () => void> = new Map();
  private isBrowser = typeof window !== 'undefined';
  private initialized = false;

  constructor() {
    if (this.isBrowser) {
      this.initialize();
    }
  }

  private initialize(): void {
    if (this.initialized) return;
    this.initializeKeyboardListeners();
    this.setupDefaultShortcuts();
    this.initialized = true;
  }

  // Initialize keyboard event listeners
  private initializeKeyboardListeners(): void {
    if (!this.isBrowser) return;
    
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    
    // Update focusable elements when DOM changes
    const observer = new MutationObserver(() => {
      if (this.isNavigationActive) {
        this.updateFocusableElements();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'hidden']
    });
  }

  // Handle keyboard events
  private handleKeyDown(event: KeyboardEvent): void {
    const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
    const modifierKey = ctrlKey || metaKey;

    // Handle registered shortcuts
    const shortcutKey = this.getShortcutKey(key, modifierKey, altKey, shiftKey);
    const shortcutHandler = this.shortcuts.get(shortcutKey);
    
    if (shortcutHandler) {
      event.preventDefault();
      shortcutHandler();
      return;
    }

    // Handle navigation keys
    switch (key) {
      case 'Tab':
        if (!this.isNavigationActive) {
          this.activateKeyboardNavigation();
        }
        this.handleTabNavigation(event);
        break;
        
      case 'Escape':
        this.handleEscapeKey(event);
        break;
        
      case 'Enter':
      case ' ':
        this.handleActivationKey(event);
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (this.isNavigationActive) {
          this.handleArrowNavigation(event);
        }
        break;
        
      case 'Home':
      case 'End':
        if (this.isNavigationActive) {
          this.handleHomeEndNavigation(event);
        }
        break;
    }
  }

  // Handle focus events
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (this.isNavigationActive && this.focusableElements.includes(target)) {
      this.currentFocusIndex = this.focusableElements.indexOf(target);
      this.updateFocusIndicator(target);
    }
  }

  // Generate shortcut key string
  private getShortcutKey(key: string, ctrl: boolean, alt: boolean, shift: boolean): string {
    const modifiers = [];
    if (ctrl) modifiers.push('ctrl');
    if (alt) modifiers.push('alt');
    if (shift) modifiers.push('shift');
    return `${modifiers.join('+')}+${key.toLowerCase()}`;
  }

  // Setup default keyboard shortcuts
  private setupDefaultShortcuts(): void {
    // Font size shortcuts
    this.registerShortcut('ctrl+=', () => this.dispatchEvent('font-increase'));
    this.registerShortcut('ctrl+-', () => this.dispatchEvent('font-decrease'));
    
    // Accessibility panel
    this.registerShortcut('alt+a', () => this.dispatchEvent('accessibility-panel-toggle'));
    
    // Skip to main content
    this.registerShortcut('alt+m', () => this.skipToMainContent());
    
    // Skip to navigation
    this.registerShortcut('alt+n', () => this.skipToNavigation());
    
    // Read article shortcut
    this.registerShortcut('alt+r', () => this.dispatchEvent('read-article'));
    
    // Search shortcut
    this.registerShortcut('ctrl+k', () => this.dispatchEvent('focus-search'));
  }

  // Register a keyboard shortcut
  public registerShortcut(shortcut: string, handler: () => void): void {
    this.shortcuts.set(shortcut, handler);
  }

  // Remove a keyboard shortcut
  public removeShortcut(shortcut: string): void {
    this.shortcuts.delete(shortcut);
  }

  // Activate keyboard navigation mode
  public activateKeyboardNavigation(): void {
    if (!this.isBrowser) return;
    
    this.initialize();
    this.isNavigationActive = true;
    this.updateFocusableElements();
    document.body.classList.add('keyboard-navigation-active');
    this.dispatchEvent('keyboard-navigation-activated');
  }

  // Deactivate keyboard navigation mode
  public deactivateKeyboardNavigation(): void {
    this.isNavigationActive = false;
    this.currentFocusIndex = -1;
    if (this.isBrowser) {
      document.body.classList.remove('keyboard-navigation-active');
      this.removeFocusIndicator();
      this.dispatchEvent('keyboard-navigation-deactivated');
    }
  }

  // Update list of focusable elements
  private updateFocusableElements(): void {
    if (!this.isBrowser) return;
    
    const focusableSelector = [
      'a[href]',
      'button:not(:disabled)',
      'input:not(:disabled)',
      'select:not(:disabled)',
      'textarea:not(:disabled)',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'details summary',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]'
    ].join(', ');

    this.focusableElements = Array.from(
      document.querySelectorAll(focusableSelector)
    ).filter((element) => {
      const htmlElement = element as HTMLElement;
      return this.isElementVisible(htmlElement) && !this.isElementInert(htmlElement);
    }) as HTMLElement[];
  }

  // Check if element is visible
  private isElementVisible(element: HTMLElement): boolean {
    if (!this.isBrowser) return false;
    
    const style = getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  // Check if element is inert (disabled/readonly)
  private isElementInert(element: HTMLElement): boolean {
    return (
      element.hasAttribute('disabled') ||
      element.hasAttribute('readonly') ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.getAttribute('aria-hidden') === 'true'
    );
  }

  // Handle Tab navigation
  private handleTabNavigation(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;

    event.preventDefault();
    
    if (event.shiftKey) {
      // Backward navigation
      this.currentFocusIndex = this.currentFocusIndex <= 0 
        ? this.focusableElements.length - 1 
        : this.currentFocusIndex - 1;
    } else {
      // Forward navigation
      this.currentFocusIndex = this.currentFocusIndex >= this.focusableElements.length - 1 
        ? 0 
        : this.currentFocusIndex + 1;
    }

    this.focusElement(this.focusableElements[this.currentFocusIndex]);
  }

  // Handle arrow key navigation
  private handleArrowNavigation(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;

    event.preventDefault();
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        this.navigateToNext();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        this.navigateToPrevious();
        break;
    }
  }

  // Handle Home/End navigation
  private handleHomeEndNavigation(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;

    event.preventDefault();
    
    if (event.key === 'Home') {
      this.currentFocusIndex = 0;
    } else if (event.key === 'End') {
      this.currentFocusIndex = this.focusableElements.length - 1;
    }

    this.focusElement(this.focusableElements[this.currentFocusIndex]);
  }

  // Handle Escape key
  private handleEscapeKey(event: KeyboardEvent): void {
    // Close modals, dropdowns, etc.
    this.dispatchEvent('escape-pressed');
    
    // If in navigation mode, exit it
    if (this.isNavigationActive) {
      this.deactivateKeyboardNavigation();
    }
  }

  // Handle Enter/Space activation
  private handleActivationKey(event: KeyboardEvent): void {
    const activeElement = document.activeElement as HTMLElement;
    
    if (!activeElement) return;

    // Let buttons and links handle their own activation
    if (activeElement.tagName === 'BUTTON' || activeElement.tagName === 'A') {
      return;
    }

    // Handle custom interactive elements
    if (activeElement.hasAttribute('role')) {
      const role = activeElement.getAttribute('role');
      if (['button', 'link', 'menuitem', 'tab'].includes(role || '')) {
        event.preventDefault();
        activeElement.click();
      }
    }
  }

  // Navigate to next element
  private navigateToNext(): void {
    this.currentFocusIndex = this.currentFocusIndex >= this.focusableElements.length - 1 
      ? 0 
      : this.currentFocusIndex + 1;
    this.focusElement(this.focusableElements[this.currentFocusIndex]);
  }

  // Navigate to previous element
  private navigateToPrevious(): void {
    this.currentFocusIndex = this.currentFocusIndex <= 0 
      ? this.focusableElements.length - 1 
      : this.currentFocusIndex - 1;
    this.focusElement(this.focusableElements[this.currentFocusIndex]);
  }

  // Focus an element with enhanced visual feedback
  public focusElement(element: HTMLElement): void {
    if (!this.isBrowser || !element) return;
    
    element.focus();
    this.scrollIntoViewIfNeeded(element);
    this.updateFocusIndicator(element);
    this.announceToScreenReader(element);
  }

  // Scroll element into view if needed
  private scrollIntoViewIfNeeded(element: HTMLElement): void {
    if (!this.isBrowser) return;
    
    const rect = element.getBoundingClientRect();
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );

    if (!isVisible) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }

  // Update visual focus indicator
  private updateFocusIndicator(element: HTMLElement): void {
    if (!this.isBrowser) return;
    
    this.removeFocusIndicator();
    
    const indicator = document.createElement('div');
    indicator.className = 'keyboard-focus-indicator';
    indicator.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 3px solid #007acc;
      border-radius: 4px;
      z-index: 9999;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
      transition: all 0.15s ease;
    `;
    
    const rect = element.getBoundingClientRect();
    indicator.style.left = `${rect.left + window.scrollX - 3}px`;
    indicator.style.top = `${rect.top + window.scrollY - 3}px`;
    indicator.style.width = `${rect.width + 6}px`;
    indicator.style.height = `${rect.height + 6}px`;
    
    document.body.appendChild(indicator);
  }

  // Remove visual focus indicator
  private removeFocusIndicator(): void {
    if (!this.isBrowser) return;
    
    const existing = document.querySelector('.keyboard-focus-indicator');
    if (existing) {
      existing.remove();
    }
  }

  // Announce element to screen readers
  private announceToScreenReader(element: HTMLElement): void {
    const announcement = this.getElementAnnouncement(element);
    if (announcement) {
      this.createLiveRegionAnnouncement(announcement);
    }
  }

  // Get element announcement text
  private getElementAnnouncement(element: HTMLElement): string {
    const label = element.getAttribute('aria-label') ||
                  element.getAttribute('title') ||
                  element.textContent?.trim() ||
                  element.tagName.toLowerCase();
    
    const role = element.getAttribute('role') || this.getImplicitRole(element);
    
    return `${label}, ${role}`;
  }

  // Get implicit ARIA role
  private getImplicitRole(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const roleMap: { [key: string]: string } = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'select': 'combobox',
      'textarea': 'textbox'
    };
    
    return roleMap[tagName] || 'element';
  }

  // Create live region announcement
  private createLiveRegionAnnouncement(text: string): void {
    if (!this.isBrowser) return;
    
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    
    document.body.appendChild(liveRegion);
    
    // Delay to ensure screen reader picks up the change
    setTimeout(() => {
      liveRegion.textContent = text;
      setTimeout(() => liveRegion.remove(), 1000);
    }, 100);
  }

  // Skip to main content
  private skipToMainContent(): void {
    if (!this.isBrowser) return;
    
    const main = document.querySelector('main, [role="main"], #main-content, .main-content');
    if (main) {
      (main as HTMLElement).focus();
      this.scrollIntoViewIfNeeded(main as HTMLElement);
    }
  }

  // Skip to navigation
  private skipToNavigation(): void {
    if (!this.isBrowser) return;
    
    const nav = document.querySelector('nav, [role="navigation"], #navigation, .navigation');
    if (nav) {
      (nav as HTMLElement).focus();
      this.scrollIntoViewIfNeeded(nav as HTMLElement);
    }
  }

  // Dispatch custom events
  private dispatchEvent(eventName: string, detail?: any): void {
    if (!this.isBrowser) return;
    
    const event = new CustomEvent(`keyboard-${eventName}`, { detail });
    document.dispatchEvent(event);
  }

  // Get current navigation state
  public getNavigationState(): {
    isActive: boolean;
    currentIndex: number;
    totalElements: number;
  } {
    return {
      isActive: this.isNavigationActive,
      currentIndex: this.currentFocusIndex,
      totalElements: this.focusableElements.length
    };
  }

  // Focus specific element by selector
  public focusElementBySelector(selector: string): boolean {
    if (!this.isBrowser) return false;
    
    const element = document.querySelector(selector) as HTMLElement;
    if (element && this.isElementVisible(element)) {
      this.focusElement(element);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const keyboardNavigationService = new KeyboardNavigationService();
export default keyboardNavigationService;
