const axios = require('axios');
const cheerio = require('cheerio');
const RSSParser = require('rss-parser');

class NewsCrawlerService {
  constructor() {
    this.keywords = [
      'primavera software',
      'gestão empresarial',
      'software contabilidade',
      'ERP portugal',
      'transformação digital',
      'automação empresarial',
      'software gestão',
      'contabilidade digital',
      'faturação eletrónica',
      'IRS jovem',
      'regime fiscal',
      'contabilidade organizada'
    ];

    // Fontes HTML específicas (mantém as tuas)
    this.htmlSources = [
      {
        name: 'Jornal de Negócios',
        url: 'https://www.jornaldenegocios.pt',
        listSelector: '.m-article',
        titleSelector: '.m-article__title a',
        linkSelector: '.m-article__title a',
        dateSelector: '.m-article__date'
      },
      {
        name: 'Público Economia',
        url: 'https://www.publico.pt/economia',
        listSelector: '.card',
        titleSelector: '.card__title a',
        linkSelector: '.card__title a',
        dateSelector: '.card__date'
      },
      {
        name: 'Dinheiro Vivo',
        url: 'https://www.dinheirovivo.pt',
        listSelector: '.article-item',
        titleSelector: '.article-item__title a',
        linkSelector: '.article-item__title a',
        dateSelector: '.article-item__date'
      }
    ];

    // Google News RSS por palavra-chave (apanha muitos media PT)
    this.rss = new RSSParser({
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8'
      },
      timeout: 15000
    });

    this.googleNews = {
      name: 'Google News',
      buildUrl: (q) =>
        `https://news.google.com/rss/search?q=${encodeURIComponent(
          q
        )}&hl=pt-PT&gl=PT&ceid=PT:pt`
    };

    // cache simples
    this.cache = {};
  }

  // ================= PUBLIC API =================

  async crawlNews() {
    try {
      console.log('Iniciando crawl de notícias...');
      const [rssNews, htmlNews] = await Promise.all([
        this.crawlGoogleNewsForAllKeywords(),
        this.crawlAllHtmlSources()
      ]);

      const allNews = [...rssNews, ...htmlNews];

      // Filtra por keywords (accent/case-insensitive)
      const relevantNews = this.filterRelevantNews(allNews);

      // Remove duplicados por URL normalizada OU título normalizado
      const uniqueNews = this.removeDuplicates(relevantNews);

      // Ordena por data desc
      uniqueNews.sort((a, b) => new Date(b.date) - new Date(a.date));

      console.log(`Encontradas ${uniqueNews.length} notícias relevantes`);
      return uniqueNews.slice(0, 10);
    } catch (err) {
      console.error('Erro no crawl de notícias:', err);
      return [];
    }
  }

  async getCachedNews() {
    const cacheKey = 'news_cache';
    const cacheTimeout = 60 * 60 * 1000; // 1h

    const hit =
      this.cache[cacheKey] &&
      Date.now() - this.cache[cacheKey].timestamp < cacheTimeout;

    if (hit) return this.cache[cacheKey].data;

    const news = await this.crawlNews();
    this.cache[cacheKey] = { data: news, timestamp: Date.now() };
    return news;
  }

  // ================= GOOGLE NEWS (RSS) =================

  async crawlGoogleNewsForAllKeywords() {
    const perKeywordLimit = 6; // aumenta/baixa conforme quiseres
    const promises = this.keywords.map((kw) =>
      this.crawlGoogleNewsKeyword(kw, perKeywordLimit)
    );
    const settled = await Promise.allSettled(promises);
    const items = [];
    for (const s of settled) {
      if (s.status === 'fulfilled') items.push(...s.value);
    }
    return items;
  }

  async crawlGoogleNewsKeyword(keyword, limit = 6) {
    const url = this.googleNews.buildUrl(keyword);
    try {
      const feed = await this.rss.parseURL(url);
      const out = [];
      for (const item of feed.items.slice(0, limit)) {
        const title = (item.title || '').trim();
        const rawLink = (item.link || '').trim();
        const link = this.unwrapGoogleNewsLink(rawLink);
        const date = this.safeToISOString(item.pubDate);
        if (title && link) {
          out.push({
            title,
            link: this.normalizeUrl(link),
            date,
            source: this.googleNews.name
          });
        }
      }
      return out;
    } catch (err) {
      console.error(`Erro RSS Google News [${keyword}]:`, err.message);
      return [];
    }
  }

  unwrapGoogleNewsLink(link) {
    try {
      // alguns links vêm como https://news.google.com/rss/articles/... com ?url=...
      const u = new URL(link);
      const urlParam = u.searchParams.get('url');
      if (urlParam) return decodeURIComponent(urlParam);
      return link;
    } catch {
      return link;
    }
  }

  // ================= HTML SOURCES =================

  async crawlAllHtmlSources() {
    const promises = this.htmlSources.map((s) => this.crawlHtmlSource(s));
    const settled = await Promise.allSettled(promises);
    const out = [];
    for (const s of settled) {
      if (s.status === 'fulfilled') out.push(...s.value);
    }
    return out;
  }

  async crawlHtmlSource(source) {
    try {
      const html = await this.requestWithRetry(source.url);
      const $ = cheerio.load(html);
      const news = [];

      $(source.listSelector).each((_, el) => {
        try {
          const titleEl = $(el).find(source.titleSelector);
          const linkEl = $(el).find(source.linkSelector);
          const title = titleEl.text().trim();
          let link = (linkEl.attr('href') || '').trim();

          if (!title || !link) return;

          link = this.ensureAbsoluteUrl(link, source.url);
          let dateText = $(el).find(source.dateSelector).text().trim();

          // tenta time[datetime] se dateText vier vazio
          if (!dateText) {
            const timeAttr =
              $(el).find('time').attr('datetime') ||
              $('meta[property="article:published_time"]').attr('content') ||
              $('meta[name="pubdate"]').attr('content') ||
              '';
            dateText = (timeAttr || '').trim();
          }

          const dateISO = this.parseDate(dateText);

          news.push({
            title,
            link: this.normalizeUrl(link),
            date: dateISO,
            source: source.name
          });
        } catch (err) {
          console.error(`Erro a processar item de ${source.name}:`, err.message);
        }
      });

      return news;
    } catch (err) {
      console.error(`Erro ao fazer crawl de ${source.name}:`, err.message);
      return [];
    }
  }

  async requestWithRetry(url, tries = 2) {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Referer: 'https://www.google.com/'
    };

    let lastErr;
    for (let i = 0; i < tries; i++) {
      try {
        const res = await axios.get(url, { timeout: 15000, headers });
        return res.data;
      } catch (err) {
        lastErr = err;
        await this.sleep(500 + Math.random() * 750);
      }
    }
    throw lastErr;
  }

  // ================= FILTRO / DEDUP / UTILS =================

  filterRelevantNews(news) {
    const norm = (s) => this.normalizeText(s || '');
    const kws = this.keywords.map((k) => norm(k));
    return news.filter((n) => {
      const title = norm(n.title);
      return kws.some((k) => title.includes(k));
    });
  }

  removeDuplicates(news) {
    const seen = new Set();
    const seenTitle = new Set();

    const normTitle = (t) =>
      this
        .normalizeText(String(t || '').toLowerCase())
        .replace(/\s+/g, ' ')
        .trim();

    const out = [];
    for (const n of news) {
      const key = this.urlKey(n.link);
      const tkey = normTitle(n.title);
      if (key && !seen.has(key)) {
        seen.add(key);
        if (!seenTitle.has(tkey)) {
          seenTitle.add(tkey);
          out.push(n);
        }
      }
    }
    return out;
  }

  normalizeText(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  }

  urlKey(href) {
    try {
      const u = new URL(href);
      // remove params de tracking
      const banned = new Set([
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'utm_id',
        'gclid',
        'fbclid',
        'xtor',
        'feature',
        'ref'
      ]);
      for (const p of [...u.searchParams.keys()]) {
        if (banned.has(p)) u.searchParams.delete(p);
      }
      // só host+pathname+search limpo
      return `${u.hostname}${u.pathname}${u.search}`;
    } catch {
      return href;
    }
  }

  normalizeUrl(href) {
    try {
      const u = new URL(href);
      const key = this.urlKey(href);
      return `${u.protocol}//${key.startsWith(u.hostname) ? key : u.hostname + u.pathname + u.search}`;
    } catch {
      return href;
    }
  }

  ensureAbsoluteUrl(link, base) {
    try {
      if (!link) return link;
      if (link.startsWith('http://') || link.startsWith('https://')) return link;
      const b = new URL(base);
      if (link.startsWith('//')) return `${b.protocol}${link}`;
      if (link.startsWith('/')) return `${b.origin}${link}`;
      return `${b.origin}/${link.replace(/^\.\//, '')}`;
    } catch {
      return link;
    }
  }

  safeToISOString(d) {
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return new Date().toISOString();
      return dt.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  parseDate(dateString) {
    if (!dateString) return new Date().toISOString();
    const raw = dateString.trim();

    // hoje/ontem
    const lower = this.normalizeText(raw);
    const now = new Date();

    if (/\bhoje\b/.test(lower)) return now.toISOString();
    if (/\bontem\b/.test(lower)) {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }

    // "há X minutos/horas/dias"
    const rel = lower.match(/ha\s+(\d+)\s+(minutos|min|horas|hora|dias|dia)/i);
    if (rel) {
      const n = parseInt(rel[1], 10);
      const unit = rel[2];
      const d = new Date(now);
      if (/min/.test(unit)) d.setMinutes(d.getMinutes() - n);
      else if (/hora/.test(unit)) d.setHours(d.getHours() - n);
      else if (/dia/.test(unit)) d.setDate(d.getDate() - n);
      return d.toISOString();
    }

    // dd/mm/yyyy ou dd-mm-yyyy
    const dmY = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (dmY) {
      const [_, d, m, y] = dmY;
      const yyyy = y.length === 2 ? `20${y}` : y;
      const iso = new Date(`${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`);
      if (!isNaN(iso.getTime())) return iso.toISOString();
    }

    // “21 de Agosto de 2025” / “21 ago 2025”
    const months = {
      janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
      julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
      jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12
    };
    const mMatch = this.normalizeText(raw).match(
      /\b(\d{1,2})\s*(de)?\s*([a-zçãéô]+)\s*(de)?\s*(\d{4})\b/i
    );
    if (mMatch) {
      const d = parseInt(mMatch[1], 10);
      const monthName = mMatch[3];
      const y = parseInt(mMatch[5], 10);
      const m = months[monthName];
      if (m) {
        const iso = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00Z`);
        if (!isNaN(iso.getTime())) return iso.toISOString();
      }
    }

    // fallback nativo
    return this.safeToISOString(raw);
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = new NewsCrawlerService();
