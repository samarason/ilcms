import "./globals.css";
import { AuthProvider } from "../lib/auth";

export const metadata = {
  title: "ILCMS Málastjórnunarkerfi",
  description: "Icelandic Legal Case Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="is" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
