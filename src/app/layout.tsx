import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoSync Meet - AI Meeting Assistant Platform',
  description:
    'Automate meeting transcription, AI-driven decisions & action items extraction, Slack broadcasts, and Jira task tracking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
