import { Component, AfterViewInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
    version = 'v0.2';
    private analytics = inject(AnalyticsService);
    private platformId = inject(PLATFORM_ID);

    /* ── chat demo ── */
    chatMessages: { type: 'bot' | 'user'; content: string; visible: boolean }[] = [
        {
            type: 'bot',
            content: '안녕하세요! 주식 용어나 지표에 대해 무엇이든 물어보세요.',
            visible: false,
        },
        { type: 'user', content: '골든크로스가 뭔가요?', visible: false },
        {
            type: 'bot',
            content:
                '골든크로스는 단기 이동평균선(예: 50일)이 장기 이동평균선(예: 200일)을 아래에서 위로 돌파하는 시점이에요. 상승 추세 전환의 강력한 신호로 해석됩니다! 📈',
            visible: false,
        },
    ];

    private observer!: IntersectionObserver;
    private chatAnimated = false;
    private jsonLdScript: HTMLScriptElement | null = null;

    /* ── lifecycle ── */

    ngAfterViewInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.initScrollObserver();
            this.injectJsonLd();
        }
    }

    ngOnDestroy() {
        this.observer?.disconnect();
        if (this.jsonLdScript) {
            this.jsonLdScript.remove();
            this.jsonLdScript = null;
        }
    }

    /* ── scroll-triggered reveals ── */

    private initScrollObserver() {
        this.observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.classList.add('in-view');
                    const section = entry.target.getAttribute('data-section') || entry.target.className;
                    this.analytics.capture('landing_section_viewed', { section });

                    if (entry.target.classList.contains('chat-trigger') && !this.chatAnimated) {
                        this.chatAnimated = true;
                        this.revealChat();
                    }
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
        );

        requestAnimationFrame(() => {
            document.querySelectorAll('.scroll-reveal').forEach((el) => this.observer.observe(el));
        });
    }

    /* ── JSON-LD structured data ── */

    private injectJsonLd() {
        const schemas = [
            {
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: '주린이 차트',
                alternateName: 'Junior Chart',
                url: 'https://junior-chart.vercel.app',
                description:
                    '주식 투자 초보자를 위한 차트 패턴 분석 서비스. 5년치 빅데이터 기반 패턴 매칭으로 객관적인 예측 시나리오를 제공합니다.',
                applicationCategory: 'FinanceApplication',
                operatingSystem: 'Web',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
                inLanguage: 'ko',
                featureList: [
                    'Pearson·Spearman 상관분석 기반 패턴 매칭',
                    'DTW(Dynamic Time Warping) 알고리즘',
                    'ATR 기반 변동성 정규화',
                    '68%/95% 신뢰구간 시나리오 시각화',
                    'AI 주식 용어 Q&A',
                ],
            },
            {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                    {
                        '@type': 'Question',
                        name: '주린이 차트는 무엇인가요?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: '주린이 차트는 주식 투자 초보자를 위한 무료 차트 패턴 분석 서비스입니다. 5년치 빅데이터를 활용하여 현재 차트와 유사한 과거 패턴을 찾아 객관적인 예측 시나리오를 제공합니다.',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: '주린이 차트는 무료인가요?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: '네, 주린이 차트의 모든 분석 기능은 100% 무료로 제공됩니다. 회원가입 없이도 즉시 사용할 수 있습니다.',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: '패턴 매칭 분석은 어떻게 작동하나요?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: '현재 차트의 캔들 패턴을 시계열 벡터로 변환한 뒤, Pearson·Spearman 상관분석과 DTW 알고리즘을 사용하여 5년치 데이터에서 유사한 패턴을 탐색합니다. 매칭된 패턴의 이후 흐름을 바탕으로 68%/95% 신뢰구간이 포함된 시나리오를 제시합니다.',
                        },
                    },
                ],
            },
        ];

        this.jsonLdScript = document.createElement('script');
        this.jsonLdScript.type = 'application/ld+json';
        this.jsonLdScript.textContent = JSON.stringify(schemas);
        document.head.appendChild(this.jsonLdScript);
    }

    /* ── chat message reveal ── */

    private revealChat() {
        this.chatMessages.forEach((m, i) => setTimeout(() => (m.visible = true), i * 900));
    }
}
