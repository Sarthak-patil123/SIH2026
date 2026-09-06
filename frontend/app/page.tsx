import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Fake Identity Document Screening System</h1>
      <p>Multi-layered AI verification with Hyperledger Fabric audit trails.</p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <Link href="/officer/dashboard">Officer Portal</Link>
        <Link href="/admin/dashboard">Admin Portal</Link>
      </div>
    </main>
  );
}
