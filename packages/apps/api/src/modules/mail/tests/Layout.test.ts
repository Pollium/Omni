import Layout from '../services/Layout';
import { MailMessage } from '../contracts/mail';
import { describe, expect, it } from 'vitest';

const MESSAGE: MailMessage = {
    to: 'someone@example.test',
    language: 'en',
    subject: 'Subject',
    heading: 'Hello <b>"friend"</b>',
    lines: [
        "Tom & Jerry's <script>alert(1)</script>",
        'Second line'
    ],
    action: {
        label: 'Open <now>',
        url: 'https://app.example.test/path?a=1&b="2"'
    }
};

describe('Layout', () => {
    const layout = new Layout();

    it('escapes the heading, every line and the action it writes into the html', () => {
        const html = layout.html(MESSAGE);

        expect(html).toContain('<html lang="en">');
        expect(html).toContain('<title>Hello &lt;b&gt;&quot;friend&quot;&lt;/b&gt;</title>');
        expect(html).toContain('Tom &amp; Jerry&#39;s &lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('href="https://app.example.test/path?a=1&amp;b=&quot;2&quot;"');
        expect(html).toContain('Open &lt;now&gt;</a>');
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<b>');
    });

    it('signs the mail with the instance name', () => {
        expect(layout.html(MESSAGE)).toContain('Omni</td></tr>');
        expect(layout.text(MESSAGE).endsWith('\n\nOmni')).toBe(true);
    });

    it('draws no button for a mail without an action', () => {
        const html = layout.html({
            ...MESSAGE,
            action: null
        });

        expect(html).not.toContain('<a ');
    });

    it('spells the link out in the plain text version', () => {
        expect(layout.text(MESSAGE)).toBe([
            'Hello <b>"friend"</b>',
            "Tom & Jerry's <script>alert(1)</script>",
            'Second line',
            'Open <now>: https://app.example.test/path?a=1&b="2"',
            'Omni'
        ].join('\n\n'));
    });
});
