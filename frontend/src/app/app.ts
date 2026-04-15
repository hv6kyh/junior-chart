import { Component, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './services/analytics.service';
import { AuthService } from './services/auth.service';
import { SeoService } from './services/seo.service';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { ConsentModalComponent, CONSENT_KEY } from './components/consent-modal/consent-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AuthModalComponent, ConsentModalComponent],
  template: `
    @if (showConsent()) {
      <app-consent-modal (accepted)="onConsentAccepted()"></app-consent-modal>
    }
    <router-outlet></router-outlet>
    @if (authService.showAuthModal()) {
      <app-auth-modal></app-auth-modal>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
    `,
  ],
})
export class App {
  showConsent = signal(false);
  private platformId = inject(PLATFORM_ID);

  constructor(
    analytics: AnalyticsService,
    public authService: AuthService,
    seo: SeoService,
  ) {
    analytics.init();
    seo.init();

    if (isPlatformBrowser(this.platformId)) {
      this.showConsent.set(!localStorage.getItem(CONSENT_KEY));
    }
  }

  onConsentAccepted() {
    this.showConsent.set(false);
  }
}
