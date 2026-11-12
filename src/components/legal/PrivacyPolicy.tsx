import { SITE } from '../../data/site';
import { Code, Contact, Ext, Int, List, P, Section, operatorName } from './parts';

export function PrivacyPolicy() {
  return (
    <>
      <Section title="1. Who is responsible">
        <P>
          {SITE.name} is a news dashboard that shows headlines from public RSS and Atom feeds. The controller responsible
          for the processing described here is {operatorName()} ("we"). You can reach us at <Contact />.
        </P>
      </Section>

      <Section title="2. The short version">
        <List>
          <li>There are no user accounts, no sign-up and no newsletter.</li>
          <li>We run no analytics, no advertising and no tracking, and we do not build profiles.</li>
          <li>We set no cookies. Your settings are kept in your own browser's local storage.</li>
          <li>
            To show the site, your browser talks to our hosting provider and to two external services for images
            (described below). Clicking a headline takes you to the publisher's website.
          </li>
        </List>
      </Section>

      <Section title="3. Hosting (Cloudflare)">
        <P>
          The website and its server functions are hosted on Cloudflare Workers, a service of Cloudflare, Inc. Whenever
          your browser requests a page or data, Cloudflare necessarily processes technical connection data: your IP
          address, date and time, the requested address, the amount of data transferred, and the browser and operating
          system identification your browser sends (user agent).
        </P>
        <P>
          This data is needed to deliver the site and to protect it against abuse. Cloudflare may process it on servers
          in the country nearest to you as well as in other countries, including the United States. We do not combine
          it with any other data and do not use it to identify you. Details:{' '}
          <Ext href="https://www.cloudflare.com/privacypolicy/">Cloudflare Privacy Policy</Ext>.
        </P>
      </Section>

      <Section title="4. What our server functions process">
        <P>The dashboard loads its content through three functions that run on our hosting:</P>
        <List>
          <li>
            <strong>Loading headlines</strong> (<Code>/api/feeds</Code>): your browser sends the feed addresses of the
            sources you have switched on, including any custom feeds you added, together with a short checksum of the
            version it already has. Our server fetches those feeds from the publishers and returns the headlines.
          </li>
          <li>
            <strong>Finding a feed</strong> (<Code>/api/discover</Code>): when you add your own source, the address you
            type in is sent to our server, which looks for a feed on that website.
          </li>
          <li>
            <strong>Preview images</strong> (<Code>/api/og</Code>): for articles whose feed contains no image, your
            browser sends the article addresses, and our server reads the preview image address from the article page.
          </li>
        </List>
        <P>
          The publishers' servers see these requests coming from Cloudflare's network, not from your device. Results
          are held briefly in a shared cache (headlines for up to 60 seconds, preview image addresses for up to 7 days)
          so that the same feed is not fetched again for every visitor. Cache entries are keyed by the feed or article
          address only and are not linked to you. We keep no database of visitors or of the sources they read.
        </P>
      </Section>

      <Section title="5. Data stored in your browser">
        <P>
          Your layout (chosen sources, their order, custom sources, language and appearance settings), the most recently
          loaded headlines, the preview image addresses already looked up, a marker for each article you have
          opened, the articles you saved for later and the load errors of failing sources are stored in your browser's
          local storage. This data stays on your device; we cannot read it. It is only used by the site running in your
          browser. The <Int to="cookies">Cookie Policy</Int> lists every entry and explains how to delete it.
        </P>
      </Section>

      <Section title="6. External services your browser contacts">
        <P>To display images, your browser connects directly to the following third parties:</P>
        <List>
          <li>
            <strong>wsrv.nl (images.weserv.nl)</strong>, an image resizing service. Publishers supply large images; we
            ask wsrv.nl for a small version instead, which reduces the data you download considerably. wsrv.nl receives
            your IP address, your browser's user agent and the address of the image to resize. Details:{' '}
            <Ext href="https://github.com/weserv/images/blob/5.x/Privacy-Policy.md">wsrv.nl Privacy Policy</Ext>.
          </li>
          <li>
            <strong>The publishers' image servers.</strong> If wsrv.nl cannot deliver an image, your browser loads the
            original image directly from the publisher or its content delivery network, which then receives your IP
            address and user agent.
          </li>
          <li>
            <strong>DuckDuckGo icon service</strong> (<Code>icons.duckduckgo.com</Code>), which supplies the small site
            icons shown next to each source. It receives your IP address, your user agent and the domain name of the
            news site whose icon is requested. Details:{' '}
            <Ext href="https://duckduckgo.com/privacy">DuckDuckGo Privacy Policy</Ext>.
          </li>
        </List>
        <P>
          Images are requested without a referrer, so these services are not told which page of ours you were viewing.
          You can switch preview images off under Customize → Appearance; images in the "Top stories today" section
          disappear when you also switch that section off. We load no fonts, scripts or style sheets from third
          parties.
        </P>
      </Section>

      <Section title="7. Links to other websites">
        <P>
          Every headline links to the publisher's own website and opens in a new tab. Once you follow a link, the
          publisher's privacy policy applies and we have no influence over the data processed there, including cookies
          and tracking the publisher may use. Our links do not pass on a referrer, so the publisher is not told that
          you came from {SITE.name}.
        </P>
      </Section>

      <Section title="8. Sharing and exporting your layout">
        <P>
          "Create link" puts your layout into the part of the address after the <Code>#</Code> sign. Browsers do not
          send that part to any server, so we never receive it. Anyone you give the link to can see which sources it
          contains. "Export as file" saves the same information as a file on your device.
        </P>
      </Section>

      <Section title="9. Legal bases">
        <P>
          Where the EU General Data Protection Regulation (GDPR) applies, we process connection data on the basis of
          our legitimate interest in operating a secure, functioning and data-efficient website (Art. 6(1)(f) GDPR).
          Storing your settings on your device is strictly necessary to provide the customisation you ask for. Where
          the Swiss Federal Act on Data Protection (FADP) applies, the processing rests on the same purposes.
        </P>
      </Section>

      <Section title="10. How long data is kept">
        <List>
          <li>We keep no visitor records ourselves.</li>
          <li>Connection data at Cloudflare and at the external services is kept according to their own policies.</li>
          <li>Shared cache entries expire after at most 60 seconds (headlines) or 7 days (preview image addresses).</li>
          <li>Data in your browser stays until you reset the layout or clear the site's data.</li>
        </List>
      </Section>

      <Section title="11. Your rights">
        <P>
          Depending on the law that applies to you, you have the right to ask for access to your personal data, to have
          it corrected or deleted, to restrict or object to its processing, and to receive it in a portable format. As
          we hold no account or profile about you, most of your data is under your direct control in your browser. For
          any request, contact us at <Contact />. You also have the right to lodge a complaint with a data protection
          supervisory authority.
        </P>
      </Section>

      <Section title="12. Changes to this policy">
        <P>
          We update this policy when the site or the services it uses change. The date at the top shows when it was
          last revised.
        </P>
      </Section>
    </>
  );
}
