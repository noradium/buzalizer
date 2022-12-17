import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from 'react'
import { Header } from '../components/Header'
import dynamic from "next/dynamic";
import styles from '../styles/Home.module.css'
import { Data } from './api/calculate'
const Result = dynamic(() => import("../components/Result"), { ssr: false });

const Home: NextPage = () => {
  const [text, setText] = useState('');
  const [save, setSave] = useState(false);
  const [name, setName] = useState('');
  const [result, setResult] = useState<Data | null>(null);

  const onTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  }, []);

  const onSaveChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSave(event.target.checked);
  }, []);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  }, []);

  const onSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();
    window.fetch('/api/calculate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'      
      },
      body: JSON.stringify({
        save,
        name,
        text
      })
    })
      .then(res => {
        return res.json();
      })
      .then(json => {
        console.log('response', json);
        setResult(json);
      })
      .catch(error => {
        setResult({
          error: {
            message: error.message
          }
        })
      });
  }, [text, save, name]);

  return (
    <div className={styles.container}>
      <Head>
        <title>twitfreq</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header/>
      <main className={styles.main}>
        <h3 className={styles.title}>
          流行チェッカー
        </h3>

        <form onSubmit={onSubmit}>
          <label>
            <h4>
              サーバーに結果を保存する
              <input type="checkbox" checked={save} onChange={onSaveChange} />
            </h4>
          </label>
          {save && <label>
            <h4>
              保存名
            </h4>
            <input type="text" value={name} onChange={onNameChange} />
          </label>}
          <label>
            <h4>
              Text ("2022-07-17T15:20:25.000Z Netflixでストレンジャーシングスみた" のようなテキストを1行ずつ並べたもの)
            </h4>
            <textarea className={styles.textarea} rows={20} value={text} onChange={onTextChange} />
          </label>
          <input className={styles.submitButton} type="submit" value="Submit" />
        </form>

        <Result data={result?.data} />
      </main>
    </div>
  )
}

export default Home
