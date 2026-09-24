import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata = {
  title: "ilcms",
  description: "ILCMS - Icelandic Legal Case Management System (Málastjórnunarkerfi) for case tracking, statutory deadlines, legal documents, and billing.",
  openGraph: {
    title: "ilcms",
    description: "ILCMS - Icelandic Legal Case Management System (Málastjórnunarkerfi) for case tracking, statutory deadlines, legal documents, and billing.",
  },
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
