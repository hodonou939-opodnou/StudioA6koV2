export const metadata = { title: "Politique de confidentialite - Studio A6ko" };

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", lineHeight: 1.6 }}>
      <h1>Politique de confidentialite / Privacy Policy</h1>
      <p><em>Derniere mise a jour : 2026-06-14 &middot; Studio A6ko (studio.a6ko.com)</em></p>

      <h2>Francais</h2>

      <h3>A propos de Studio A6ko</h3>
      <p>
        Studio A6ko est une solution d&apos;intelligence artificielle developpee par la societe A6ko,
        immatriculee sous le N&deg; IFU 0202338422274 et enregistree sous le numero RB/ABC/24 A 111326.
        Studio A6ko fournit un studio photo de mode assiste par IA (photoshoot ultra-realiste,
        essayage virtuel, creation publicitaire).
      </p>

      <h3>Donnees que nous collectons</h3>
      <ul>
        <li><strong>Compte :</strong> nom, e-mail, photo de profil et identifiant fournis par votre connexion (Google, Facebook).</li>
        <li><strong>Contenu :</strong> images que vous telechargez (modele, vetement) et images generees.</li>
        <li><strong>Usage :</strong> credits, generations et journaux techniques necessaires au service.</li>
      </ul>

      <h3>Utilisation</h3>
      <p>
        Pour fournir le service (generation d&apos;images via Google Gemini et OpenAI), gerer vos credits,
        traiter les paiements (Moneroo) et ameliorer le produit.
      </p>

      <h3>Partage</h3>
      <p>
        Nous partageons le strict necessaire avec nos sous-traitants (fournisseurs d&apos;IA, prestataire de
        paiement Moneroo, hebergement Google Cloud). Nous ne vendons pas vos donnees.
      </p>

      <h3>Galerie communautaire (offre gratuite)</h3>
      <p>
        Les creations que vous telechargez dans le cadre de l&apos;offre gratuite peuvent etre
        mises en avant, de maniere anonyme (uniquement l&apos;image, le pays et la date, jamais
        votre nom ou e-mail), dans notre galerie publique a des fins de demonstration. Les comptes
        ayant effectue un achat ne sont jamais publies. Vous pouvez demander le retrait d&apos;une
        image a tout moment via le support.
      </p>

      <h3>Vos droits et suppression</h3>
      <p>
        Vous pouvez demander l&apos;acces ou la suppression de votre compte et de vos donnees via WhatsApp /
        support a tout moment.
      </p>

      <h2 style={{ marginTop: 32 }}>English</h2>

      <h3>About Studio A6ko</h3>
      <p>
        Studio A6ko is an artificial intelligence solution developed by A6ko, registered under IFU
        N&deg; 0202338422274 and company number RB/ABC/24 A 111326. Studio A6ko provides an AI-powered
        fashion photo studio (ultra-realistic photoshoots, virtual try-on, ad creation).
      </p>

      <h3>Data we collect</h3>
      <ul>
        <li><strong>Account:</strong> name, email, profile photo and identifier from your SSO login (Google, Facebook).</li>
        <li><strong>Content:</strong> images you upload (model, garment) and images generated for you.</li>
        <li><strong>Usage:</strong> credits, generations, and technical logs needed to run the service.</li>
      </ul>

      <h3>How we use it</h3>
      <p>
        To provide the service (image generation via Google Gemini and OpenAI), manage credits,
        process payments (Moneroo), and improve the product.
      </p>

      <h3>Sharing</h3>
      <p>
        We share only what is strictly necessary with our processors (AI providers, Moneroo payment
        processor, Google Cloud hosting). We do not sell your data.
      </p>

      <h3>Your rights and data deletion</h3>
      <p>You can request access or deletion of your account and data via WhatsApp / support at any time.</p>

      <h2 style={{ marginTop: 32 }}>Liens utiles / Useful links</h2>
      <ul>
        <li>
          <a href="https://a6ko.com/" target="_blank" rel="noopener noreferrer">
            Creer une boutique sur A6ko
          </a>
        </li>
        <li>
          <a href="https://eya.a6ko.com/" target="_blank" rel="noopener noreferrer">
            IA de prise de mesures a distance pour stylistes, tailleurs et couturiers
          </a>
        </li>
      </ul>

      <p style={{ marginTop: 32 }}><a href="/">Back</a> &middot; <a href="/terms">Conditions / Terms</a></p>
    </main>
  );
}