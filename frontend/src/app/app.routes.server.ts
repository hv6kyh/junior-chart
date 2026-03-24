import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'chart',
    renderMode: RenderMode.Client,
  },
  {
    path: 'disclosure',
    renderMode: RenderMode.Client,
  },
  {
    path: 'disclosure/type/:type',
    renderMode: RenderMode.Client,
  },
  {
    path: 'disclosure/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
