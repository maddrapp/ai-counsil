import './globals.css';

export const metadata = {
  title: 'Council',
  description: 'A three-model collaborative reasoning council powered by Vercel AI Gateway.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
