import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata = {
  title: 'HSR Auto Check-in',
  description: 'Self-hosted Honkai Star Rail Daily Auto Check-in Dashboard'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
