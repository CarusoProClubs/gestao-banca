'use client';

import { useEffect } from 'react';
import styles from './page.module.css';

const TELEGRAM_URL = 'https://t.me/+Mp6mHMTZnOpiMjYx';

export default function AcessoPage() {
  useEffect(() => {
    document.title = 'Conteúdo Exclusivo';
  }, []);

  return (
    <main className={styles.landing}>
      <div className={`${styles.ambient} ${styles.ambientOne}`} />
      <div className={`${styles.ambient} ${styles.ambientTwo}`} />
      <section className={styles.card} aria-label="Conteúdo exclusivo">
        <div className={styles.badge}>18+ • CONTEÚDO EXCLUSIVO</div>
        <div className={styles.monogram} aria-hidden="true">✦</div>
        <p className={styles.eyebrow}>SÓ PARA QUEM SABE APRECIAR</p>
        <h1 className={styles.title}>
          Meus melhores ângulos…
          <span>só pra você.</span>
        </h1>
        <p className={styles.description}>
          Um cantinho reservado, íntimo e feito para despertar sua curiosidade.
          O que acontece lá dentro fica entre nós. 👀
        </p>
        <a className={styles.cta} href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
          <span>Acessar conteúdo exclusivo</span>
          <span className={styles.ctaEmoji} aria-hidden="true">🔥</span>
        </a>
        <p className={styles.privacy}>Clique no botão para continuar pelo Telegram</p>
      </section>
      <footer className={styles.footer}>© 2026 • Conteúdo para maiores de 18 anos</footer>
    </main>
  );
}
