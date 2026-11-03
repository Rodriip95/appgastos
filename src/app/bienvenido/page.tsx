import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing, Calculator, Check, ClipboardList, CreditCard, FileScan, Handshake, Package, PawPrint,
  PiggyBank, ShieldCheck, Smartphone, Sparkles, Tags, Truck, UsersRound, Wallet,
} from "lucide-react";
import { BingoDog, BingoMark, BingoWordmark } from "@/components/brand/Bingo";
import { BoneIcon, LongBingo } from "./LongBingo";
import { Motion } from "./motion";
import s from "./welcome.module.css";

const TITLE = "Bingo · App de gastos, tarjetas, ahorro y emprendimientos";
const DESCRIPTION = "Anotá ingresos y gastos, seguí tus tarjetas y cuotas, ahorrá para tus metas, dividí cuentas con amigos y ordená tu emprendimiento. En pesos y en dólares, con Bingo, tu compañero salchicha.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["app de gastos", "control de gastos", "finanzas personales", "cuotas tarjeta de crédito", "gastos compartidos", "ahorro", "emprendedores", "pesos y dólares"],
  alternates: { canonical: "/bienvenido" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/bienvenido", siteName: "Bingo", locale: "es_AR", type: "website", images: ["/brand/bingo.svg"] },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const vars = (v: Record<string, string | number>) => v as CSSProperties;

const HEADLINE = ["Tu", "plata,", "cuidada", "por", "un", "salchicha."];

const RIBBON = ["Menos enredos", "Cuotas bajo control", "Dólares sin drama", "Metas de a pasitos", "Cuentas claras con amigos", "Tu negocio, ordenado"];

const TOUR = [
  {
    stop: "Gastos", icon: Wallet, title: "Cada peso, en su lugar.",
    text: "Anotá lo que entra y lo que sale en segundos. Las categorías las armás vos, con subcategorías como Carro › Seguro, y el resumen del mes te dice en qué se fue.",
    points: ["Gastos fijos que se sugieren solos", "Presupuestos con tope por categoría", "Vista por mes, por período o general"],
  },
  {
    stop: "Tarjetas", icon: CreditCard, title: "Las cuotas, sin sustos.",
    text: "Cargá tus tarjetas con su cierre y su vencimiento. Cada compra en cuotas cae en el resumen que corresponde y siempre sabés cuánto viene el mes que sigue.",
    points: ["Subís el PDF del resumen y Bingo lo lee", "Marcás el resumen como pagado", "Alias para cada consumo"],
  },
  {
    stop: "Dólares", icon: Sparkles, title: "Pesos y dólares, sin drama.",
    text: "Los dólares se guardan en dólares. Bingo anota la cotización del día y te muestra el total en pesos con la referencia que elijas.",
    points: ["Dólar oficial, MEP o blue", "Consumos en USD al dólar tarjeta", "Metas en la moneda que quieras"],
  },
  {
    stop: "Metas", icon: PiggyBank, title: "Ahorrar de a pasitos.",
    text: "Poné nombre a eso que querés, una fecha y un monto. Bingo te dice cuánto apartar por mes y celebra cada aporte con vos.",
    points: ["Aportes y retiros", "Cuánto apartar para llegar a tiempo", "Lo apartado no cuenta como gasto"],
  },
  {
    stop: "Compartidos", icon: Handshake, title: "Las cuentas claras con tu gente.",
    text: "Armá un espacio para la casa, un viaje o un regalo. Cada uno carga lo que pagó y el saldo se acomoda solo. También pueden ahorrar juntos para una meta.",
    points: ["Solo con contactos que aceptaste", "Gastos y objetivos compartidos", "Tu parte suma a tu resumen"],
  },
];

const ALERTS = [
  { tone: "alert", text: "Ruff, ruff: la tarjeta vence mañana ($ 312.400). Dejá la plata lista y evitá recargos." },
  { tone: "", text: "Husmeé tu presupuesto de Salidas: ya va el 85%. Te quedan $ 15.000 para lo que falta del mes." },
  { tone: "", text: "Un fijo sin anotar: el alquiler. Es de los que se repiten, ¡no lo dejes para después!" },
  { tone: "happy", text: "¡Estás a un pasito de “Vacaciones”! Te faltan solo $ 40.000. ¡Guau, qué orgullo!" },
  { tone: "", text: "Olfateé una entrega: el sábado entregás el pedido de Sofi. Y te queda poca harina." },
];

const ORDER_STEPS = [
  { title: "Anotás el pedido.", text: "Cliente, detalle, precio, fecha de entrega y los materiales que lleva. El cliente queda guardado para la próxima." },
  { title: "Lo ponés en marcha.", text: "Lo ves en En proceso, con su prioridad. Bingo te avisa cuando se acerca la entrega, también al celular." },
  { title: "Lo entregás y listo.", text: "El stock baja solo, el cobro suma a tu ganancia y ves el margen real de ese pedido." },
];

const BUSINESS = [
  { icon: ClipboardList, title: "Pedidos y entregas", text: "Tomado, en proceso, entregado. Con fecha, prioridad y cobros parciales." },
  { icon: UsersRound, title: "Clientes que se guardan solos", text: "Con su teléfono y todos sus pedidos. Ves quiénes son tus mejores clientes." },
  { icon: Package, title: "Stock con aviso", text: "Cada compra suma stock y fija el precio. Si algo baja del mínimo, Bingo te avisa." },
  { icon: Calculator, title: "Precio sugerido", text: "Elegís tu margen objetivo y Bingo te propone cuánto cobrar según los materiales." },
  { icon: Truck, title: "Gastos del negocio", text: "Envíos, packaging, herramientas, marketing y servicios, con su proveedor." },
  { icon: Wallet, title: "Todo en tu resumen", text: "La ganancia del negocio aparece en tu balance personal, sin cargar nada dos veces." },
];

const STEPS = [
  { title: "Entrás con Google", text: "Sin formularios ni contraseñas nuevas. Un toque y estás adentro." },
  { title: "Armás tus categorías", text: "Las tuyas o las sugeridas para arrancar rápido. Las cambiás cuando quieras." },
  { title: "Anotás tu primer gasto", text: "Y Bingo empieza a olfatear tus números para darte una mano." },
];

const FAQ = [
  ["¿Cómo empiezo a usar Bingo?", "Entrá con tu cuenta de Google, elegí las categorías sugeridas o armá las tuyas y anotá tu primer ingreso o gasto. Tarjetas, metas, espacios compartidos y Mi negocio los sumás cuando los necesites."],
  ["¿Puedo cargar el resumen de mi tarjeta?", "Sí. Subís el PDF o una foto del resumen y Bingo lee los consumos y las cuotas, te sugiere una categoría para cada uno y vos revisás todo antes de guardar. Hay un cupo de resúmenes por mes."],
  ["¿Bingo se conecta con mi banco?", "No. No te pedimos claves ni acceso a tu banco: los movimientos los anotás vos o los importás desde el resumen de la tarjeta."],
  ["¿Puedo usar pesos y dólares?", "Sí. Cada movimiento, meta o espacio compartido puede estar en pesos o en dólares. Los dólares se guardan como dólares y ves su equivalente en pesos con el dólar oficial, MEP o blue."],
  ["¿Sirve para dividir gastos con amigos o en pareja?", "Sí. Creás un espacio de gastos compartidos, invitás a tus contactos y cada uno carga lo que pagó. El saldo de cada persona se calcula solo. También pueden ahorrar juntos con un objetivo compartido."],
  ["¿Me sirve si tengo un emprendimiento?", "Sí. Mi negocio te ordena pedidos, clientes, stock de materiales, gastos y cobros. Te muestra la ganancia, el margen de cada pedido y un precio sugerido según el margen que buscás."],
  ["¿Se puede instalar en el celular?", "Sí. Bingo se instala desde el navegador en la pantalla de inicio, se abre como una app y te manda avisos de vencimientos, entregas y movimientos compartidos."],
  ["¿Quién ve mis datos?", "Solo vos. Tus datos quedan asociados a tu cuenta y nadie más puede leerlos. Lo que cargás en un espacio compartido lo ven únicamente las personas de ese espacio."],
] as const;

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Bingo",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, Android, iOS",
    inLanguage: "es-AR",
    description: DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
];

export default function WelcomePage() {
  return (
    <div className={s.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
      <a className={s.skip} href="#contenido">Saltar al contenido</a>

      <Motion track="page" className={s.progress}>
        <span className={s.progressBar} />
        <BingoMark className={s.progressDog} />
      </Motion>

      <header className={s.header}>
        <Link href="/bienvenido" aria-label="Bingo, inicio"><BingoWordmark size="sm" /></Link>
        <nav aria-label="Secciones">
          <a href="#recorrido">Qué hace</a>
          <a href="#avisos">Avisos</a>
          <a href="#negocio">Emprendedores</a>
          <a href="#preguntas">Preguntas</a>
          <Link href="/login" className={s.navCta}>Entrar</Link>
        </nav>
      </header>

      <main id="contenido">
        {/* Hero: capas con paralaje de scroll y de puntero */}
        <Motion as="section" className={s.hero} pointer>
          <div className={s.heroCopy}>
            <p className={s.kicker}><PawPrint size={16} aria-hidden="true" /> La app de gastos con perro incluido</p>
            <h1 className={s.headline}>
              {HEADLINE.map((w, i) => <span key={i} style={vars({ "--i": i })}>{w} </span>)}
            </h1>
            <p className={s.lead}>Anotá tus gastos, seguí tus tarjetas y cuotas, ahorrá para tus metas, dividí cuentas con tu gente y ordená tu emprendimiento. En pesos y en dólares, con Bingo cuidándote la billetera.</p>
            <div className={s.ctas}>
              <Link className={s.cta} href="/login"><GoogleG /> Empezar con Google</Link>
              <a className={s.ghost} href="#recorrido">Ver qué hace</a>
            </div>
            <ul className={s.trust}>
              <li><ShieldCheck size={16} aria-hidden="true" /> Tus datos son solo tuyos</li>
              <li><Smartphone size={16} aria-hidden="true" /> Se instala en tu celu</li>
            </ul>
          </div>

          <div className={s.heroArt} aria-hidden="true">
            <div className={`${s.layer} ${s.sun}`} style={vars({ "--d": 0.3 })} />
            <div className={`${s.layer} ${s.ring}`} style={vars({ "--d": 0.5 })} />
            <BoneIcon className={`${s.layer} ${s.boneA}`} />
            <BoneIcon className={`${s.layer} ${s.boneB}`} />
            <span className={`${s.layer} ${s.coin} ${s.coinA}`}>$</span>
            <span className={`${s.layer} ${s.coin} ${s.coinB}`}>US$</span>
            <span className={`${s.layer} ${s.coin} ${s.coinC}`}>$</span>
            <div className={`${s.layer} ${s.dogLayer}`} style={vars({ "--d": 0.8 })}>
              <BingoDog variant="wallet" className={s.heroDog} />
            </div>
            <div className={`${s.layer} ${s.chip} ${s.chipA}`} style={vars({ "--d": 1.6 })}>
              <BingoMark className={s.chipAvatar} />
              <p><b>¡Guau!</b> Este mes te sobran $ 85.000.</p>
            </div>
            <div className={`${s.layer} ${s.chip} ${s.chipB}`} style={vars({ "--d": 2.2 })}>
              <CreditCard size={18} />
              <p>La tarjeta vence en 2 días<b>$ 312.400</b></p>
            </div>
            <div className={`${s.layer} ${s.chip} ${s.chipC}`} style={vars({ "--d": 1.2 })}>
              <PiggyBank size={18} />
              <p>Vacaciones<b>60% de tu meta</b><span className={s.miniTrack}><span /></span></p>
            </div>
          </div>
        </Motion>

        <div className={s.ribbons} aria-hidden="true">
          <Ribbon className={s.ribbonA} />
          <Ribbon className={s.ribbonB} reverse />
        </div>

        {/* El recorrido: Bingo se estira con el scroll y pasa por cada función */}
        <Motion as="section" id="recorrido" track="stage" steps={TOUR.length} className={s.tour}>
          <div className={s.tourSticky}>
            <div className={s.tourHead}>
              <h2>Un perro largo para todas tus cuentas.</h2>
              <p>Bajá despacio y mirá cómo se estira.</p>
            </div>
            <div className={s.panels}>
              {TOUR.map(({ title, text, points, icon: Icon }, i) => (
                <article key={title} className={s.panel}>
                  <div className={s.panelCopy}>
                    <span className={s.panelIcon}><Icon size={22} aria-hidden="true" /></span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <ul>{points.map((p) => <li key={p}><Check size={16} aria-hidden="true" />{p}</li>)}</ul>
                  </div>
                  <div className={s.mock} aria-hidden="true"><TourMock i={i} /></div>
                </article>
              ))}
            </div>
            <div className={s.trail}>
              <LongBingo />
              <ol className={s.stops}>
                {TOUR.map(({ stop }, i) => (
                  <li key={stop} className={s.stop} style={vars({ "--i": i })}><BoneIcon className={s.stopBone} /><span>{stop}</span></li>
                ))}
              </ol>
            </div>
          </div>
        </Motion>

        {/* Avisos de Bingo */}
        <Motion as="section" id="avisos" className={s.alerts}>
          <div className={s.alertsArt} aria-hidden="true">
            <div className={s.alertsSun} />
            <BingoDog className={s.alertsDog} />
            <span className={s.bark}>¡Guau!</span>
          </div>
          <div className={s.alertsCopy}>
            <h2>Bingo ladra antes de que duela.</h2>
            <p className={s.sectionLead}>Mira tus números todos los días y te avisa lo importante: vencimientos, presupuestos que se pasan, gastos fijos que faltan anotar y metas que están cerca.</p>
            <ul className={s.bubbles}>
              {ALERTS.map(({ text, tone }, i) => (
                <li key={text} className={s.bubble} data-tone={tone || undefined} style={vars({ "--i": i })}>
                  <BingoMark className={s.bubbleAvatar} />
                  <p>{text}</p>
                </li>
              ))}
            </ul>
            <p className={s.pushNote}><BellRing size={16} aria-hidden="true" /> Si instalás la app, los avisos te llegan como notificación.</p>
          </div>
        </Motion>

        {/* Mi negocio */}
        <section id="negocio" className={s.business}>
          <div className={s.businessIntro}>
            <p className={s.kickerDark}><Sparkles size={16} aria-hidden="true" /> Para emprendedores</p>
            <h2>¿Tenés un emprendimiento? Bingo también hace de socio.</h2>
            <p className={s.sectionLead}>Tortas, ropa, velas, cerámica o lo que hagas: con Mi negocio llevás pedidos, clientes, stock y gastos en el mismo lugar donde manejás tu plata. Y por fin sabés cuánto ganás de verdad.</p>
          </div>

          <Motion track="stage" steps={ORDER_STEPS.length} className={s.orderStage}>
            <div className={s.orderSticky}>
              <ol className={s.orderSteps}>
                {ORDER_STEPS.map(({ title, text }, i) => (
                  <li key={title} className={s.orderStep}><span>{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>
                ))}
              </ol>
              <div className={s.board} aria-hidden="true">
                <BingoMark className={s.boardDog} />
                <div className={s.columns}>
                  {["Tomado", "En proceso", "Entregado"].map((c) => <div key={c} className={s.column}><h4>{c}</h4></div>)}
                  <div className={`${s.ticket} ${s.ticketStatic}`} style={vars({ "--c": 0, "--r": 1 })}><b>Velas x12</b><span>Caro · $ 36.000</span></div>
                  <div className={`${s.ticket} ${s.ticketStatic}`} style={vars({ "--c": 1, "--r": 1 })}><b>Box desayuno</b><span>Martín · $ 28.000</span></div>
                  <div className={`${s.ticket} ${s.ticketStatic}`} style={vars({ "--c": 2, "--r": 1 })}><b>Cookies x24</b><span>Lu · $ 19.000</span></div>
                  <div className={`${s.ticket} ${s.ticketMoving}`}><b>Torta de cumple</b><span>Sofi · $ 45.000</span><small>Entrega sáb 14</small></div>
                </div>
                <div className={s.metrics}>
                  <div><span>Ganancia del mes</span><b className={s.swap}><i>$ 300.400</i><i>$ 300.400</i><i>$ 345.400</i></b></div>
                  <div><span>Margen del pedido</span><b>42%</b></div>
                  <div className={s.stock}><span>Harina 0000</span><span className={s.stockTrack}><span /></span><small className={s.swap}><i>6 kg</i><i>6 kg</i><i>2 kg · ¡queda poco!</i></small></div>
                </div>
              </div>
            </div>
          </Motion>

          <ul className={s.businessList}>
            {BUSINESS.map(({ icon: Icon, title, text }) => (
              <li key={title}><Icon size={24} strokeWidth={1.7} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></li>
            ))}
          </ul>
          <Link className={s.ctaLight} href="/login"><Package size={18} aria-hidden="true" /> Ordenar mi negocio</Link>
        </section>

        {/* Primeros pasos con huellitas */}
        <Motion as="section" id="empezar" className={s.steps}>
          <h2>Arrancar lleva tres pasitos.</h2>
          <ol className={s.stepList}>
            {STEPS.map(({ title, text }, i) => (
              <li key={title} style={vars({ "--i": i })}>
                <span className={s.stepNumber}>{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className={s.paws} aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => <PawPrint key={i} size={28}style={vars({ "--i": i })} />)}
          </div>
        </Motion>

        <section id="preguntas" className={s.faq}>
          <h2>Lo que todos preguntan.</h2>
          <div>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<span aria-hidden="true" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <Motion as="section" className={s.final}>
          <h2>Grandes planes. Pequeños pasitos.</h2>
          <p>Tu billetera va a estar en buenas patas.</p>
          <Link href="/login" className={s.cta}><GoogleG /> Empezar con Google</Link>
          <div className={s.peek} aria-hidden="true"><BingoMark className={s.peekHead} /></div>
        </Motion>
      </main>

      <footer className={s.footer}>
        <BingoWordmark size="sm" />
        <span>Hecho con cariño (y algunos ladridos) en Argentina.</span>
        <nav aria-label="Pie de página">
          <a href="#contenido">Volver arriba</a>
          <Link href="/login">Entrar a la app</Link>
        </nav>
      </footer>
    </div>
  );
}

function Ribbon({ className, reverse }: { className: string; reverse?: boolean }) {
  const items = reverse ? [...RIBBON].reverse() : RIBBON;
  return (
    <div className={`${s.ribbon} ${className}`}>
      {[0, 1].map((copy) => (
        <div key={copy} className={s.ribbonTrack}>
          {items.map((t) => <span key={t}>{t}<PawPrint size={18} /></span>)}
        </div>
      ))}
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className={s.googleG}>
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6a5.1 5.1 0 0 1-2.2 3.3v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.2-1.4.4-2V7.1H2A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 4.9L5.7 14Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

/** Pantallas de ejemplo de cada parada del recorrido (importes ilustrativos). */
function TourMock({ i }: { i: number }) {
  if (i === 0) {
    return (
      <div className={s.screen}>
        <div className={s.screenHead}><b>¿En qué se fue?</b><span>Noviembre</span></div>
        <div className={s.donutRow}>
          <div className={s.donut}><span>$ 580.000<small>gastado</small></span></div>
          <ul className={s.legend}>
            <li style={vars({ "--c": "#9c3b22" })}>Casa <b>34%</b></li>
            <li style={vars({ "--c": "#f28c28" })}>Súper <b>26%</b></li>
            <li style={vars({ "--c": "#c9673d" })}>Carro › Seguro <b>18%</b></li>
            <li style={vars({ "--c": "#f6b26b" })}>Salidas <b>22%</b></li>
          </ul>
        </div>
        <div className={s.budgetLine}><span>Súper</span><span className={s.bar}><span style={vars({ "--w": "76%" })} /></span><small>$ 152.000 de $ 200.000</small></div>
        <div className={s.rows}>
          <p><span>🛒 Súper del finde</span><b className={s.minus}>−$ 28.500</b></p>
          <p><span>💼 Sueldo</span><b className={s.plus}>+$ 1.000.000</b></p>
        </div>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className={s.screen}>
        <div className={s.card}><span>La de todos los días</span><b>$ 312.400 + US$ 45</b><small>Cierra el 24 · Vence el 3</small></div>
        <div className={s.importTag}><FileScan size={16} /> Resumen importado: 14 consumos</div>
        <div className={s.rows}>
          <p><span>Zapatillas running <em>3/6</em></span><b>$ 28.300</b></p>
          <p><span>Heladera <em>7/12</em></span><b>$ 61.000</b></p>
          <p><span>Streaming</span><b>US$ 9,99</b></p>
        </div>
        <div className={s.paid}><Check size={16} /> Marcar como pagado</div>
      </div>
    );
  }
  if (i === 2) {
    return (
      <div className={s.screen}>
        <div className={s.usd}><span>En dólares</span><b>US$ 350</b><small>Todo en pesos ≈ $ 1.062.000</small></div>
        <div className={s.toggle}><span>Oficial</span><span data-on="">MEP</span><span>Blue</span></div>
        <div className={s.rows}>
          <p><span>Pasaje a Mendoza</span><b>US$ 120</b></p>
          <p><span>Curso online</span><b>US$ 45</b></p>
          <p><span>Alquiler</span><b>$ 420.000</b></p>
        </div>
        <small className={s.screenNote}>Cotización guardada el día de cada movimiento</small>
      </div>
    );
  }
  if (i === 3) {
    return (
      <div className={s.screen}>
        <div className={s.goal}>
          <div className={s.goalRing} style={vars({ "--v": 60 })}><span>60%</span></div>
          <div><b>Vacaciones en el sur</b><span>$ 600.000 de $ 1.000.000</span><small>Apartá $ 80.000 por mes para llegar en mayo</small></div>
        </div>
        <div className={s.goal}>
          <div className={s.goalRing} style={vars({ "--v": 35 })}><span>35%</span></div>
          <div><b>Fondo de emergencia</b><span>US$ 700 de US$ 2.000</span></div>
        </div>
        <div className={s.apartaste}><PiggyBank size={16} /> Apartaste $ 80.000 · Libre $ 340.000</div>
      </div>
    );
  }
  return (
    <div className={s.screen}>
      <div className={s.screenHead}><b>🏠 Depto con Juli</b><span className={s.avatars}><i>J</i><i>V</i></span></div>
      <div className={s.balanceLine}>
        <span>Vos<b>$ 80.000</b></span>
        <span className={s.balanceTrack}><span /></span>
        <span>Juli<b>$ 180.000</b></span>
      </div>
      <div className={s.rows}>
        <p><span>Expensas · Juli</span><b>$ 180.000</b></p>
        <p><span>Súper · Vos</span><b>$ 62.000</b></p>
        <p><span>Internet · Vos</span><b>$ 18.000</b></p>
      </div>
      <div className={s.importTag}><Tags size={16} /> Tu parte suma a tu resumen del mes</div>
    </div>
  );
}
