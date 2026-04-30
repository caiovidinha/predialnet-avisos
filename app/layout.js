import './globals.css'

export const metadata = {
  title: 'Painel de Alertas – Predialnet',
  description: 'Painel administrativo de alertas do aplicativo Predialnet',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#f5f5f5] text-gray-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
