import { SITE } from '../../data/site';
import { Code, Contact, Int, List, P, Section } from './parts';

const ENTRIES: { key: string; purpose: string; kept: string }[] = [
  {
    key: 'tech-news:config',
    purpose: 'Your layout: which sources are switched on, their order, custom sources you added, language and appearance settings.',
    kept: 'Until you reset the layout or clear site data.',
  },
  {
    key: 'tech-news:feeds',
    purpose: 'The most recently loaded headlines, so the page appears immediately on your next visit and only changed feeds are downloaded again.',
    kept: 'Overwritten on every refresh; removed when you clear site data.',
  },
  {
    key: 'tech-news:feeds-claim',
    purpose: 'Notes when a refresh started, so that several open tabs share one request per minute instead of each loading the feeds.',
    kept: 'Overwritten on every refresh; removed when you clear site data.',
  },
  {
    key: 'tech-news:read',
    purpose: 'Marks articles you have opened so their headlines appear dimmed. Stored as short checksums, not as addresses.',
    kept: 'Limited to the 2,000 most recent entries; removed when you clear site data.',
  },
  {
    key: 'tech-news:saved',
    purpose: 'Articles you saved for later: headline, link, preview image address, source and the time you saved it.',
    kept: 'Until you remove them; limited to 500 entries; removed when you clear site data.',
  },
  {
    key: 'tech-news:health',
    purpose: 'For sources that fail to load: since when and the last error, so a source that has been broken for a day can be pointed out.',
    kept: 'Removed as soon as the source loads again or is switched off; removed when you clear site data.',
  },
  {
    key: 'tech-news:og',
    purpose: 'Preview image addresses that have already been looked up, so they are not requested again.',
    kept: 'Limited to the 1,500 most recent entries; removed when you clear site data.',
  },
];

export function CookiePolicy() {
  return (
    <>
      <Section title="1. We set no cookies">
        <P>
          {SITE.name} itself does not set any cookies: none for analytics, none for advertising, none for tracking and
          none for login, because there is no login. That is why you see no cookie banner.
        </P>
      </Section>

      <Section title="2. What we store in your browser instead">
        <P>
          To remember your settings without an account, the site uses your browser's local storage. Like a cookie, this
          is data kept on your device; unlike a cookie, it is never sent along with requests automatically. The site
          stores exactly these entries:
        </P>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-sunken text-[11px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Entry</th>
                <th scope="col" className="px-3 py-2 font-semibold">Purpose</th>
                <th scope="col" className="px-3 py-2 font-semibold">Kept</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ENTRIES.map((e) => (
                <tr key={e.key} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Code>{e.key}</Code>
                  </td>
                  <td className="px-3 py-2">{e.purpose}</td>
                  <td className="px-3 py-2 text-muted">{e.kept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          All of them are needed for functions you use directly (your personal layout, fast loading and the read
          markers, saved articles and source checks). None of them identifies you, and none is shared with third parties.
        </P>
        <P>
          In addition, your browser keeps a copy of the site's own files (the page, its scripts, styles and icons) in
          its cache storage, so that {SITE.name} still opens when you are offline, for example from your home screen.
          This copy contains no information about you and is replaced when the site is updated.
        </P>
      </Section>

      <Section title="3. Cookies from other parties">
        <List>
          <li>
            <strong>Hosting.</strong> Our hosting provider Cloudflare may, depending on its security configuration, set
            a strictly necessary cookie to tell people from automated traffic. We have not enabled any optional
            Cloudflare features that set further cookies.
          </li>
          <li>
            <strong>Image services.</strong> Images are loaded from wsrv.nl, from DuckDuckGo's icon service and, as a
            fallback, from publishers' image servers. We do not ask these services to set cookies; whether a response
            from them carries a cookie is outside our control, and your browser's third-party cookie settings apply.
          </li>
          <li>
            <strong>Publishers' websites.</strong> When you open an article, you leave {SITE.name}. The publisher's own
            cookie practices apply there.
          </li>
        </List>
        <P>
          The <Int to="privacy">Privacy Policy</Int> describes these services and the data they receive.
        </P>
      </Section>

      <Section title="4. How to delete the stored data">
        <List>
          <li>
            <strong>In the site:</strong> Customize → Back up and transfer → Reset returns your layout to the default.
          </li>
          <li>
            <strong>In your browser:</strong> clearing "site data" or "cookies and other site data" for this website
            removes all entries and the offline copy. The site then starts again with the default layout.
          </li>
          <li>
            In a private or incognito window, the entries are deleted automatically when you close the window.
          </li>
        </List>
      </Section>

      <Section title="5. Questions">
        <P>
          If anything here is unclear, contact us at <Contact />.
        </P>
      </Section>
    </>
  );
}
