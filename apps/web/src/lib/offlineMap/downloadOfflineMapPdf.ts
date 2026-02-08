export async function downloadOfflineMapPdf(params: {
  placeId: string;
  parkName?: string;
  source: 'park_page' | 'trail_modal';
}): Promise<
  | { ok: true; filename: string; bytes: number }
  | { ok: false; reason: string; status?: number }
> {
  const { placeId, parkName, source } = params;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';

  const url = `${baseUrl}/api/v1/places/${encodeURIComponent(placeId)}/offline-map/pdf`;

  try {
    const headers: Record<string, string> = {};
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // ignore
    }

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers,
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const status = res.status;

    if (!res.ok) {
      // Try to parse JSON error from backend
      try {
        const data = await res.json();
        const msg = data?.message || data?.detail || `Request failed (${status})`;
        return { ok: false, reason: String(msg), status };
      } catch {
        return { ok: false, reason: `Request failed (${status})`, status };
      }
    }

    if (!contentType.includes('application/pdf')) {
      // Backend might have returned JSON: {available:false, reason:"no_pdf_found"}
      if (contentType.includes('application/json')) {
        try {
          const data = await res.json();
          if (data?.available === false) {
            return { ok: false, reason: 'Offline map not available for this park', status };
          }
          const msg = data?.message || data?.detail || 'Response was not a PDF';
          return { ok: false, reason: String(msg), status };
        } catch {
          return { ok: false, reason: 'Offline map not available for this park', status };
        }
      }
      return { ok: false, reason: 'Offline map not available for this park', status };
    }

    const blob = await res.blob();
    if (!blob || blob.size <= 10_000) {
      return { ok: false, reason: 'Downloaded file was too small (invalid PDF). Please retry.', status };
    }

    // Determine filename
    const cd = res.headers.get('content-disposition') || '';
    const match = cd.match(/filename="([^"]+)"/i);
    const safePark = (parkName || 'offline-map')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'offline-map';
    const filename = match?.[1] || `${safePark}-offline-map.pdf`;

    // Trigger browser download
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.dataset.source = source;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    return { ok: true, filename, bytes: blob.size };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { ok: false, reason: 'Download timed out. Retry.' };
    }
    return { ok: false, reason: e?.message || 'Download failed' };
  } finally {
    clearTimeout(timeout);
  }
}

