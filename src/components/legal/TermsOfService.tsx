import { SITE } from '../../data/site';
import { Contact, Int, List, P, Section, operatorName } from './parts';

export function TermsOfService() {
  let n = 0;
  const num = (title: string) => `${++n}. ${title}`;
  return (
    <>
      <Section title={num('The service')}>
        <P>
          {SITE.name} is a free news dashboard provided by {operatorName()} ("we"). It collects headlines, short
          excerpts and preview images from the public RSS and Atom feeds of third-party publishers and links to the
          original articles. By using the site you agree to these terms. If you do not agree, please do not use it.
        </P>
      </Section>

      <Section title={num('Third-party content')}>
        <List>
          <li>
            All headlines, excerpts, images, names and logos belong to their respective publishers. {SITE.name} is not
            affiliated with, endorsed by or sponsored by any of them.
          </li>
          <li>
            We show only what publishers make available in their public feeds and always link to the original article.
            Full articles are read on the publisher's website, under that publisher's terms.
          </li>
          <li>
            Content is gathered automatically. We do not review, edit or verify it and are not responsible for its
            accuracy, completeness, legality or timeliness, nor for the content of linked websites.
          </li>
          <li>
            The "Top stories today" ranking is produced automatically from how many of your selected sources report on
            a topic. It is not an editorial judgement.
          </li>
          <li>
            Publishers who do not want their feed to appear in the built-in catalogue can contact us at <Contact />; we
            will remove it.
          </li>
        </List>
      </Section>

      <Section title={num('Sources you add yourself')}>
        <P>
          You can add your own feeds. You are responsible for the addresses you enter and must only add feeds you are
          allowed to access. Your layout is stored in your browser only; we keep no copy and cannot restore it. Use the
          export function if you want a backup.
        </P>
      </Section>

      <Section title={num('Acceptable use')}>
        <P>You agree not to:</P>
        <List>
          <li>use the site or its interfaces for anything unlawful;</li>
          <li>
            send automated or excessive requests to the site's interfaces, use them as a general-purpose proxy, or use
            them to reach systems you are not authorised to access;
          </li>
          <li>attempt to disrupt the site, bypass its technical limits or interfere with other people's use of it;</li>
          <li>present the publishers' content as your own or as ours.</li>
        </List>
        <P>We may limit or block access where these rules are broken or where it is needed to protect the service.</P>
      </Section>

      <Section title={num('Availability and changes')}>
        <P>
          The site is provided free of charge and without any commitment to availability. We may change, interrupt or
          discontinue it, add or remove sources, or change how it works at any time and without notice. The site
          depends on third parties (the publishers' feeds, our hosting provider and the image services named in the{' '}
          <Int to="privacy">Privacy Policy</Int>); if one of them changes or fails, parts of the site may stop working.
        </P>
      </Section>

      <Section title={num('No warranty')}>
        <P>
          The site is provided "as is" and "as available". To the extent permitted by law, we give no warranties of any
          kind, express or implied, including as to accuracy, reliability, fitness for a particular purpose or
          uninterrupted operation. Nothing on the site is professional, financial, legal or security advice. Do not
          rely on it as your only source of information for decisions that matter.
        </P>
      </Section>

      <Section title={num('Liability')}>
        <P>
          To the extent permitted by law, we are not liable for any loss or damage arising from your use of, or
          inability to use, the site, from third-party content shown on it, or from websites it links to. Nothing in
          these terms excludes or limits liability that cannot be excluded or limited under the applicable law, such as
          liability for intent or gross negligence, or your mandatory rights as a consumer.
        </P>
      </Section>

      <Section title={num('Privacy')}>
        <P>
          How data is handled is described in the <Int to="privacy">Privacy Policy</Int> and the{' '}
          <Int to="cookies">Cookie Policy</Int>.
        </P>
      </Section>

      <Section title={num('Changes to these terms')}>
        <P>
          We may update these terms. The date at the top shows the latest revision. If you continue to use the site
          after a change, the updated terms apply.
        </P>
      </Section>

      {SITE.jurisdiction && (
        <Section title={num('Governing law')}>
          <P>
            These terms are governed by the laws of {SITE.jurisdiction}. Mandatory consumer protection rules of the
            country where you live remain unaffected.
          </P>
        </Section>
      )}

      <Section title={num('Contact')}>
        <P>
          Questions about these terms: <Contact />.
        </P>
      </Section>
    </>
  );
}
