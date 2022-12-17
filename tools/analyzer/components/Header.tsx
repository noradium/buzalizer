import Link from "next/link";
import styles from '../styles/components/Header.module.css';

export const Header = (props: {
}) => {
  return <header className={styles.header}>
    <div className={styles.root}>
      <Link href="/">
        <a>トップ</a>
      </Link>
    </div>
    <div className={styles.child}>
      <Link href="/history">
        <a>履歴</a>
      </Link>
    </div>
  </header>;
}
