export const metadata = { title: "Studio A6ko - Conditions d utilisation" };

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", lineHeight: 1.6 }}>
      <h1>Conditions d&apos;utilisation / Terms of Service</h1>
      <p><em>Derniere mise a jour : 2026-06-14 &middot; Studio A6ko</em></p>
      <p>
        <em>
          Studio A6ko est une solution d&apos;intelligence artificielle
          developpee par la societe A6ko, immatriculee sous le N&deg; IFU
          0202338422274 et enregistree sous le numero RB/ABC/24 A 111326.
        </em>
      </p>

      <h2>Francais</h2>
      <p>En utilisant Studio A6ko, vous acceptez les presentes conditions.</p>
      <ul>
        <li><strong>Credits :</strong> chaque generation consomme des credits. Les credits gratuits et achetes ne sont pas remboursables, sauf defaillance technique de notre part.</li>
        <li><strong>Contenu :</strong> vous devez disposer des droits sur les images que vous telechargez. Tout contenu illegal ou offensant est interdit.</li>
        <li><strong>Disponibilite :</strong> service fourni tel quel, sans garantie d&apos;interruption.</li>
        <li><strong>Paiements :</strong> traites par Moneroo ; les credits sont ajoutes apres confirmation du paiement.</li>
      </ul>

      <h2 style={{ marginTop: 32 }}>English</h2>
      <p>By using Studio A6ko, you agree to these terms.</p>
      <ul>
        <li><strong>Credits:</strong> each generation consumes credits. Free and purchased credits are non-refundable except in the event of a technical failure on our side.</li>
        <li><strong>Content:</strong> you must own the rights to any images you upload. Illegal or offensive content is prohibited.</li>
        <li><strong>Availability:</strong> service provided as-is, without guarantee of uninterrupted access.</li>
        <li><strong>Payments:</strong> processed by Moneroo; credits are added after payment confirmation.</li>
      </ul>

      <p style={{ marginTop: 32 }}>
        <a href="/">Back</a> &middot; <a href="/privacy">Privacy</a>
      </p>
    </main>
  );
}