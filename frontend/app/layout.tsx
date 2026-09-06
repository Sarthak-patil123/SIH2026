export const metadata = {
  title: "Fake Identity Document Screening",
  description: "AI + Blockchain Enabled Fraud Detection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
