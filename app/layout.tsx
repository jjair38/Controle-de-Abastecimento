import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Controle de Abastecimento - Jair',
  description:
    'Registre abastecimentos, acompanhe a quilometragem percorrida, calcule o consumo médio em km/l e analise seus gastos com combustível.',
  openGraph: {
    title: 'Controle de Abastecimento - Jair',
    description:
      'Registre abastecimentos, acompanhe a quilometragem percorrida, calcule o consumo médio em km/l e analise seus gastos com combustível.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Controle de Abastecimento - Jair',
    description:
      'Registre abastecimentos, acompanhe a quilometragem percorrida, calcule o consumo médio em km/l e analise seus gastos com combustível.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        className="bg-[#0B0D12] text-[#F1F5F9] font-sans antialiased selection:bg-[#2563EB]/30 selection:text-white min-h-screen"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
