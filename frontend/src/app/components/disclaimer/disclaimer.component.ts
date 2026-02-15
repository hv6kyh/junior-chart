import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-disclaimer',
  standalone: true,
  template: `
    <div class="disclaimer" [class]="'disclaimer-' + type()">
      <span class="disclaimer-icon">⚠️</span>
      <span class="disclaimer-text">{{ message() }}</span>
    </div>
  `,
  styles: [`
    .disclaimer {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 8px 12px;
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .disclaimer-icon { flex-shrink: 0; font-size: 12px; }
    .disclaimer-strong-signal {
      background: rgba(234, 179, 8, 0.08);
      border-left: 2px solid rgba(234, 179, 8, 0.4);
      color: #d4a017;
      border-radius: 0 4px 4px 0;
    }
  `],
})
export class DisclaimerComponent {
  type = input<'always' | 'strong-signal'>('always');
  message = computed(() => {
    return this.type() === 'strong-signal'
      ? '모든 과거 사례가 같은 방향을 가리키지만, 과거 사례일 뿐 보장이 아닙니다.'
      : '이 분석은 과거 패턴에 기반한 참고 자료이며, 미래 수익을 보장하지 않습니다.';
  });
}
