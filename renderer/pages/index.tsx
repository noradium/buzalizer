import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";

const IndexPage = () => {
  const [twitterSearchOut, setTwitterSearchOut] = useState("");
  const [twitterQuery, setTwitterQuery] = useState("");
  const [twitterSince, setTwitterSince] = useState("2022-12-01");
  const [twitterUntil, setTwitterUntil] = useState("2022-12-01");
  const [analyerLaunchStatus, setAnalyzerLaunchStatus] = useState<
    "off" | "launching" | "launched"
  >("off");
  const [analyzerLog, setAnalyzerLog] = useState("");

  useEffect(() => {
    const handleMessage = (_event, args) => {
      if (args.type === "twitter_search") {
        setTwitterSearchOut(
          (out) =>
            (/\[K\n/.test(args.data.stream) ? "" : out) + args.data.stream
        );
        console.log(args.data.stream);
      } else if (args.type === "launch_analyzer") {
        setAnalyzerLog((log) => log + args.data.stream);
        if (/started server on/.test(args.data.stream)) {
          setAnalyzerLaunchStatus("launched");
        }
      }
    };

    // add a listener to 'message' channel
    global.ipcRenderer.addListener("message", handleMessage);

    return () => {
      global.ipcRenderer.removeListener("message", handleMessage);
    };
  }, []);

  const onSearchTwitterClick = () => {
    global.ipcRenderer.send("message", {
      type: "twitter_search",
      args: {
        query: twitterQuery,
        since: twitterSince,
        until: twitterUntil,
      },
    });
  };

  const onOpenDirectoryClick = () => {
    global.ipcRenderer.send("message", {
      type: "open_dir",
    });
  };

  const onLaunchAnalyzerClick = () => {
    setAnalyzerLaunchStatus("launching");
    global.ipcRenderer.send("message", {
      type: "launch_analyzer",
    });
  };

  return (
    <Layout title="Buzalizer">
      <h1>Buzalizer</h1>
      <h2>検索</h2>
      <div>
        <label htmlFor="twitter_query">検索文字列</label>
        <input
          id="twitter_query"
          value={twitterQuery}
          onChange={(e) => setTwitterQuery(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="twitter_since">開始日</label>
        <input
          id="twitter_since"
          placeholder="2022-12-01"
          value={twitterSince}
          onChange={(e) => setTwitterSince(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="twitter_until">終了日</label>
        <input
          id="twitter_until"
          placeholder="2022-12-12"
          value={twitterUntil}
          onChange={(e) => setTwitterUntil(e.target.value)}
        />
      </div>
      <div>
        <button onClick={onSearchTwitterClick}>Twitter を検索</button>
      </div>
      <pre>{twitterSearchOut}</pre>

      <h2>データ格納ディレクトリ</h2>
      <button onClick={onOpenDirectoryClick}>ディレクトリを開く</button>

      <h2>解析ツール起動</h2>
      <button onClick={onLaunchAnalyzerClick}>起動</button>
      <div>
        {analyerLaunchStatus === "launched"
          ? "起動済み"
          : analyerLaunchStatus === "launching"
          ? "起動中..."
          : ""}
      </div>
      <div>解析ツールURL: http://localhost:3000</div>
      <h3>解析ツールログ</h3>
      <pre>{analyzerLog}</pre>
    </Layout>
  );
};

export default IndexPage;
