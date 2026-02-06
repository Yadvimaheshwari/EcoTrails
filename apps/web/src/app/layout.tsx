import type { Metadata } from 'next';
//import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LayoutContent } from '@/components/LayoutContent';

//const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EcoTrails',
  description: 'Your hiking companion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={'font-sao'}>
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
