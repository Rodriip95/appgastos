import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChartPie, Heart, PiggyBank, Wallet } from "lucide-react";
import { BingoDog, BingoMark, BingoWordmark } from "@/components/brand/Bingo";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { getSessionUser } from "@/lib/auth/session";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Iniciar sesión · Bingo" };

const FEATURES = [
  { icon: Wallet, title: "Cada gasto, en su lugar", text: "Registra lo que entra y lo que sale." },
  { icon: ChartPie, title: "Tus cuentas, más claras", text: "Descubre en qué se va tu plata." },
  { icon: PiggyBank, title: "De a poquito, a tus metas", text: "Haz espacio para eso que quieres." },
];

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.art} aria-label="Conoce a Bingo">
          <div className={styles.artTop}>
            <span className={styles.miniBrand}><BingoMark className="w-8" /> Tu nuevo compañero</span>
            <span className={styles.edition}>UN POQUITO CADA DÍA</span>
          </div>
          <div className={styles.scene}>
            <div className={styles.sun} aria-hidden="true" />
            <span className={styles.hello}>¡Hola, soy Bingo!</span>
            <svg className={styles.sparkles} viewBox="0 0 500 500" fill="none" aria-hidden="true">
              <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M402 92 L402 116 M390 104 L414 104 M65 330 L65 346 M57 338 L73 338 M433 365 L433 381 M425 373 L441 373" />
                <path d="M62 139 L48 130 M73 124 L69 109 M88 119 L93 105" />
              </g>
              <circle cx="365" cy="50" r="5" fill="currentColor" stroke="none" />
              <circle cx="103" cy="405" r="4" fill="currentColor" stroke="none" />
            </svg>
            <BingoDog className={styles.dog} />
            <span className={styles.note}><Heart size={15} aria-hidden="true" /> Un amigo para tus cuentas</span>
          </div>
          <div className={styles.artCaption}>
            <p>Grandes planes.<br /><span>Pequeños pasitos.</span></p>
            <span>Con un buen compañero, todo es más fácil.</span>
          </div>
        </section>
        <section className={styles.welcome} aria-labelledby="login-title">
          <div className={styles.welcomeInner}>
            <BingoWordmark size="lg" className={styles.wordmark} />
            <p className={styles.eyebrow}>TU PLATA. TUS PLANES. TU COMPAÑERO.</p>
            <h1 id="login-title">Cuidar tu billetera puede sentirse bien.</h1>
            <p className={styles.intro}>Menos vueltas con los números. Más espacio para lo que te hace feliz.</p>
            <ul className={styles.features}>
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <span className={styles.featureIcon}><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
                  <div><h2>{title}</h2><p>{text}</p></div>
                </li>
              ))}
            </ul>
            <div className={styles.signIn}>
              <GoogleSignInButton />
              <p>Tu primer pasito empieza acá.</p>
            </div>
          </div>
        </section>
      </div>
      <footer className={styles.footer}>Hecho para la vida real. Y para llegar a fin de mes.</footer>
      <Suspense><RedirectIfAuthenticated /></Suspense>
    </main>
  );
}

async function RedirectIfAuthenticated() {
  if (await getSessionUser()) redirect("/");
  return null;
}
