import { useMemo, useState } from "react";
import { Data } from "../pages/api/calculate";
import ReactApexChart from "react-apexcharts";
import { FixedSizeList } from "react-window";

const excludeLexicals = ["接続詞", "感動詞", "助動詞", "助詞", "記号"];

function chunk<T extends any[]>(arr: T, size: number): T[] {
  return arr.reduce(
    (newarr, _, i) => (i % size ? newarr : [...newarr, arr.slice(i, i + size)]),
    [] as T[][]
  );
}

export const Result = (props: { data: Data["data"] }) => {
  const [span, setSpan] = useState<"day" | "hour" | "10min" | "min">("hour");
  const [chartCurrentIndex, setChartCurrentIndex] = useState(0);
  const formattedResult = useMemo(() => {
    if (!props.data) {
      return null;
    }
    const countResult = props.data.result.reduce<{ [w: string]: number }>(
      (prev, item) => {
        if (excludeLexicals.includes(item.word.lexical)) {
          return prev;
        }
        if (!prev[item.word.surface]) {
          prev[item.word.surface] = 0;
        }
        prev[item.word.surface]++;
        return prev;
      },
      {}
    );
    return Object.keys(countResult)
      .map((w) => ({ word: w, count: countResult[w] }))
      .sort((a, b) => b.count - a.count)
      .filter((d) => d.count > 5);
  }, [props.data]);

  const chartData = useMemo(() => {
    if (!props.data || !formattedResult) {
      return null;
    }

    const countResult = props.data.result.reduce<{
      [date: string]: { [w: string]: number };
    }>((prev, item) => {
      if (excludeLexicals.includes(item.word.lexical)) {
        return prev;
      }
      const date = item.time.slice(
        0,
        span === "hour"
          ? 13
          : span === "min"
          ? 16
          : span === "day"
          ? 10
          : span === "10min"
          ? 15
          : undefined
      );
      if (!prev[date]) {
        prev[date] = {};
      }
      if (!prev[date][item.word.surface]) {
        prev[date][item.word.surface] = 0;
      }
      prev[date][item.word.surface]++;
      return prev;
    }, {});
    console.log(countResult);

    const xAxis = Object.keys(countResult).sort((a, b) =>
      b > a ? -1 : a > b ? 1 : 0
    );
    const yAxis = formattedResult
      .sort((a, b) => b.count - a.count)
      .map((item) => item.word);
    const data = yAxis.reduce<{ [word: string]: number[] }>((prev, w) => {
      prev[w] = [];
      return prev;
    }, {});
    xAxis.forEach((x) => {
      yAxis.forEach((y) => {
        const num = countResult[x][y] || 0;
        data[y].push(num);
      });
    });
    return {
      xAxis: xAxis,
      series: chunk(
        yAxis.map((w) => {
          return {
            name: w,
            data: data[w],
          };
        }),
        50
      ),
    };
  }, [props.data, formattedResult, span]);
  console.log(chartData);

  return (
    formattedResult && (
      <section>
        <FixedSizeList
          height={600}
          itemCount={formattedResult.length}
          itemSize={40}
          layout="vertical"
          width="50%"
        >
          {({ index, style }) => (
            <div
              style={{
                ...style,
                backgroundColor: index % 2 === 0 ? "#eee" : undefined,
              }}
            >
              {formattedResult[index].count} {formattedResult[index].word}
            </div>
          )}
        </FixedSizeList>
        <div>
          <select
            name="span"
            id="span-select"
            value={span}
            onChange={(event) => setSpan(event.target.value as any)}
          >
            <option value="day">1日</option>
            <option value="hour">1時間</option>
            <option value="10min">10分</option>
            <option value="min">1分</option>
          </select>
        </div>
        <div
          style={{
            display: "flex",
            height: "50px",
            fontSize: "32px",
            margin: "12px",
          }}
        >
          <button
            onClick={() => {
              if (chartData) {
                setChartCurrentIndex((i) => (0 < i ? i - 1 : 0));
              }
            }}
            style={{ flex: "1" }}
          >
            ←
          </button>
          <span style={{ flex: "3", textAlign: "center" }}>
            {`単語分布 ${chartCurrentIndex + 1}/${
              chartData && chartData.series.length
            }`}
          </span>
          <button
            onClick={() => {
              if (chartData) {
                setChartCurrentIndex((i) =>
                  i >= chartData.series.length - 1
                    ? chartData.series.length - 1
                    : i + 1
                );
              }
            }}
            style={{ flex: "1" }}
          >
            →
          </button>
        </div>
        {chartData && (
          <ReactApexChart
            key={chartCurrentIndex}
            type="heatmap"
            options={{
              chart: {
                type: "heatmap",
                id: `headmap${chartCurrentIndex}`,
                group: `group${chartCurrentIndex}`,
                height: chartData.series[chartCurrentIndex].length * 20,
              },
              dataLabels: {
                enabled: false,
              },
              colors: ["#008FFB"],
              xaxis: {
                type: "category",
                categories: chartData.xAxis,
              },
              yaxis: {
                reversed: true,
              },
            }}
            series={chartData.series[chartCurrentIndex]}
            height={chartData.series[chartCurrentIndex].length * 20}
          />
        )}
      </section>
    )
  );
};

export default Result;
