import { Component, output, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AnalyticsService } from '../../services/analytics.service';

export const CONSENT_KEY = 'jc_disclaimer_accepted';

@Component({
  selector: 'app-consent-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consent-modal.component.html',
  styleUrls: ['./consent-modal.component.css'],
})
export class ConsentModalComponent {
  accepted = output<void>();

  private analytics = inject(AnalyticsService);
  private platformId = inject(PLATFORM_ID);

  onAccept() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(CONSENT_KEY, '1');
    }
    this.analytics.capture('disclaimer_accepted');
    this.accepted.emit();
  }
}
