// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { MeCab, Word } from 'mecab-client';
import { createClient } from 'redis';

type Item = {
  time: string;
  word: Word;
};
export type Data = {
  error?: {
    message: string;
  };
  data?: {
    result: Item[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method?.toLocaleLowerCase() !== 'post') {
    return res.status(405).json({
      error: {
        message: '405 Method Not Allowed'
      }
    });
  }

  const rawData: string = req.body['text'];
  const save: string = req.body['save'];
  const name: string = req.body['name'];
  /**
   * [
   *   {time: '2022-07-17T08:24:40.000Z', text: 'テキスト'},
   *   {time: '2022-07-17T08:24:40.000Z', text: 'テキスト2'},
   *   ...
   * ]
   */
  const parsedData = rawData.split('\n').map(line => {
    const l = line.split('\t');
    return {
      time: l[0],
      text: l[1]
    };
  });

  const result: Item[] = [];

  const mecab = new MeCab();
  // @ts-ignore
  mecab.command = 'mecab -d /usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd';
  
  await Promise.all(parsedData.map(async line => {
    const parsedLine = await mecab.parse(line.text);
    parsedLine.forEach(word => {
      result.push({
        time: line.time,
        word,
      });
    });
  }));

  if (save) {
    const client = createClient({
      url: 'redis://redis:6379'
    });
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();

    await client.hSet('results', name, JSON.stringify(result));
  }

  res.status(200).json({
    data: {
      result
    }
  });
}
