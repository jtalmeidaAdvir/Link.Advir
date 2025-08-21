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
      'contabilidade organizada',
      'cegid',
      'cegid primavera',
      'cegid portugal',
      'erp'
    ];

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

    // RSS com headers PT
    this.rss = new RSSParser({
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8'
      },
      timeout: 15000,
      // Tentar apanhar campos media
      customFields: {
        item: [
          ['media:content', 'media:content', { keepArray: true }],
          ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
          ['content:encoded', 'contentEncoded']
        ]
      }
    });

    this.googleNews = {
      name: 'Google News',
      buildUrl: (q) =>
        `https://news.google.com/rss/search?q=${encodeURIComponent(
          q
        )}&hl=pt-PT&gl=PT&ceid=PT:pt`
    };

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

      let allNews = [...rssNews, ...htmlNews];

      // Filtra por keywords (accent/case-insensitive)
      allNews = this.filterRelevantNews(allNews);

      // Enriquecer artigos que não tenham descrição ou imagem (limite para performance)
      allNews = await this.enrichArticles(allNews, 14); // tenta enriquecer os 14 primeiros em falta

      // Dedup e ordenar
      const uniqueNews = this.removeDuplicates(allNews);
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
    const perKeywordLimit = 6;
    const promises = this.keywords.map((kw) =>
      this.crawlGoogleNewsKeyword(kw, perKeywordLimit)
    );
    const settled = await Promise.allSettled(promises);
    const items = [];
    for (const s of settled) if (s.status === 'fulfilled') items.push(...s.value);
    return items;
  }

  async crawlGoogleNewsKeyword(keyword, limit = 6) {
    const url = this.googleNews.buildUrl(keyword);
    try {
      const feed = await this.rss.parseURL(url);
      const out = [];
      for (const item of (feed.items || []).slice(0, limit)) {
        const title = (item.title || '').trim();
        const rawLink = (item.link || '').trim();
        const link = this.unwrapGoogleNewsLink(rawLink);
        const date = this.safeToISOString(item.pubDate);
        // descrição preferindo contentSnippet/description
        const description = this.prettySnippet(
          item.contentSnippet ||
            item.summary ||
            item.content ||
            item.contentEncoded ||
            ''
        );
        const image =
          this.pickRssImage(item) || null;

        if (title && link) {
          out.push({
            title,
            link: this.normalizeUrl(link),
            date,
            source: this.googleNews.name,
            description,
            image
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
      const u = new URL(link);
      const urlParam = u.searchParams.get('url');
      if (urlParam) return decodeURIComponent(urlParam);
      return link;
    } catch {
      return link;
    }
  }

  pickRssImage(item) {
    try {
      if (item.enclosure && item.enclosure.url) return item.enclosure.url;
      // media:thumbnail
      if (item['media:thumbnail']) {
        const thumb = item['media:thumbnail'][0];
        if (thumb && (thumb.$?.url || thumb.url)) return thumb.$?.url || thumb.url;
      }
      // media:content
      if (item['media:content']) {
        const m = item['media:content'][0];
        if (m && (m.$?.url || m.url)) return m.$?.url || m.url;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ================= HTML SOURCES =================

  async crawlAllHtmlSources() {
    const promises = this.htmlSources.map((s) => this.crawlHtmlSource(s));
    const settled = await Promise.allSettled(promises);
    const out = [];
    for (const s of settled) if (s.status === 'fulfilled') out.push(...s.value);
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
          if (!dateText) {
            const timeAttr =
              $(el).find('time').attr('datetime') ||
              $('meta[property="article:published_time"]').attr('content') ||
              $('meta[name="pubdate"]').attr('content') ||
              '';
            dateText = (timeAttr || '').trim();
          }
          const dateISO = this.parseDate(dateText);

          // tentativa de descrição rápida na listagem
          const snippet =
            $(el).find('.lead, .summary, .intro').text().trim() ||
            '';

          news.push({
            title,
            link: this.normalizeUrl(link),
            date: dateISO,
            source: source.name,
            description: this.prettySnippet(snippet),
            image: null // vamos tentar enriquecer já a seguir
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

  // ================= ENRICH (abre a página e extrai og:description/og:image) =================

  async enrichArticles(articles, max = 12) {
    const need = articles
      .filter(a => !a.description || !a.image)
      .slice(0, max);

    for (const a of need) {
      try {
        const html = await this.requestWithRetry(a.link);
        const { description, image } = this.extractMeta(html, a.link);
        if (!a.description && description) a.description = this.prettySnippet(description);
        if (!a.image && image) a.image = image;
      } catch (e) {
        // ignora falhas pontuais
      }
    }

    // fallback final para descrição
    for (const a of articles) {
      if (!a.description) a.description = '';
      if (!a.image) a.image = null;
    }
    return articles;
  }

  extractMeta(html, pageUrl) {
    const $ = cheerio.load(html);

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    let image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content') ||
      '';

    image = image ? this.ensureAbsoluteUrl(image, pageUrl) : '';

    // fallback brando: primeira imagem relevante
    if (!image) {
      const firstImg = $('img[src]').first().attr('src') || '';
      if (firstImg && !/sprite|logo|icon|placeholder/i.test(firstImg)) {
        image = this.ensureAbsoluteUrl(firstImg, pageUrl);
      }
    }

    return { description, image: image || null };
  }

  prettySnippet(txt) {
    const clean = String(txt || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return '';
    const max = 220;
    return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean;
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
      const banned = new Set([
        'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id',
        'gclid','fbclid','xtor','feature','ref'
      ]);
      for (const p of [...u.searchParams.keys()]) {
        if (banned.has(p)) u.searchParams.delete(p);
      }
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

    const lower = this.normalizeText(raw);
    const now = new Date();
    if (/\bhoje\b/.test(lower)) return now.toISOString();
    if (/\bontem\b/.test(lower)) {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }

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

    const dmY = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (dmY) {
      const [_, d, m, y] = dmY;
      const yyyy = y.length === 2 ? `20${y}` : y;
      const iso = new Date(`${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`);
      if (!isNaN(iso.getTime())) return iso.toISOString();
    }

    const months = {
      janeiro:1,fevereiro:2,marco:3,março:3,abril:4,maio:5,junho:6,
      julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12,
      jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12
    };
    const mMatch = this.normalizeText(raw).match(/\b(\d{1,2})\s*(de)?\s*([a-zçãéô]+)\s*(de)?\s*(\d{4})\b/i);
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

    return this.safeToISOString(raw);
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = new NewsCrawlerService();