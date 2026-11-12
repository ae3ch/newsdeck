export interface Category {
  id: string;
  label: string;
  description: string;
}

/** Themen, aus denen sich das Dashboard zusammenstellen lässt. Reihenfolge = Anzeige-Reihenfolge. */
export const CATEGORIES: Category[] = [
  { id: 'general', label: 'General', description: 'The big tech publications: products, industry, analysis' },
  { id: 'security', label: 'Security', description: 'Vulnerabilities, attacks and data breaches' },
  { id: 'developer', label: 'Development', description: 'Programming, web, tooling and engineering blogs' },
  { id: 'ai', label: 'AI', description: 'Models, research and applications of artificial intelligence' },
  { id: 'apple', label: 'Apple', description: 'iPhone, Mac and everything out of Cupertino' },
  { id: 'mobile', label: 'Android & Mobile', description: 'Smartphones, Android and mobile apps' },
  { id: 'linux', label: 'Linux & Open Source', description: 'Distributions, the kernel and free software' },
  { id: 'hardware', label: 'Hardware', description: 'Processors, graphics cards, PCs and reviews' },
  { id: 'business', label: 'Startups & Business', description: 'Founders, funding rounds and the business of tech' },
  { id: 'policy', label: 'Tech Policy', description: 'Regulation, digital rights and society' },
  { id: 'science', label: 'Science', description: 'Research, physics, space and nature' },
  { id: 'gaming', label: 'Gaming', description: 'Games, consoles and the industry behind them' },
  { id: 'crypto', label: 'Crypto', description: 'Bitcoin, blockchain and digital currencies' },
];

const CATEGORY_LABELS = new Map(CATEGORIES.map((c) => [c.id, c.label]));
export const categoryLabel = (id: string | undefined): string | undefined => (id ? CATEGORY_LABELS.get(id) : undefined);

export interface DefaultSource {
  id: string;
  name: string;
  siteUrl: string;
  feedUrl: string;
  category: string;
  lang: 'de' | 'en';
  /** true = bei einem neuen Dashboard von Anfang an aktiv. */
  starter?: boolean;
}

const s = (
  id: string,
  name: string,
  siteUrl: string,
  feedUrl: string,
  category: string,
  lang: 'de' | 'en',
  starter = false,
): DefaultSource => ({ id, name, siteUrl, feedUrl, category, lang, ...(starter ? { starter } : {}) });

/**
 * Mitgelieferter Quellenkatalog. Die id ist stabil und darf nach Veröffentlichung nicht
 * mehr geändert werden, weil gespeicherte Layouts darauf verweisen.
 */
export const DEFAULT_SOURCES: DefaultSource[] = [
  // --- Startauswahl (Reihenfolge = Reihenfolge auf einem neuen Dashboard) ---
  s('heise', 'heise online', 'https://www.heise.de', 'https://www.heise.de/rss/heise-atom.xml', 'general', 'de', true),
  s('golem', 'Golem.de', 'https://www.golem.de', 'https://rss.golem.de/rss.php?feed=RSS2.0', 'general', 'de', true),
  s('techcrunch', 'TechCrunch', 'https://techcrunch.com', 'https://techcrunch.com/feed/', 'business', 'en', true),
  s('theverge', 'The Verge', 'https://www.theverge.com', 'https://www.theverge.com/rss/index.xml', 'general', 'en', true),
  s('hackernews', 'Hacker News', 'https://news.ycombinator.com', 'https://hnrss.org/frontpage', 'developer', 'en', true),
  s('arstechnica', 'Ars Technica', 'https://arstechnica.com', 'https://feeds.arstechnica.com/arstechnica/index', 'general', 'en', true),
  s('t3n', 't3n', 'https://t3n.de', 'https://t3n.de/rss.xml', 'general', 'de', true),
  s('computerbase', 'ComputerBase', 'https://www.computerbase.de', 'https://www.computerbase.de/rss/news.xml', 'hardware', 'de', true),
  s('theregister', 'The Register', 'https://www.theregister.com', 'https://www.theregister.com/headlines.atom', 'general', 'en', true),
  s('caschy', 'Caschys Blog', 'https://stadt-bremerhaven.de', 'https://stadt-bremerhaven.de/feed/', 'general', 'de', true),
  s('netzpolitik', 'netzpolitik.org', 'https://netzpolitik.org', 'https://netzpolitik.org/feed/', 'policy', 'de', true),
  s('wired', 'WIRED', 'https://www.wired.com', 'https://www.wired.com/feed/rss', 'general', 'en', true),
  s('thehackernews', 'The Hacker News', 'https://thehackernews.com', 'https://feeds.feedburner.com/TheHackersNews', 'security', 'en', true),
  s('bleepingcomputer', 'BleepingComputer', 'https://www.bleepingcomputer.com', 'https://morss.it/:proxy/https://www.bleepingcomputer.com/feed/', 'security', 'en', true),
  s('phoronix', 'Phoronix', 'https://www.phoronix.com', 'https://www.phoronix.com/rss.php', 'linux', 'en', true),
  s('winfuture', 'WinFuture', 'https://winfuture.de', 'https://static.winfuture.de/feeds/WinFuture-News-rss2.0.xml', 'general', 'de', true),
  s('ifun', 'ifun.de', 'https://www.ifun.de', 'https://www.ifun.de/feed/', 'apple', 'de', true),
  s('9to5mac', '9to5Mac', 'https://9to5mac.com', 'https://9to5mac.com/feed/', 'apple', 'en', true),
  s('9to5google', '9to5Google', 'https://9to5google.com', 'https://9to5google.com/feed/', 'mobile', 'en', true),
  s('engadget', 'Engadget', 'https://www.engadget.com', 'https://www.engadget.com/rss.xml', 'general', 'en', true),
  s('techreview', 'MIT Technology Review', 'https://www.technologyreview.com', 'https://www.technologyreview.com/feed/', 'ai', 'en', true),
  s('zdnet', 'ZDNET', 'https://www.zdnet.com', 'https://www.zdnet.com/rss/news/', 'general', 'en', true),

  // --- Allgemein ---
  s('spiegel-netzwelt', 'SPIEGEL Netzwelt', 'https://www.spiegel.de/netzwelt/', 'https://www.spiegel.de/netzwelt/index.rss', 'general', 'de'),
  s('404media', '404 Media', 'https://www.404media.co', 'https://www.404media.co/rss/', 'general', 'en'),
  s('borncity', 'Borns IT- und Windows-Blog', 'https://www.borncity.com/blog/', 'https://borncity.com/blog/feed/', 'general', 'de'),

  // --- Security ---
  s('heise-security', 'heise Security', 'https://www.heise.de/security/', 'https://www.heise.de/security/feed.xml', 'security', 'de'),
  s('krebs', 'Krebs on Security', 'https://krebsonsecurity.com', 'https://krebsonsecurity.com/feed/', 'security', 'en'),
  s('securityweek', 'SecurityWeek', 'https://www.securityweek.com', 'https://www.securityweek.com/feed/', 'security', 'en'),
  s('darkreading', 'Dark Reading', 'https://www.darkreading.com', 'https://www.darkreading.com/rss.xml', 'security', 'en'),
  s('schneier', 'Schneier on Security', 'https://www.schneier.com', 'https://www.schneier.com/feed/atom/', 'security', 'en'),
  s('therecord', 'The Record', 'https://therecord.media', 'https://therecord.media/feed', 'security', 'en'),

  // --- Entwicklung ---
  s('heise-developer', 'heise Developer', 'https://www.heise.de/developer/', 'https://www.heise.de/developer/feed.xml', 'developer', 'de'),
  s('lobsters', 'Lobsters', 'https://lobste.rs', 'https://lobste.rs/rss', 'developer', 'en'),
  s('github-blog', 'GitHub Blog', 'https://github.blog', 'https://github.blog/feed/', 'developer', 'en'),
  s('cloudflare-blog', 'Cloudflare Blog', 'https://blog.cloudflare.com', 'https://blog.cloudflare.com/rss/', 'developer', 'en'),
  s('infoq', 'InfoQ', 'https://www.infoq.com', 'https://feed.infoq.com/', 'developer', 'en'),
  s('stackoverflow-blog', 'Stack Overflow Blog', 'https://stackoverflow.blog', 'https://stackoverflow.blog/feed/', 'developer', 'en'),
  s('devto', 'DEV Community', 'https://dev.to', 'https://dev.to/feed', 'developer', 'en'),
  s('smashing', 'Smashing Magazine', 'https://www.smashingmagazine.com', 'https://www.smashingmagazine.com/feed/', 'developer', 'en'),
  s('css-tricks', 'CSS-Tricks', 'https://css-tricks.com', 'https://css-tricks.com/feed/', 'developer', 'en'),

  // --- KI ---
  s('the-decoder', 'The Decoder', 'https://the-decoder.de', 'https://the-decoder.de/feed/', 'ai', 'de'),
  s('openai-news', 'OpenAI News', 'https://openai.com/news/', 'https://openai.com/news/rss.xml', 'ai', 'en'),
  s('google-ai', 'Google AI Blog', 'https://blog.google/technology/ai/', 'https://blog.google/innovation-and-ai/technology/ai/rss/', 'ai', 'en'),
  s('simonwillison', 'Simon Willison', 'https://simonwillison.net', 'https://simonwillison.net/atom/everything/', 'ai', 'en'),

  // --- Apple ---
  s('macrumors', 'MacRumors', 'https://www.macrumors.com', 'https://feeds.macrumors.com/MacRumors-All', 'apple', 'en'),
  s('iphone-ticker', 'iphone-ticker.de', 'https://www.iphone-ticker.de', 'https://www.iphone-ticker.de/feed/', 'apple', 'de'),
  s('appleinsider', 'AppleInsider', 'https://appleinsider.com', 'https://appleinsider.com/rss/news/', 'apple', 'en'),

  // --- Android & Mobile ---
  s('androidauthority', 'Android Authority', 'https://www.androidauthority.com', 'https://www.androidauthority.com/feed/', 'mobile', 'en'),
  s('androidpolice', 'Android Police', 'https://www.androidpolice.com', 'https://www.androidpolice.com/feed/', 'mobile', 'en'),
  s('mobiflip', 'mobiFlip', 'https://www.mobiflip.de', 'https://www.mobiflip.de/feed/', 'mobile', 'de'),

  // --- Linux & Open Source ---
  s('lwn', 'LWN.net', 'https://lwn.net', 'https://lwn.net/headlines/rss', 'linux', 'en'),
  s('omgubuntu', 'OMG! Ubuntu', 'https://www.omgubuntu.co.uk', 'https://www.omgubuntu.co.uk/feed', 'linux', 'en'),
  s('itsfoss', "It's FOSS", 'https://itsfoss.com', 'https://itsfoss.com/rss/', 'linux', 'en'),
  s('linuxnews', 'LinuxNews.de', 'https://linuxnews.de', 'https://linuxnews.de/feed/', 'linux', 'de'),
  s('gnulinux', 'GNU/Linux.ch', 'https://gnulinux.ch', 'https://gnulinux.ch/rss.xml', 'linux', 'de'),

  // --- Hardware ---
  s('tomshardware', "Tom's Hardware", 'https://www.tomshardware.com', 'https://www.tomshardware.com/feeds.xml', 'hardware', 'en'),
  s('pcworld', 'PCWorld', 'https://www.pcworld.com', 'https://www.pcworld.com/feed', 'hardware', 'en'),
  s('pcgh', 'PC Games Hardware', 'https://www.pcgameshardware.de', 'https://www.pcgameshardware.de/feed.cfm', 'hardware', 'de'),

  // --- Startups & Business ---
  s('thenextweb', 'The Next Web', 'https://thenextweb.com', 'https://thenextweb.com/feed', 'business', 'en'),
  s('siliconangle', 'SiliconANGLE', 'https://siliconangle.com', 'https://siliconangle.com/feed/', 'business', 'en'),
  s('gruenderszene', 'Gründerszene', 'https://www.businessinsider.de/gruenderszene/', 'https://www.businessinsider.de/gruenderszene/feed/', 'business', 'de'),
  s('deutsche-startups', 'deutsche-startups.de', 'https://www.deutsche-startups.de', 'https://www.deutsche-startups.de/feed/', 'business', 'de'),

  // --- Netzpolitik ---
  s('eff', 'EFF Deeplinks', 'https://www.eff.org/deeplinks', 'https://www.eff.org/rss/updates.xml', 'policy', 'en'),
  s('techdirt', 'Techdirt', 'https://www.techdirt.com', 'https://www.techdirt.com/feed/', 'policy', 'en'),

  // --- Wissenschaft ---
  s('spektrum', 'Spektrum.de', 'https://www.spektrum.de', 'https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406', 'science', 'de'),
  s('scinexx', 'scinexx', 'https://www.scinexx.de', 'https://www.scinexx.de/feed/', 'science', 'de'),
  s('quanta', 'Quanta Magazine', 'https://www.quantamagazine.org', 'https://www.quantamagazine.org/feed/', 'science', 'en'),
  s('physorg', 'Phys.org', 'https://phys.org', 'https://phys.org/rss-feed/', 'science', 'en'),

  // --- Gaming ---
  s('gamestar', 'GameStar', 'https://www.gamestar.de', 'https://www.gamestar.de/news/rss/news.rss', 'gaming', 'de'),
  s('eurogamer', 'Eurogamer', 'https://www.eurogamer.net', 'https://www.eurogamer.net/feed', 'gaming', 'en'),
  s('rps', 'Rock Paper Shotgun', 'https://www.rockpapershotgun.com', 'https://www.rockpapershotgun.com/feed', 'gaming', 'en'),
  s('kotaku', 'Kotaku', 'https://kotaku.com', 'https://kotaku.com/feed', 'gaming', 'en'),
  s('polygon', 'Polygon', 'https://www.polygon.com', 'https://www.polygon.com/feed/', 'gaming', 'en'),

  // --- Krypto ---
  s('btc-echo', 'BTC-ECHO', 'https://www.btc-echo.de', 'https://www.btc-echo.de/feed/', 'crypto', 'de'),
  s('cointelegraph', 'Cointelegraph', 'https://cointelegraph.com', 'https://cointelegraph.com/rss', 'crypto', 'en'),
  s('decrypt', 'Decrypt', 'https://decrypt.co', 'https://decrypt.co/feed', 'crypto', 'en'),
  s('theblock', 'The Block', 'https://www.theblock.co', 'https://www.theblock.co/rss.xml', 'crypto', 'en'),
];
