import { Cluster } from "puppeteer-cluster";
import yargs from "yargs/yargs";
import fs from "fs";
import {
  eachDayOfInterval,
  parseISO,
  format,
  addDays,
  addHours,
} from "date-fns";

function outFilename(argv: { query: string; since: string; until: string }) {
  return `./data/${argv.query}_${argv.since}_${argv.until}.txt`;
}

(async () => {
  const argv = await yargs(process.argv.slice(2)).options({
    query: { type: "string", demand: "検索ワードを指定してください" },
    since: { type: "string", demand: "開始日を指定してください" },
    until: { type: "string", demand: "終了日を指定してください" },
    overwrite: { type: "boolean", default: false },
    debug: { type: "boolean", default: false },
    workers: { type: "number", default: 4 },
  }).argv;
  if (!argv.overwrite && fs.existsSync(outFilename(argv))) {
    console.log("すでに出力ファイルが存在するので終了します");
    return;
  }
  fs.writeFileSync(outFilename(argv), "");

  // console.log(argv);
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: argv.workers,
    timeout: 2147483647,
    monitor: true,
    puppeteerOptions: {
      headless: !argv.debug,
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      args: ["--no-sandbox"],
      devtools: argv.debug,
    },
  });

  cluster.on("taskerror", (err, data, willRetry) => {
    if (willRetry) {
      console.warn(
        `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`
      );
    } else {
      console.error(`Failed to crawl ${data}: ${err.message}`);
    }
  });

  await cluster.task(async ({ page, data: url }) => {
    page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36"
    );
    page.setDefaultTimeout(2147483647);

    // page.on('console', msg => {
    // console.log(...msg.args().map(a => a.toString()));
    // });

    // console.log('goto', url);
    // page.setRequestInterception(true);
    page.setExtraHTTPHeaders({
      "Accept-Language": "ja-JP,ja;q=0.9",
    });
    // page.on('request', async request => {
    //   if (request.url().indexOf('https://twitter.com/i/api/2/search/adaptive.json') === 0) {
    //     console.log(request.url());
    //     const res = await fetch(request.url().replace(/query_source=\w*&/, 'query_source=typed_query&'), {
    //       headers: request.headers()
    //     })
    //     console.log('fetch', res);
    //     const json = await res.json() as string;
    //     console.log('json', json);
    //     const headers: {[k: string]: string} = {};
    //     res.headers.forEach((v, k) => {
    //       headers[k] = v;
    //     });
    //     console.log('headers', headers);

    //     return await request.respond({
    //       status: res.status,
    //       headers: headers,
    //       body: json,
    //       contentType: 'application/json;charset=utf-8'
    //     });
    //   }
    //   request.continue();
    // });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForNetworkIdle();
    // console.log('NetworkIdle');

    const results = await page.evaluate(async () => {
      async function wait(ms: number): Promise<void> {
        return new Promise((resolve) => {
          setTimeout(() => resolve(), ms);
        });
      }
      async function getTweets(): Promise<{ time: string; text: string }[]> {
        const timeline = document.querySelector(
          '[aria-label="タイムライン: タイムラインを検索"] div'
        );
        if (!timeline) {
          await wait(1000);
          return await getTweets();
        }

        const tweets = document.querySelectorAll<HTMLElement>(
          '[aria-label="タイムライン: タイムラインを検索"] div [data-testid="tweet"]'
        );
        function parseTweet(tweet: HTMLElement) {
          const text = tweet.querySelector<HTMLElement>(
            '[data-testid="tweetText"]'
          );
          const time = tweet.querySelector<HTMLElement>("time");
          if (!text || !time) {
            return null;
          }
          return {
            text: text.innerText,
            time: time.getAttribute("datetime") as string,
          };
        }
        const results = Array.from(tweets)
          .map((t) => {
            return parseTweet(t);
          })
          .filter(Boolean) as { time: string; text: string }[];

        const observer = new MutationObserver(function (
          mutationsList,
          observer
        ) {
          for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
              if (mutation.addedNodes.length === 0) {
                break;
              }
              mutation.addedNodes.forEach((node) => {
                const r = parseTweet(node as HTMLElement);
                if (r) {
                  results.push(r);
                }
              });
              // console.log('added', mutation.addedNodes.length, 'total', results.length);
            }
          }
        });

        observer.observe(timeline, {
          attributes: false,
          childList: true,
          subtree: false,
        });

        return new Promise((resolve) => {
          let lastUpdatedTime = Date.now();
          let lastWindowScrollY = window.scrollY;
          const timer = setInterval(() => {
            window.scrollTo({ top: window.scrollY + 500 });
            if (lastWindowScrollY !== window.scrollY) {
              // console.log('scroll pos updated');
              lastUpdatedTime = Date.now();
              lastWindowScrollY = window.scrollY;
            } else {
              // console.log('noupdate', Date.now() - lastUpdatedTime);
              if (Date.now() - lastUpdatedTime > 15 * 1000) {
                clearInterval(timer);
                resolve(results);
              }
            }
          }, 100);
        });
      }
      return getTweets();
    });
    // console.log('page.evaluate', results);
    // allResults.concat(results);

    const output = results
      .map((r) => `${r.time}\t${r.text.replaceAll("\n", " ")}`)
      .join("\n");
    fs.appendFileSync(outFilename(argv), output);
    // console.log('saved.');
  });

  const days = eachDayOfInterval({
    start: parseISO(argv.since + "T00:00:00+09:00"),
    end: addDays(parseISO(argv.until + "T00:00:00+09:00"), 1),
  });
  // console.log('days', days);
  for (let i = 0; i < days.length - 1; ++i) {
    const since = days[i].toISOString().slice(0, 10); // format(days[i], 'yyyy-MM-dd HH:mm:ss xxx').slice(0, 10);
    const until = days[i + 1].toISOString().slice(0, 10); // format(days[i + 1], 'yyyy-MM-dd HH:mm:ss xxx').slice(0, 10);
    // console.log('queue', since, until);
    cluster.queue(
      `https://twitter.com/search?q=${encodeURIComponent(
        `${argv.query} lang:ja until:${until} since:${since}`
      )}&src=typed_query&f=live`
    );
  }

  await cluster.idle();

  await cluster.close();
})();
