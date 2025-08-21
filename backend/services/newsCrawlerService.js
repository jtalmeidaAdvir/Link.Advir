
const axios = require('axios');
const cheerio = require('cheerio');

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
        
        this.sources = [
            {
                name: 'Jornal de Negócios',
                url: 'https://www.jornaldenegocios.pt',
                selector: '.m-article',
                titleSelector: '.m-article__title a',
                linkSelector: '.m-article__title a',
                dateSelector: '.m-article__date'
            },
            {
                name: 'Público Economia',
                url: 'https://www.publico.pt/economia',
                selector: '.card',
                titleSelector: '.card__title a',
                linkSelector: '.card__title a',
                dateSelector: '.card__date'
            },
            {
                name: 'Dinheiro Vivo',
                url: 'https://www.dinheirovivo.pt',
                selector: '.article-item',
                titleSelector: '.article-item__title a',
                linkSelector: '.article-item__title a',
                dateSelector: '.article-item__date'
            }
        ];
    }

    async crawlNews() {
        try {
            console.log('Iniciando crawl de notícias...');
            const allNews = [];

            for (const source of this.sources) {
                try {
                    const news = await this.crawlSource(source);
                    allNews.push(...news);
                } catch (error) {
                    console.error(`Erro ao fazer crawl de ${source.name}:`, error.message);
                }
            }

            // Filtrar notícias relevantes
            const relevantNews = this.filterRelevantNews(allNews);
            
            // Remover duplicatas
            const uniqueNews = this.removeDuplicates(relevantNews);
            
            // Ordenar por data (mais recentes primeiro)
            uniqueNews.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            console.log(`Encontradas ${uniqueNews.length} notícias relevantes`);
            return uniqueNews.slice(0, 10); // Retornar apenas as 10 mais recentes
            
        } catch (error) {
            console.error('Erro no crawl de notícias:', error);
            return [];
        }
    }

    async crawlSource(source) {
        try {
            const response = await axios.get(source.url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const news = [];

            $(source.selector).each((index, element) => {
                try {
                    const titleElement = $(element).find(source.titleSelector);
                    const title = titleElement.text().trim();
                    let link = titleElement.attr('href');
                    
                    if (!title || !link) return;
                    
                    // Garantir que o link é absoluto
                    if (link.startsWith('/')) {
                        link = source.url + link;
                    }
                    
                    let date = $(element).find(source.dateSelector).text().trim();
                    if (!date) {
                        date = new Date().toISOString();
                    }

                    news.push({
                        title,
                        link,
                        date: this.parseDate(date),
                        source: source.name
                    });
                } catch (error) {
                    console.error('Erro ao processar elemento:', error);
                }
            });

            return news;
        } catch (error) {
            console.error(`Erro ao fazer crawl de ${source.name}:`, error.message);
            return [];
        }
    }

    filterRelevantNews(news) {
        return news.filter(article => {
            const titleLower = article.title.toLowerCase();
            return this.keywords.some(keyword => 
                titleLower.includes(keyword.toLowerCase())
            );
        });
    }

    removeDuplicates(news) {
        const seen = new Set();
        return news.filter(article => {
            const key = article.title.toLowerCase().trim();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    parseDate(dateString) {
        // Tentar parsear diferentes formatos de data
        if (!dateString) return new Date().toISOString();
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return new Date().toISOString();
            }
            return date.toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    // Método para obter notícias com cache simples
    async getCachedNews() {
        const cacheKey = 'news_cache';
        const cacheTimeout = 60 * 60 * 1000; // 1 hora em millisegundos
        
        if (this.cache && this.cache[cacheKey] && 
            (Date.now() - this.cache[cacheKey].timestamp) < cacheTimeout) {
            return this.cache[cacheKey].data;
        }

        const news = await this.crawlNews();
        
        if (!this.cache) this.cache = {};
        this.cache[cacheKey] = {
            data: news,
            timestamp: Date.now()
        };

        return news;
    }
}

module.exports = new NewsCrawlerService();
