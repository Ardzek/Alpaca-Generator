class AlpacaConfig {
    static PARTS = {
        hair: ['default', 'bang', 'curls', 'elegant', 'fancy', 'quiff', 'short'],
        ears: ['default', 'tilt-backward', 'tilt-forward'],
        eyes: ['default', 'angry', 'naughty', 'panda', 'smart', 'star'],
        mouth: ['default', 'astonished', 'eating', 'laugh', 'tongue'],
        neck: ['default', 'bend-backward', 'bend-forward', 'thick'],
        leg: ['default', 'bubble-tea', 'cookie', 'game-console', 'tilt-backward', 'tilt-forward'],
        accessories: ['headphone', 'earings', 'flower', 'glasses'],
        backgrounds: ['blue50', 'blue60', 'blue70', 'darkblue30', 'darkblue50', 'darkblue70', 'green50', 'green60', 'green70', 'grey40', 'grey70', 'grey80', 'red50', 'red60', 'red70', 'yellow50', 'yellow60', 'yellow70']
    };

    static RENDER_ORDER = ['backgrounds', 'ears', 'neck', 'leg', 'nose', 'hair', 'eyes', 'mouth', 'accessories'];

    #config = { hair: 'default', ears: 'default', eyes: 'default', nose: 'nose', mouth: 'default', neck: 'default', leg: 'default', accessories: 'glasses', backgrounds: 'blue50'};

    get config() { return { ...this.#config }; }
    get categories() { return Object.keys(AlpacaConfig.PARTS); }
    getPart(part) { return this.#config[part]; }
    getOptions(part) { return AlpacaConfig.PARTS[part] || []; }

    setPart(part, value) {
        if (AlpacaConfig.PARTS[part]?.includes(value)) {
            this.#config[part] = value;
            return true;
        }
        return false;
    }

    randomize() {
        for (const part in AlpacaConfig.PARTS) {
            const opts = AlpacaConfig.PARTS[part];
            this.#config[part] = opts[Math.floor(Math.random() * opts.length)];
        }
    }
}

class ImageCache {
    #cache = new Map();
    #basePath = './images/';

    getUrl(part, option) { return `${this.#basePath}${part}/${option}.png`; }

    async load(src) {
        if (!this.#cache.has(src)) {
            this.#cache.set(src, new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Failed to load: ${src}`));
                img.src = src;
            }));
        }
        return this.#cache.get(src);
    }
}

class AlpacaRenderer {
    #container;
    #cache = new ImageCache();

    constructor(container) { this.#container = container; }

    async render(config) {
        this.#container.innerHTML = '';
        this.#container.classList.add('loading');
        try {
            await Promise.all(AlpacaConfig.RENDER_ORDER.map(part => this.#renderPart(part, config.getPart(part))));
        } catch (e) {
            console.error('Render error:', e);
        } finally {
            setTimeout(() => this.#container.classList.remove('loading'), 100);
        }
    }

    async #renderPart(part, option) {
        const el = document.createElement('div');
        el.className = `alpaca-part ${part}`;
        try {
            await this.#cache.load(this.#cache.getUrl(part, option));
            el.style.backgroundImage = `url(${this.#cache.getUrl(part, option)})`;
        } catch (e) {
            console.warn(`Image not found: ${this.#cache.getUrl(part, option)}`);
        }
        this.#container.appendChild(el);
    }
}

class EventEmitter {
    #listeners = new Map();
    on(event, cb) { this.#listeners.set(event, [...(this.#listeners.get(event) || []), cb]); }
    emit(event, data) { this.#listeners.get(event)?.forEach(cb => cb(data)); }
}

class UIController extends EventEmitter {
    #config;
    #activeCategory = 'hair';
    #els = {};

    constructor(config) {
        super();
        this.#config = config;
        this.#init();
    }

    #init() {
        this.#els = {
            categoryButtons: document.getElementById('categoryButtons'),
            styleButtons: document.getElementById('styleButtons'),
            randomBtn: document.getElementById('randomBtn'),
            downloadBtn: document.getElementById('downloadBtn')
        };
        this.#els.randomBtn?.addEventListener('click', () => this.#randomize());
        this.#els.downloadBtn?.addEventListener('click', () => this.#download());
        this.#render();
    }

    #render() {
        this.#renderCategories();
        this.#renderStyles();
        this.emit('alpacaChanged');
    }

    #renderCategories() {
        const c = this.#els.categoryButtons;
        if (!c) return;
        c.innerHTML = '';
        this.#config.categories.forEach(cat => {
            c.appendChild(this.#btn(cat, 'control-btn', cat === this.#activeCategory, () => this.#categoryChange(cat)));
        });
    }

    #renderStyles() {
        const c = this.#els.styleButtons;
        if (!c) return;
        c.innerHTML = '';
        this.#config.getOptions(this.#activeCategory).forEach(opt => {
            c.appendChild(this.#btn(this.#format(opt), 'style-btn', opt === this.#config.getPart(this.#activeCategory), () => this.#styleChange(opt)));
        });
    }

    #btn(text, cls, active, click) {
        const b = document.createElement('button');
        b.className = `${cls} ${active ? 'active' : ''}`;
        b.textContent = text;
        b.addEventListener('click', click);
        return b;
    }

    #format(opt) { return opt.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }

    #categoryChange(cat) { this.#activeCategory = cat; this.#render(); }
    #styleChange(opt) { if (this.#config.setPart(this.#activeCategory, opt)) this.#render(); }
    #randomize() { this.#animate(this.#els.randomBtn); this.#config.randomize(); this.#render(); }
    #download() { this.#animate(this.#els.downloadBtn); this.emit('downloadRequested'); }

    #animate(btn) {
        if (btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = '', 150);
        }
    }
}

class DownloadManager {
    constructor(container) { this.container = container; }

    async download() {
        try {
            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(this.container, { backgroundColor: null, scale: 1, useCORS: true });
                const link = document.createElement('a');
                link.download = `alpaca-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } else {
                alert('Right-click on the alpaca image and select "Save image as..." to download.');
            }
        } catch (e) {
            console.error('Download failed:', e);
            alert('Right-click on the alpaca image and select "Save image as..." to download.');
        }
    }
}

class AlpacaGenerator {
    async #init() {
        const config = new AlpacaConfig();
        const renderer = new AlpacaRenderer(document.getElementById('alpacaContainer'));
        const downloader = new DownloadManager(document.getElementById('alpacaContainer'));
        const ui = new UIController(config);

        ui.on('alpacaChanged', () => renderer.render(config));
        ui.on('downloadRequested', () => downloader.download());
        await renderer.render(config);
    }

    constructor() { document.addEventListener('DOMContentLoaded', () => this.#init()); }
}

new AlpacaGenerator();