import { permanentRedirect } from 'next/navigation';

// 308, not 307: the homepage lives at /curated, and a permanent redirect tells
// search engines to credit / to it instead of treating / as a separate page.
export default function Home() {
  permanentRedirect('/curated');
}
