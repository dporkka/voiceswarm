import type { Metadata } from "next";
import "./globals.css";
import { ApiProvider } from "@/lib/api/client";
import { MainLayout } from "@/components/layout/MainLayout";

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
const appName = "AASOP";
const seoTitle = "AASOP | Autonomous agent orchestration for software teams";
const seoDescription =
  "AASOP is an AI agent orchestration platform for autonomous software development, workflow automation, voice-enabled operations, realtime observability, and intelligent task management.";
const seoKeywords = [
  "AI agent orchestration",
  "autonomous software development",
  "multi-agent workflows",
  "developer platform",
  "workflow automation",
  "voice-enabled operations",
  "realtime observability",
  "task orchestration",
  "engineering automation",
  "Next.js AI dashboard",
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: appName,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: siteUrl.toString(),
  description: seoDescription,
  keywords: seoKeywords.join(", "),
  featureList: [
    "Agent fleet management",
    "Workflow and task orchestration",
    "Realtime observability dashboards",
    "Persistent memory and context management",
    "Voice-enabled developer operations",
  ],
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: seoTitle,
    template: "%s | AASOP",
  },
  description: seoDescription,
  applicationName: appName,
  referrer: "origin-when-cross-origin",
  keywords: seoKeywords,
  authors: [{ name: appName }],
  creator: appName,
  publisher: appName,
  alternates: {
    canonical: "/",
  },
  category: "developer tools",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: seoTitle,
    siteName: appName,
    description: seoDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: seoDescription,
    creator: "@aasop",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ApiProvider>
          <MainLayout>{children}</MainLayout>
        </ApiProvider>
      </body>
    </html>
  );
}
