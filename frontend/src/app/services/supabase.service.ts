import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);
    const url = environment.supabase.url || 'https://placeholder.supabase.co';
    const key = environment.supabase.anonKey || 'placeholder';
    this.client = createClient(url, key, {
      auth: {
        autoRefreshToken: isBrowser,
        persistSession: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    });
  }
}
